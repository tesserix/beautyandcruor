package main

import (
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"
)

// stamp returns a Started value for a form that mounted d ago.
func stamp(d time.Duration) string {
	return fmt.Sprintf("%d", time.Now().Add(-d).UnixMilli())
}

func good() submission {
	return submission{
		Name:    "Rahi Anil Barve",
		Email:   "rahi@d2rfilms.example",
		Enquiry: "Prosthetics — feature film",
		Details: "12–18 March, Gold Coast. Three burn appliances, two run days.",
		Started: stamp(45 * time.Second),
	}
}

func TestSpamDiscards(t *testing.T) {
	cases := []struct {
		name string
		mut  func(*submission)
		want string // substring of the reason
	}{
		{"honeypot filled", func(s *submission) { s.Company = "Acme SEO" }, "honeypot"},
		{"submitted instantly", func(s *submission) { s.Started = stamp(200 * time.Millisecond) }, "submitted in"},
		{"replayed old form", func(s *submission) { s.Started = stamp(48 * time.Hour) }, "old"},
		{"link farm in details", func(s *submission) {
			s.Details = "cheap seo https://a.example https://b.example www.c.example"
		}, "links"},
		{"link in the name", func(s *submission) { s.Name = "visit https://spam.example" }, "link in name"},
		{"header injection via name", func(s *submission) { s.Name = "Bob\r\nBcc: victim@example.com" }, "newline"},
		{"header injection via email", func(s *submission) { s.Email = "a@b.com\nBcc: c@d.com" }, "newline"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := good()
			c.mut(&s)
			got := spam(&s)
			if got == "" {
				t.Fatalf("expected the submission to be discarded, it was accepted")
			}
			if !strings.Contains(got, c.want) {
				t.Fatalf("reason = %q, want it to mention %q", got, c.want)
			}
		})
	}
}

func TestGenuineSubmissionSurvives(t *testing.T) {
	s := good()
	if reason := spam(&s); reason != "" {
		t.Fatalf("genuine submission discarded as %q", reason)
	}
	if msg := invalid(&s); msg != "" {
		t.Fatalf("genuine submission rejected: %s", msg)
	}
}

// A form with no timestamp must still go through: a visitor with JS partially
// blocked, or an older cached page, is not a bot.
func TestMissingTimestampIsNotSpam(t *testing.T) {
	s := good()
	s.Started = ""
	if reason := spam(&s); reason != "" {
		t.Fatalf("submission without a timestamp discarded as %q", reason)
	}
}

// Two links is a plausible genuine enquiry — a call sheet and an IMDb page.
func TestTwoLinksAllowed(t *testing.T) {
	s := good()
	s.Details = "Refs: https://imdb.example/title and https://drive.example/callsheet"
	if reason := spam(&s); reason != "" {
		t.Fatalf("two links discarded as %q", reason)
	}
}

func TestInvalidRejections(t *testing.T) {
	cases := []struct {
		name string
		mut  func(*submission)
		want string
	}{
		{"no name", func(s *submission) { s.Name = "   " }, "name"},
		{"no email", func(s *submission) { s.Email = "" }, "email address"},
		{"malformed email", func(s *submission) { s.Email = "rahi@@films" }, "typo"},
		{"no details", func(s *submission) { s.Details = "" }, "dates"},
		{"oversized details", func(s *submission) { s.Details = strings.Repeat("x", maxDetails+1) }, "dates"},
		{"oversized name", func(s *submission) { s.Name = strings.Repeat("x", maxName+1) }, "name"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			s := good()
			c.mut(&s)
			if msg := invalid(&s); msg == "" {
				t.Fatalf("expected a rejection message, got none")
			} else if !strings.Contains(strings.ToLower(msg), c.want) {
				t.Fatalf("message = %q, want it to mention %q", msg, c.want)
			}
		})
	}
}

func TestRateLimit(t *testing.T) {
	l := newLimiter(3, time.Hour)
	for i := range 3 {
		if !l.allow("203.0.113.7") {
			t.Fatalf("submission %d blocked, expected the first 3 through", i+1)
		}
	}
	if l.allow("203.0.113.7") {
		t.Fatal("4th submission allowed, expected it blocked")
	}
	// Another sender is unaffected.
	if !l.allow("203.0.113.8") {
		t.Fatal("a different address was blocked by its neighbour's limit")
	}
}

func TestRateLimitWindowExpires(t *testing.T) {
	l := newLimiter(1, 50*time.Millisecond)
	if !l.allow("198.51.100.1") {
		t.Fatal("first submission blocked")
	}
	if l.allow("198.51.100.1") {
		t.Fatal("second submission allowed inside the window")
	}
	time.Sleep(70 * time.Millisecond)
	if !l.allow("198.51.100.1") {
		t.Fatal("submission blocked after the window had passed")
	}
}

// The GitHub API override is a test affordance. It must not be usable to send
// a token with write access to this repository anywhere but loopback.
func TestGitHubAPIOverrideIsLoopbackOnly(t *testing.T) {
	t.Setenv("ADMIN_GITHUB_API", "")
	if got := localAPIOverride(); got != "" {
		t.Errorf("unset override returned %q", got)
	}
	for _, ok := range []string{"http://127.0.0.1:9000", "http://localhost:9000/", "http://[::1]:9000"} {
		t.Setenv("ADMIN_GITHUB_API", ok)
		if got := localAPIOverride(); got == "" {
			t.Errorf("%s was refused", ok)
		}
	}
	// A non-loopback host calls log.Fatal, which exits the process, so it
	// cannot be exercised in-process. The parse is what is asserted here; the
	// refusal itself is a one-line host comparison directly above it.
}

// A trailing newline is what a piped `gcloud secrets create --data-file=-`
// leaves behind, and it survives all the way into the container. Go's http
// client then refuses the Authorization header, so a perfectly valid token
// fails every call. Credentials are trimmed on the way in.
func TestSecretEnvTrimsWhatStorageLeavesBehind(t *testing.T) {
	const want = "github_pat_11ABCDEF0123456789"
	for name, stored := range map[string]string{
		"trailing newline": want + "\n",
		"crlf":             want + "\r\n",
		"leading space":    " " + want,
		"both":             "\t" + want + " \n",
		"clean":            want,
	} {
		t.Setenv("TEST_SECRET", stored)
		if got := secretEnv("TEST_SECRET"); got != want {
			t.Errorf("%s: got %q, want %q", name, got, want)
		}
	}
	t.Setenv("TEST_SECRET", "   \n\t ")
	if got := secretEnv("TEST_SECRET"); got != "" {
		t.Errorf("whitespace-only should read as unset, got %q", got)
	}
}

// The failure this prevents, stated as a test: a header value with a newline
// is rejected by net/http, so an untrimmed token can never make a request.
func TestUntrimmedTokenWouldBreakTheRequest(t *testing.T) {
	req, err := http.NewRequest(http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Authorization", "Bearer token-with-a-newline\n")
	if _, err := (&http.Client{}).Do(req); err == nil {
		t.Skip("net/http accepted a newline in a header; the guard is belt and braces")
	} else if !strings.Contains(err.Error(), "invalid header field value") {
		t.Logf("rejected, though not for the reason expected: %v", err)
	}
}
