// Command enquiry accepts the site's contact form and sends it on through
// Resend.
//
// # WHY THIS EXISTS
//
// The site is a static export served by nginx, so nothing in it can hold a
// credential: anything the browser can read is published. Resend is already
// the platform's email provider — prod-resend-api-key is a shared secret and
// tesserix-blog consumes it the same way — but reaching it needs a process,
// and this is the smallest one that will do.
//
// It runs as a sidecar next to nginx in the same pod, listening on loopback
// only. nginx proxies /api/enquiry to it, so the browser talks to the site's
// own origin: no CORS, no public service, and the key never leaves the pod.
//
// # WHY NOT nginx ALONE
//
// nginx can inject an Authorization header, but it cannot build Resend's
// payload from the form post. Forwarding the body verbatim would let a caller
// set "to" — an open relay on a shared platform key.
//
// THE RECIPIENT IS NOT AN INPUT. It comes from ENQUIRY_TO and nothing in the
// request can change it, which is the property that keeps the above true.
//
// ENQUIRY_TO takes a comma-separated list, and deliberately so: the live site
// publishes two addresses (info@beautyandcruor.com and info@beautycruor.com)
// and nobody yet knows which one works — open question 5. Until that is
// settled both are listed, so an enquiry cannot be lost to the wrong guess.
// Narrow it to one once the answer is in.
package main

import (
	"bufio"
	"bytes"
	"crypto/rand"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html"
	"log"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

const (
	maxBody       = 16 << 10 // 16KB: the form's own fields cannot approach this
	maxName       = 120
	maxEmail      = 254 // RFC 5321
	maxEnquiry    = 80
	maxDetails    = 4000
	minFillTime   = 3 * time.Second // nobody reads and completes it faster
	maxFormAge    = 6 * time.Hour   // a stale page is a replayed one
	maxLinks      = 2               // a genuine enquiry rarely carries more
	resendTimeout = 10 * time.Second
)

type submission struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Enquiry string `json:"enquiry"`
	Details string `json:"details"`
	Company string `json:"company"` // honeypot
	Started string `json:"started"` // ms since epoch, stamped when the form mounted
}

var linkRe = regexp.MustCompile(`(?i)\b(?:https?://|www\.)\S+`)

func main() {
	// `enquiry -hash` derives the verifier that goes in Secret Manager, so the
	// password itself is typed once, here, and never stored or transmitted.
	// It is in this binary rather than a script because the parameters have to
	// match the ones that check it, and two implementations drift.
	hashMode := flag.Bool("hash", false, "read a password on stdin and print its ADMIN_PASSWORD_HASH")
	flag.Parse()
	if *hashMode {
		printPasswordHash()
		return
	}

	apiKey := mustEnv("RESEND_API_KEY")
	to := splitList(mustEnv("ENQUIRY_TO"))
	if len(to) == 0 {
		log.Fatal("enquiry: ENQUIRY_TO listed no addresses")
	}
	// tesserix.app is the domain verified on the platform's Resend account;
	// beautyandcruor.com is not. It costs nothing: this mail goes to her inbox
	// to say an enquiry arrived, and reply_to carries the producer's address,
	// so the From is seen only by her and replying still reaches the sender.
	from := envOr("ENQUIRY_FROM", "Beauty & Cruor <noreply@tesserix.app>")
	addr := envOr("ENQUIRY_ADDR", "127.0.0.1:8081")

	h := &handler{
		apiKey:  apiKey,
		to:      to,
		from:    from,
		limiter: newLimiter(5, time.Hour),
		client:  &http.Client{Timeout: resendTimeout},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("POST /enquiry", h.enquiry)
	mountAdmin(mux)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      20 * time.Second,
	}
	log.Printf("enquiry: listening on %s, delivering to %s", addr, strings.Join(to, ", "))
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("enquiry: %v", err)
	}
}

type handler struct {
	apiKey  string
	to      []string
	from    string
	limiter *limiter
	client  *http.Client
}

func (h *handler) enquiry(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !h.limiter.allow(ip) {
		// 429 rather than a lie: a person who genuinely sent five enquiries in
		// an hour should be told, not silently dropped.
		http.Error(w, "Too many enquiries from this address. Please try later.", http.StatusTooManyRequests)
		return
	}

	var s submission
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBody)).Decode(&s); err != nil {
		http.Error(w, "Malformed submission.", http.StatusBadRequest)
		return
	}

	if reason := spam(&s); reason != "" {
		// Accepted, and discarded. A bot that is told it failed simply adapts;
		// one that is told it succeeded moves on. The log line is what makes
		// the decision auditable.
		log.Printf("enquiry: discarded from %s — %s", ip, reason)
		w.WriteHeader(http.StatusNoContent)
		return
	}

	if reason := invalid(&s); reason != "" {
		http.Error(w, reason, http.StatusBadRequest)
		return
	}

	if err := h.send(&s); err != nil {
		log.Printf("enquiry: resend failed for %s: %v", ip, err)
		http.Error(w, "That didn't send. Please try again shortly.", http.StatusBadGateway)
		return
	}

	log.Printf("enquiry: delivered from %s", ip)
	w.WriteHeader(http.StatusNoContent)
}

// spam returns a reason when the submission should be silently discarded.
func spam(s *submission) string {
	if strings.TrimSpace(s.Company) != "" {
		return "honeypot filled"
	}

	// The form stamps the time it mounted. Too fast is automation; too old is
	// a replayed capture.
	if s.Started != "" {
		var ms int64
		if _, err := fmt.Sscanf(s.Started, "%d", &ms); err == nil && ms > 0 {
			age := time.Since(time.UnixMilli(ms))
			if age < minFillTime {
				return fmt.Sprintf("submitted in %s", age.Round(time.Millisecond))
			}
			if age > maxFormAge {
				return fmt.Sprintf("form was %s old", age.Round(time.Minute))
			}
		}
	}

	if n := len(linkRe.FindAllString(s.Details+" "+s.Name, -1)); n > maxLinks {
		return fmt.Sprintf("%d links", n)
	}
	// A name is not a sentence, and a link in one is never genuine.
	if linkRe.MatchString(s.Name) {
		return "link in name"
	}
	// Header injection attempts never come from the form.
	if strings.ContainsAny(s.Name+s.Email+s.Enquiry, "\r\n") {
		return "newline in a single-line field"
	}
	return ""
}

// invalid returns a message for the sender when the submission is unusable.
func invalid(s *submission) string {
	name := strings.TrimSpace(s.Name)
	details := strings.TrimSpace(s.Details)
	email := strings.TrimSpace(s.Email)

	switch {
	case name == "" || len(name) > maxName:
		return "Please give a name we can reply to."
	case email == "" || len(email) > maxEmail:
		return "Please give an email address."
	case details == "" || len(details) > maxDetails:
		return "Please tell us the dates and what you need."
	case len(s.Enquiry) > maxEnquiry:
		return "Unrecognised enquiry type."
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return "That address looks incomplete — check for a typo."
	}
	return ""
}

func (h *handler) send(s *submission) error {
	subject := fmt.Sprintf("Enquiry — %s", firstNonEmpty(strings.TrimSpace(s.Enquiry), "website"))

	// Every value is escaped: the body is HTML, and the whole point of this
	// service is that the values are untrusted.
	body := fmt.Sprintf(
		`<p><strong>%s</strong> &lt;%s&gt;</p><p><em>%s</em></p><p style="white-space:pre-wrap">%s</p>`,
		html.EscapeString(strings.TrimSpace(s.Name)),
		html.EscapeString(strings.TrimSpace(s.Email)),
		html.EscapeString(strings.TrimSpace(s.Enquiry)),
		html.EscapeString(strings.TrimSpace(s.Details)),
	)

	payload, err := json.Marshal(map[string]any{
		"from": h.from,
		"to":   h.to,
		// So hitting reply in the inbox answers the producer, not this service.
		"reply_to": strings.TrimSpace(s.Email),
		"subject":  subject,
		"html":     body,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+h.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		// Deliberately not echoed to the browser, and the key is in the header
		// rather than the body, so this is safe to log.
		return fmt.Errorf("resend returned %d", resp.StatusCode)
	}
	return nil
}

// --- rate limiting -------------------------------------------------------

// limiter is a fixed window per client address. In-process and therefore
// per-replica, which is the right trade here: the chart runs two replicas, so
// the real ceiling is double the configured one, and that is still far below
// what a person sends and far above nothing.
type limiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newLimiter(limit int, window time.Duration) *limiter {
	l := &limiter{hits: map[string][]time.Time{}, limit: limit, window: window}
	go l.sweep()
	return l
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	cut := time.Now().Add(-l.window)
	kept := l.hits[key][:0]
	for _, t := range l.hits[key] {
		if t.After(cut) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, time.Now())
	return true
}

// Without this the map grows for the lifetime of the pod.
func (l *limiter) sweep() {
	for range time.Tick(l.window) {
		l.mu.Lock()
		cut := time.Now().Add(-l.window)
		for k, ts := range l.hits {
			if len(ts) == 0 || ts[len(ts)-1].Before(cut) {
				delete(l.hits, k)
			}
		}
		l.mu.Unlock()
	}
}

// clientIP reads the address nginx forwarded. Trusted because nothing but
// nginx can reach this port — it listens on loopback inside the pod.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// --- env -----------------------------------------------------------------

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("enquiry: %s is required", k)
	}
	return v
}

// splitList parses a comma-separated env value, dropping blanks.
func splitList(v string) []string {
	var out []string
	for _, part := range strings.Split(v, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func envOr(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

// mountAdmin wires up the credits editor, if it is configured.
//
// Optional on purpose. The enquiry form is the launch-blocking part of this
// service and must come up whether or not the admin has its secrets yet, so a
// missing ADMIN_PASSWORD_HASH logs a line and leaves /admin unrouted rather
// than killing the pod. Half-configured is the one state that would be worse
// than either, so it is treated as fatal: a hash that will not parse, or a
// hash with no GitHub token behind it, stops the process.
func mountAdmin(mux *http.ServeMux) {
	encoded := secretEnv("ADMIN_PASSWORD_HASH")
	if encoded == "" {
		log.Print("enquiry: ADMIN_PASSWORD_HASH unset — the credits editor is off")
		return
	}
	v, err := parseVerifier(encoded)
	if err != nil {
		log.Fatalf("enquiry: ADMIN_PASSWORD_HASH is malformed: %v", err)
	}

	repo := strings.TrimSpace(mustEnv("ADMIN_GITHUB_REPO"))
	if strings.Count(repo, "/") != 1 {
		log.Fatalf("enquiry: ADMIN_GITHUB_REPO should be owner/name, got %q", repo)
	}
	a := &adminHandler{
		verifier: v,
		sessions: sessions{key: sessionKey()},
		limiter:  newLimiter(loginAttempts, time.Hour),
		// Where the pickers load thumbnails from. It must match the site's
		// ASSET_BASE_URL build arg — public/img is excluded from the site
		// image, so there is nothing same-origin to point at. The default is
		// the same bucket the Dockerfile defaults to; both move together at
		// the cutover, when the bucket is renamed to assets.beautyandcruor.com.
		assetBase: strings.TrimRight(
			envOr("ADMIN_ASSET_BASE_URL", "https://storage.googleapis.com/beautyandcruor-prod-assets-in"), "/"),
		gh: &github{
			token:  secretEnv("ADMIN_GITHUB_TOKEN"),
			repo:   repo,
			branch: envOr("ADMIN_GITHUB_BRANCH", "main"),
			client: &http.Client{Timeout: githubTimeout},
			base:   localAPIOverride(),
		},
	}
	a.uploads = uploadsFromEnv(&http.Client{Timeout: 60 * time.Second})
	a.routes(mux)
	log.Printf("enquiry: credits editor on /admin, committing to %s@%s", a.gh.repo, a.gh.branch)
	if a.uploads != nil {
		log.Printf("enquiry: image upload on, originals to gs://%s (max %d MB)",
			a.uploads.bucket, a.uploads.maxBytes>>20)
	} else {
		log.Print("enquiry: image upload off — ADMIN_ORIGINALS_BUCKET unset")
	}
}

// sessionKey returns the HMAC key for session cookies.
//
// A supplied key keeps sessions valid across a restart. Without one a random
// key is generated, which is safe but signs everyone out whenever the pod
// moves — acceptable for one user, and much better than a default constant
// that would let anyone who read this file mint a session.
func sessionKey() []byte {
	if s := secretEnv("ADMIN_SESSION_KEY"); s != "" {
		return []byte(s)
	}
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		log.Fatalf("enquiry: generating a session key: %v", err)
	}
	log.Print("enquiry: ADMIN_SESSION_KEY unset — sessions will not survive a restart")
	return key
}

func printPasswordHash() {
	fmt.Fprint(os.Stderr, "Password: ")
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		log.Fatalf("reading the password: %v", err)
	}
	password := strings.TrimRight(line, "\r\n")
	if len(password) < 12 {
		log.Fatal("use at least 12 characters — this is the only thing between the internet and her credits")
	}
	v, err := newVerifier(password)
	if err != nil {
		log.Fatalf("deriving: %v", err)
	}
	fmt.Println(encodeVerifier(v))
}

// localAPIOverride lets a test point the GitHub client at a stub.
//
// It accepts LOOPBACK ADDRESSES ONLY. The alternative — an unrestricted base
// URL — is a single environment variable away from sending a token with write
// access to this repository to someone else's server, and a knob that exists
// for tests should not be able to do that even when set wrongly. Anything else
// is refused loudly rather than ignored, so a typo is not mistaken for working.
func localAPIOverride() string {
	base := os.Getenv("ADMIN_GITHUB_API")
	if base == "" {
		return ""
	}
	u, err := url.Parse(base)
	if err != nil {
		log.Fatalf("enquiry: ADMIN_GITHUB_API is not a URL: %v", err)
	}
	host := u.Hostname()
	if host != "127.0.0.1" && host != "::1" && host != "localhost" {
		log.Fatalf("enquiry: ADMIN_GITHUB_API may only point at loopback, got %q", host)
	}
	log.Printf("enquiry: GitHub API overridden to %s — this is for testing", base)
	return strings.TrimRight(base, "/")
}

// secretEnv reads a credential from the environment, without whatever
// whitespace the thing that stored it left behind.
//
// This is not defensiveness for its own sake. A secret is almost always
// created by piping a value into something, and a trailing newline survives
// the whole chain: `gcloud secrets create --data-file=-` stores the byte,
// External Secrets copies it into the Kubernetes Secret verbatim, and the
// container receives it in the variable.
//
// The token is where that becomes a real failure. Go's http client refuses a
// header value containing a newline — correctly, since that is how header
// injection works — so every GitHub call died with
//
//	net/http: invalid header field value for "Authorization"
//
// while the token itself was perfectly valid. The editor signed in, listed
// nothing, and reported that it could not load the credits.
//
// It also hides from the obvious check. Shell command substitution strips
// trailing newlines, so `TOK=$(gcloud secrets versions access ...)` inspects a
// value that has already been cleaned, and the secret passes every test while
// remaining broken in the cluster.
func secretEnv(name string) string {
	return strings.TrimSpace(os.Getenv(name))
}
