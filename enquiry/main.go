// Command enquiry accepts the site's contact form and sends it on through
// Resend.
//
// WHY THIS EXISTS
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
// WHY NOT nginx ALONE
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
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"log"
	"net"
	"net/http"
	"net/mail"
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
	minFillTime   = 3 * time.Second  // nobody reads and completes it faster
	maxFormAge    = 6 * time.Hour    // a stale page is a replayed one
	maxLinks      = 2                // a genuine enquiry rarely carries more
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
	apiKey := mustEnv("RESEND_API_KEY")
	to := splitList(mustEnv("ENQUIRY_TO"))
	if len(to) == 0 {
		log.Fatal("enquiry: ENQUIRY_TO listed no addresses")
	}
	from := envOr("ENQUIRY_FROM", "Beauty & Cruor <enquiries@beautyandcruor.com>")
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
