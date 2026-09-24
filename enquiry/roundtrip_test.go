package main

import (
	"encoding/json"
	"os"
	"testing"
)

// The real file, not a fixture.
//
// Read the committed credits, re-encode them, and require the bytes back
// unchanged. Every fixture-based test passed while the real file did not,
// because the fixtures were plain ASCII: the escaping bug needed an ampersand
// and a curly apostrophe, and only her actual data had them.
//
// Runs in CI, where the whole repository is checked out. Skips inside the
// container build, whose context is enquiry/ alone — hence the env var rather
// than a relative path that would fail there.
func TestRealCreditsFileRoundTripsUnchanged(t *testing.T) {
	path := os.Getenv("CREDITS_FILE")
	if path == "" {
		t.Skip("CREDITS_FILE not set; this runs in CI, not in the image build")
	}
	original, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("reading %s: %v", path, err)
	}
	var rows []credit
	if err := json.Unmarshal(original, &rows); err != nil {
		t.Fatalf("the committed credits do not parse: %v", err)
	}
	encoded, err := encodeContent(normaliseCredits(rows), false)
	if err != nil {
		t.Fatal(err)
	}
	if string(encoded) == string(original) {
		t.Logf("%d rows, %d bytes, identical", len(rows), len(original))
		return
	}
	t.Errorf("re-encoding the committed file would change it (%d bytes -> %d), so a save that edits one field would rewrite other lines", len(original), len(encoded))
	for i := range encoded {
		if i >= len(original) || encoded[i] != original[i] {
			lo := max(0, i-70)
			t.Fatalf("first difference at byte %d:\n  committed: %q\n  encoded:   %q",
				i, original[lo:min(i+70, len(original))], encoded[lo:min(i+70, len(encoded))])
		}
	}
}
