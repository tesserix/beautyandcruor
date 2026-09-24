package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// A verifier cheap enough to use in every test. The production cost is 600k
// iterations, which is the point of it, and far too slow to run per case.
func testVerifier(t *testing.T, password string) verifier {
	t.Helper()
	v, err := deriveVerifier(password, []byte("a-fixed-test-salt"), 1000)
	if err != nil {
		t.Fatalf("deriveVerifier: %v", err)
	}
	return v
}

func TestPasswordVerifier(t *testing.T) {
	v := testVerifier(t, "correct horse battery staple")

	if !v.matches("correct horse battery staple") {
		t.Error("the right password did not match")
	}
	for _, wrong := range []string{"", "correct horse battery stapl", "Correct horse battery staple", " correct horse battery staple"} {
		if v.matches(wrong) {
			t.Errorf("wrong password matched: %q", wrong)
		}
	}
}

func TestVerifierEncodingRoundTrip(t *testing.T) {
	v := testVerifier(t, "a password for round tripping")
	parsed, err := parseVerifier(encodeVerifier(v))
	if err != nil {
		t.Fatalf("parseVerifier: %v", err)
	}
	if !parsed.matches("a password for round tripping") {
		t.Error("a re-parsed verifier stopped matching its own password")
	}
}

func TestVerifierRejectsMalformed(t *testing.T) {
	for name, encoded := range map[string]string{
		"empty":            "",
		"plain password":   "hunter2",
		"wrong algorithm":  "bcrypt$10$abc$def",
		"missing field":    "pbkdf2-sha256$600000$c2FsdA",
		"zero iterations":  "pbkdf2-sha256$0$c2FsdA$aGFzaA",
		"bad base64 salt":  "pbkdf2-sha256$600000$!!!!$aGFzaA",
		"empty hash field": "pbkdf2-sha256$600000$c2FsdA$",
	} {
		if _, err := parseVerifier(encoded); err == nil {
			t.Errorf("%s: parsed without error", name)
		}
	}
}

func TestSessionLifecycle(t *testing.T) {
	s := sessions{key: []byte("a-test-signing-key")}
	now := time.Date(2026, 9, 24, 12, 0, 0, 0, time.UTC)
	token := s.issue(now)

	if !s.valid(token, now.Add(time.Minute)) {
		t.Error("a fresh session was rejected")
	}
	if s.valid(token, now.Add(sessionTTL+time.Minute)) {
		t.Error("an expired session was accepted")
	}

	// A different key must not validate our token, or a leaked cookie from
	// another deployment would be accepted here.
	other := sessions{key: []byte("a-different-key")}
	if other.valid(token, now.Add(time.Minute)) {
		t.Error("a session signed with a different key was accepted")
	}
}

func TestSessionRejectsTampering(t *testing.T) {
	s := sessions{key: []byte("a-test-signing-key")}
	now := time.Now()
	token := s.issue(now)
	expiry, sig, _ := strings.Cut(token, ".")

	// The attack this defends against: extend your own session by editing the
	// expiry. The signature covers it, so the edit invalidates the token.
	far := "99999999999"
	for name, forged := range map[string]string{
		"extended expiry": far + "." + sig,
		"no signature":    expiry,
		"empty signature": expiry + ".",
		"junk signature":  expiry + ".not-a-signature",
		"empty":           "",
	} {
		if s.valid(forged, now) {
			t.Errorf("%s was accepted", name)
		}
	}
}

func TestValidYear(t *testing.T) {
	for _, ok := range []string{"2024", "1999", "2019-2020"} {
		if !validYear(ok) {
			t.Errorf("%q rejected", ok)
		}
	}
	// byYearDesc parses the first four characters and the page groups on them,
	// so anything else lands under a heading that reads as nonsense.
	for _, bad := range []string{"", "24", "20245", "twenty", "2019 - 2020", "2019-20", "-2020", "2019-abcd"} {
		if validYear(bad) {
			t.Errorf("%q accepted", bad)
		}
	}
}

func TestValidateCredits(t *testing.T) {
	good := credit{Title: "Some Feature", Director: "A Director", Production: "A Company", Year: "2024", Location: "India"}

	if got := validateCredits([]credit{good}); got != "" {
		t.Errorf("a valid row was rejected: %s", got)
	}
	// Role is the field this whole editor exists to let her fill.
	withRole := good
	withRole.Role = "Prosthetics designer"
	if got := validateCredits([]credit{withRole}); got != "" {
		t.Errorf("a row with a role was rejected: %s", got)
	}

	noTitle := good
	noTitle.Title = "   "
	noYear := good
	noYear.Year = ""
	badYear := good
	badYear.Year = "last year"
	newline := good
	newline.Production = "A Company\nBcc: someone@example.com"
	long := good
	long.Director = strings.Repeat("x", maxFieldLen+1)

	for name, rows := range map[string][]credit{
		"empty list":         {},
		"no title":           {noTitle},
		"no year":            {noYear},
		"unparseable year":   {badYear},
		"newline in a field": {newline},
		"over-long field":    {long},
	} {
		if validateCredits(rows) == "" {
			t.Errorf("%s was accepted", name)
		}
	}

	over := make([]credit, maxCredits+1)
	for i := range over {
		over[i] = good
	}
	if validateCredits(over) == "" {
		t.Error("a list over the limit was accepted")
	}
}

// The committed file is 2-space indented with no trailing newline. If that
// drifts, every save rewrites all 27 rows and her one-field edit is invisible
// in the diff.
func TestEncodingMatchesTheCommittedFormat(t *testing.T) {
	const committed = `[
  {
    "title": "Beco Commercial",
    "director": "Anirudh More",
    "production": "Dryfit production",
    "year": "2026",
    "location": "India"
  },
  {
    "title": "Asian Paints Commercial",
    "director": "Shayak Roy",
    "production": "BLTN",
    "year": "2025",
    "location": "India"
  }
]`

	var rows []credit
	if err := json.Unmarshal([]byte(committed), &rows); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	encoded, err := json.MarshalIndent(normaliseCredits(rows), "", "  ")
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	if string(encoded) != committed {
		t.Errorf("re-encoding changed the file.\n--- got ---\n%s\n--- want ---\n%s", encoded, committed)
	}
}

// The encoder must not HTML-escape. Two real rows in credits.json carry an
// ampersand and a curly apostrophe, and Go's default json.Marshal turns the
// first into \u0026 — two lines of diff on a save that changed nothing.
//
// This is the test that was missing: the byte-identical fixture used plain
// ASCII with no & in it, so it passed while the real file did not.
func TestEncodingDoesNotEscapeRealCreditText(t *testing.T) {
	rows := []credit{
		{Title: "PUBG Originals", Director: "Raghav Subbu & Ruchir Arun", Production: "Content Factory", Year: "2019-2020", Location: "India"},
		{Title: "ISSAC’S DREAM", Director: "ACM", Production: "", Year: "2023", Location: "India"},
		{Title: "Angle < 90 > 45", Director: "D", Production: "P", Year: "2024", Location: "L"},
	}
	encoded, err := encodeContent(normaliseCredits(rows), false)
	if err != nil {
		t.Fatal(err)
	}
	got := string(encoded)
	for _, forbidden := range []string{`\u0026`, `\u003c`, `\u003e`, `\u2019`} {
		if strings.Contains(got, forbidden) {
			t.Errorf("output contains %s; it should carry the character literally:\n%s", forbidden, got)
		}
	}
	for _, want := range []string{"Raghav Subbu & Ruchir Arun", "ISSAC’S DREAM", "Angle < 90 > 45"} {
		if !strings.Contains(got, want) {
			t.Errorf("output lost %q:\n%s", want, got)
		}
	}
	if strings.HasSuffix(got, "\n") {
		t.Error("credits.json has no trailing newline; the encoder added one")
	}
}

// curation.json does end with a newline, and the same encoder has to honour
// that or every save rewrites the last line.
func TestCurationKeepsItsTrailingNewline(t *testing.T) {
	encoded, err := encodeContent(curation{Hero: []string{"a/b & c"}, Leads: leadsMap{}, Covers: coversMap{}}, true)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasSuffix(string(encoded), "}\n") {
		t.Errorf("want a single trailing newline, got %q", string(encoded)[len(encoded)-4:])
	}
	if strings.Contains(string(encoded), `\u0026`) {
		t.Error("curation output was HTML-escaped too")
	}
}

// An untouched row must not gain an empty "role" key.
func TestRoleIsOmittedWhenEmpty(t *testing.T) {
	encoded, err := json.Marshal(credit{Title: "T", Director: "D", Production: "P", Year: "2024", Location: "L"})
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "role") {
		t.Errorf("an empty role was written: %s", encoded)
	}
}

// --- request-level guards ---------------------------------------------------

func testAdmin(t *testing.T) *adminHandler {
	t.Helper()
	return &adminHandler{
		verifier: testVerifier(t, "a-test-password-long-enough"),
		sessions: sessions{key: []byte("a-test-signing-key")},
		limiter:  newLimiter(loginAttempts, time.Hour),
		gh:       &github{repo: "owner/name", branch: "main"},
	}
}

func TestUnauthenticatedRequestsAreRefused(t *testing.T) {
	a := testAdmin(t)
	mux := http.NewServeMux()
	a.routes(mux)

	for _, tc := range []struct{ method, path string }{
		{http.MethodGet, "/admin/credits"},
		{http.MethodPut, "/admin/credits"},
	} {
		req := httptest.NewRequest(tc.method, tc.path, strings.NewReader(`{"rows":[],"sha":"x"}`))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s %s: got %d, want 401", tc.method, tc.path, rec.Code)
		}
	}
}

// A signed-in session is not enough for a write: without the bound CSRF token
// the request is refused, so a cross-site form post cannot save on her behalf.
func TestWritesRequireTheCsrfToken(t *testing.T) {
	a := testAdmin(t)
	mux := http.NewServeMux()
	a.routes(mux)

	now := time.Now()
	cookie := &http.Cookie{Name: sessionCookie, Value: a.sessions.issue(now)}

	req := httptest.NewRequest(http.MethodPut, "/admin/credits", strings.NewReader(`{"rows":[],"sha":"x"}`))
	req.AddCookie(cookie)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("missing CSRF token: got %d, want 403", rec.Code)
	}

	// A token minted for a different session must not work either.
	other := sessions{key: []byte("someone-elses-key")}
	req = httptest.NewRequest(http.MethodPut, "/admin/credits", strings.NewReader(`{"rows":[],"sha":"x"}`))
	req.AddCookie(cookie)
	req.Header.Set(csrfHeader, other.sign("csrf:"+cookie.Value))
	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("foreign CSRF token: got %d, want 403", rec.Code)
	}
}

// The path is not an input. This is the property that stops a session editing
// the workflow that deploys the site.
func TestOnlyContentFilesAreWritable(t *testing.T) {
	g := &github{repo: "owner/name", branch: "main", client: http.DefaultClient}
	for _, path := range []string{
		".github/workflows/ci.yml",
		"package.json",
		"src/content/../../.github/workflows/ci.yml",
		"",
	} {
		if _, _, err := g.read(path); err == nil {
			t.Errorf("read %q was permitted", path)
		}
		if err := g.write(path, []byte("{}"), "sha", "msg"); err == nil {
			t.Errorf("write %q was permitted", path)
		}
	}
	if !writablePaths["src/content/credits.json"] {
		t.Error("credits.json is not writable — the editor cannot work")
	}
}

// --- the commit path, against a stub GitHub ---------------------------------

// stubGitHub serves the two contents-API calls the editor makes, and records
// what it was asked to write.
type stubGitHub struct {
	body     []byte
	sha      string
	gotSHA   string
	gotBody  []byte
	gotMsg   string
	conflict bool
}

func (s *stubGitHub) server(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /repos/owner/name/contents/src/content/credits.json", func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("token not sent: %q", got)
		}
		writeJSON(w, http.StatusOK, map[string]string{
			"content":  base64.StdEncoding.EncodeToString(s.body),
			"encoding": "base64",
			"sha":      s.sha,
		})
	})
	mux.HandleFunc("PUT /repos/owner/name/contents/src/content/credits.json", func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Message, Content, SHA, Branch string }
		_ = json.NewDecoder(r.Body).Decode(&in)
		s.gotSHA, s.gotMsg = in.SHA, in.Message
		s.gotBody, _ = base64.StdEncoding.DecodeString(in.Content)
		if s.conflict {
			writeJSON(w, http.StatusConflict, map[string]string{"message": "sha mismatch"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"commit": map[string]string{"sha": "new"}})
	})
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func signedInRequest(a *adminHandler, method, path, body string) *http.Request {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	value := a.sessions.issue(time.Now())
	req.AddCookie(&http.Cookie{Name: sessionCookie, Value: value})
	mac := hmac.New(sha256.New, a.sessions.key)
	mac.Write([]byte("csrf:" + value))
	req.Header.Set(csrfHeader, base64.RawURLEncoding.EncodeToString(mac.Sum(nil)))
	return req
}

func TestEditRoundTripCommits(t *testing.T) {
	const original = `[
  {
    "title": "Beco Commercial",
    "director": "Anirudh More",
    "production": "Dryfit production",
    "year": "2026",
    "location": "India"
  }
]`
	stub := &stubGitHub{body: []byte(original), sha: "blob-sha-from-read"}
	srv := stub.server(t)

	a := testAdmin(t)
	a.gh = &github{token: "test-token", repo: "owner/name", branch: "main", client: srv.Client(), base: srv.URL}
	mux := http.NewServeMux()
	a.routes(mux)

	// Read.
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, signedInRequest(a, http.MethodGet, "/admin/credits", ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("GET credits: %d — %s", rec.Code, rec.Body)
	}
	var loaded struct {
		Rows []credit `json:"rows"`
		SHA  string   `json:"sha"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &loaded); err != nil {
		t.Fatalf("decoding: %v", err)
	}
	if loaded.SHA != "blob-sha-from-read" || len(loaded.Rows) != 1 {
		t.Fatalf("loaded %d row(s), sha %q", len(loaded.Rows), loaded.SHA)
	}

	// Fill in the role — the field this editor exists for.
	loaded.Rows[0].Role = "Prosthetics designer"
	save, _ := json.Marshal(creditsSave{Rows: loaded.Rows, SHA: loaded.SHA})

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, signedInRequest(a, http.MethodPut, "/admin/credits", string(save)))
	if rec.Code != http.StatusOK {
		t.Fatalf("PUT credits: %d — %s", rec.Code, rec.Body)
	}

	// The read's sha must be sent back, or concurrent edits overwrite silently.
	if stub.gotSHA != "blob-sha-from-read" {
		t.Errorf("committed with sha %q, want the one from the read", stub.gotSHA)
	}
	want := `[
  {
    "title": "Beco Commercial",
    "director": "Anirudh More",
    "production": "Dryfit production",
    "year": "2026",
    "location": "India",
    "role": "Prosthetics designer"
  }
]`
	if string(stub.gotBody) != want {
		t.Errorf("committed content differs.\n--- got ---\n%s\n--- want ---\n%s", stub.gotBody, want)
	}
	if !strings.Contains(stub.gotMsg, "credits") {
		t.Errorf("commit message does not say what changed: %q", stub.gotMsg)
	}
}

// A concurrent edit must be reported, not silently resolved one way or other.
func TestConcurrentEditIsReported(t *testing.T) {
	stub := &stubGitHub{body: []byte(`[{"title":"T","director":"D","production":"P","year":"2024","location":"L"}]`), sha: "old", conflict: true}
	srv := stub.server(t)

	a := testAdmin(t)
	a.gh = &github{token: "test-token", repo: "owner/name", branch: "main", client: srv.Client(), base: srv.URL}
	mux := http.NewServeMux()
	a.routes(mux)

	save, _ := json.Marshal(creditsSave{
		Rows: []credit{{Title: "T", Director: "D", Production: "P", Year: "2024", Location: "L"}},
		SHA:  "stale",
	})
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, signedInRequest(a, http.MethodPut, "/admin/credits", string(save)))
	if rec.Code != http.StatusConflict {
		t.Fatalf("got %d, want 409", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "Reload") {
		t.Errorf("the conflict message does not tell her what to do: %s", rec.Body)
	}
}
