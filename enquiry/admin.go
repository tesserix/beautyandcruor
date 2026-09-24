package main

// The admin: one password, and a form that commits credits.json.
//
// WHY IT LIVES IN THIS BINARY
//
// D18 chose to extend this sidecar rather than stand up a second service. It
// already runs beside nginx in the same pod, already holds a secret, already
// has a route in front of it. The alternative was a git CMS, which wants to
// commit images into a repository D15 deliberately moved them out of, and
// which asks a makeup artist to hold a GitHub account.
//
// WHY THE UI IS SERVED FROM HERE AND NOT BUILT INTO THE SITE
//
// The site is `output: 'export'`, so anything in it is public files. An admin
// page built there would ship its markup to every visitor and count against
// the client JS budget, to say nothing of advertising its own existence. Served
// from this process, the login gate covers the page itself.
//
// WHAT IT CANNOT DO
//
// It writes the files in writablePaths and nothing else. It cannot choose a
// path, a branch, or a repository — all three are fixed here, the same way
// ENQUIRY_TO is fixed for mail. A session that is somehow stolen can edit her
// credits; it cannot rewrite the workflow that deploys them.

import (
	"crypto/hmac"
	"crypto/sha256"
	_ "embed"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
	"unicode"
)

//go:embed admin.html
var adminHTML string

const (
	creditsPath = "src/content/credits.json"

	maxCredits   = 200
	maxFieldLen  = 200
	maxAdminBody = 256 << 10
	csrfHeader   = "X-CSRF-Token"
)

// credit mirrors one row of credits.json.
//
// Field order here is the field order in the committed file, because these
// tags drive the encoder. `role` is omitempty so the 27 existing rows do not
// all gain an empty key the first time anything is saved — the diff of her
// first edit should be her edit.
type credit struct {
	Title      string `json:"title"`
	Director   string `json:"director"`
	Production string `json:"production"`
	Year       string `json:"year"`
	Location   string `json:"location"`
	Role       string `json:"role,omitempty"`
}

type adminHandler struct {
	verifier verifier
	sessions sessions
	gh       *github
	limiter  *limiter
	// Where the image derivatives are served from. The pickers need absolute
	// URLs: public/img is excluded from the site image, so there is nothing
	// same-origin to point at.
	assetBase string
	index     indexCache
}

func (a *adminHandler) routes(mux *http.ServeMux) {
	mux.HandleFunc("GET /admin", a.page)
	mux.HandleFunc("GET /admin/", a.page)
	mux.HandleFunc("POST /admin/login", a.login)
	mux.HandleFunc("POST /admin/logout", a.logout)
	mux.HandleFunc("GET /admin/credits", a.getCredits)
	mux.HandleFunc("PUT /admin/credits", a.putCredits)
	mux.HandleFunc("GET /admin/sequence", a.getSequence)
	mux.HandleFunc("PUT /admin/sequence", a.putSequence)
}

// --- session plumbing -------------------------------------------------------

func (a *adminHandler) signedIn(r *http.Request) bool {
	c, err := r.Cookie(sessionCookie)
	return err == nil && a.sessions.valid(c.Value, time.Now())
}

// csrfToken binds a token to the session that will present it, so it cannot be
// lifted from one session and replayed in another. SameSite=Strict on the
// cookie is the first defence; this is the one that still holds if a browser
// ever treats a request as same-site that we would not.
func (a *adminHandler) csrfToken(r *http.Request) string {
	c, err := r.Cookie(sessionCookie)
	if err != nil {
		return ""
	}
	mac := hmac.New(sha256.New, a.sessions.key)
	mac.Write([]byte("csrf:" + c.Value))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// guard rejects anything that is not a signed-in, same-origin write.
func (a *adminHandler) guard(w http.ResponseWriter, r *http.Request, mutating bool) bool {
	if !a.signedIn(r) {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "Session expired. Sign in again."})
		return false
	}
	if mutating {
		want := a.csrfToken(r)
		if want == "" || !hmac.Equal([]byte(r.Header.Get(csrfHeader)), []byte(want)) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "Stale form. Reload the page."})
			return false
		}
	}
	return true
}

// --- pages ------------------------------------------------------------------

func (a *adminHandler) page(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	// Never cached, never indexed: it is behind a password and it is not a page
	// anyone should reach from a search result.
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Robots-Tag", "noindex, nofollow")
	state := "login"
	if a.signedIn(r) {
		state = "editor"
	}
	page := strings.ReplaceAll(adminHTML, "__STATE__", state)
	page = strings.ReplaceAll(page, "__CSRF__", a.csrfToken(r))
	fmt.Fprint(w, page)
}

func (a *adminHandler) login(w http.ResponseWriter, r *http.Request) {
	ip := clientIP(r)
	if !a.limiter.allow(ip) {
		http.Error(w, "Too many attempts. Try again later.", http.StatusTooManyRequests)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Malformed sign-in.", http.StatusBadRequest)
		return
	}
	if !a.verifier.matches(r.PostFormValue("password")) {
		// Logged, because repeated failures are the signal worth having, and
		// there is exactly one person who should ever be typing here.
		log.Printf("admin: failed sign-in from %s", ip)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusUnauthorized)
		page := strings.ReplaceAll(adminHTML, "__STATE__", "login")
		fmt.Fprint(w, strings.ReplaceAll(page, "__CSRF__", ""))
		return
	}
	now := time.Now()
	http.SetCookie(w, a.sessions.cookie(a.sessions.issue(now), now))
	log.Printf("admin: signed in from %s", ip)
	http.Redirect(w, r, "/admin", http.StatusSeeOther)
}

func (a *adminHandler) logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, a.sessions.cookie("", time.Now()))
	http.Redirect(w, r, "/admin", http.StatusSeeOther)
}

// --- credits ----------------------------------------------------------------

func (a *adminHandler) getCredits(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, false) {
		return
	}
	raw, sha, err := a.gh.read(creditsPath)
	if err != nil {
		log.Printf("admin: reading credits: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not load the credits."})
		return
	}
	var rows []credit
	if err := json.Unmarshal(raw, &rows); err != nil {
		log.Printf("admin: credits.json will not parse: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "The credits file could not be read."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"rows": rows, "sha": sha})
}

type creditsSave struct {
	Rows []credit `json:"rows"`
	SHA  string   `json:"sha"`
}

func (a *adminHandler) putCredits(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, true) {
		return
	}
	var save creditsSave
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxAdminBody)).Decode(&save); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Malformed save."})
		return
	}
	if save.SHA == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Reload before saving."})
		return
	}
	if problem := validateCredits(save.Rows); problem != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": problem})
		return
	}

	// Two-space indent and no trailing newline, matching the committed file, so
	// a save that changes one field produces a one-field diff.
	encoded, err := json.MarshalIndent(normaliseCredits(save.Rows), "", "  ")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not encode the credits."})
		return
	}

	message := fmt.Sprintf("Update credits (%d entries)", len(save.Rows))
	switch err := a.gh.write(creditsPath, encoded, save.SHA, message); {
	case err == nil:
		log.Printf("admin: committed %d credits", len(save.Rows))
		writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
	case err == errConflict:
		writeJSON(w, http.StatusConflict, map[string]string{
			"error": "Someone else saved while you were editing. Reload to get their changes, then make yours again.",
		})
	default:
		log.Printf("admin: committing credits: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not save. Nothing was changed."})
	}
}

// normaliseCredits trims every field, so a stray space cannot produce a diff
// that says nothing.
func normaliseCredits(rows []credit) []credit {
	out := make([]credit, len(rows))
	for i, r := range rows {
		out[i] = credit{
			Title:      strings.TrimSpace(r.Title),
			Director:   strings.TrimSpace(r.Director),
			Production: strings.TrimSpace(r.Production),
			Year:       strings.TrimSpace(r.Year),
			Location:   strings.TrimSpace(r.Location),
			Role:       strings.TrimSpace(r.Role),
		}
	}
	return out
}

// validateCredits returns a message for the editor, or "" when the rows are
// fit to commit.
//
// The bar is "will not corrupt the site", not "is correct" — she is the one who
// knows what is correct. A title is required because a row without one renders
// as an empty line on the credits page; a year is required because the page
// groups by it.
func validateCredits(rows []credit) string {
	if len(rows) == 0 {
		return "That would delete every credit. Keep at least one."
	}
	if len(rows) > maxCredits {
		return fmt.Sprintf("That is %d credits; the limit is %d.", len(rows), maxCredits)
	}
	for i, r := range rows {
		n := i + 1
		if strings.TrimSpace(r.Title) == "" {
			return fmt.Sprintf("Row %d has no title.", n)
		}
		if strings.TrimSpace(r.Year) == "" {
			return fmt.Sprintf("%q has no year — the page groups credits by year.", strings.TrimSpace(r.Title))
		}
		if !validYear(r.Year) {
			return fmt.Sprintf("%q has the year %q. Use 2024, or 2019-2020 for work spanning two years.",
				strings.TrimSpace(r.Title), strings.TrimSpace(r.Year))
		}
		for label, value := range map[string]string{
			"title": r.Title, "director": r.Director, "production": r.Production,
			"year": r.Year, "location": r.Location, "role": r.Role,
		} {
			if len([]rune(value)) > maxFieldLen {
				return fmt.Sprintf("Row %d's %s is too long (limit %d characters).", n, label, maxFieldLen)
			}
			if hasControlChar(value) {
				return fmt.Sprintf("Row %d's %s contains a line break or control character.", n, label)
			}
		}
	}
	return ""
}

// validYear accepts "2024" and "2019-2020". byYearDesc in lib/credits.ts parses
// the first four characters, and the credits page groups on them, so anything
// else silently lands in a group headed by nonsense.
func validYear(year string) bool {
	y := strings.TrimSpace(year)
	switch len(y) {
	case 4:
		return allDigits(y)
	case 9:
		return allDigits(y[:4]) && y[4] == '-' && allDigits(y[5:])
	default:
		return false
	}
}

func allDigits(s string) bool {
	for _, r := range s {
		if r < '0' || r > '9' {
			return false
		}
	}
	return len(s) > 0
}

func hasControlChar(s string) bool {
	for _, r := range s {
		if r != '\t' && unicode.IsControl(r) {
			return true
		}
	}
	return false
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
