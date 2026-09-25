package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func jpegBytes(n int) []byte {
	b := append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, bytes.Repeat([]byte{0x41}, n)...)
	return b
}

// A Content-Type header is whatever the client typed. The bytes are not.
func TestSniffImage(t *testing.T) {
	for name, tc := range map[string]struct {
		body []byte
		want string
	}{
		"jpeg":        {[]byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 0}, "jpeg"},
		"png":         {[]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, "png"},
		"webp":        {append([]byte("RIFF\x00\x00\x00\x00"), []byte("WEBPVP8 ")...), "webp"},
		"heic":        {append([]byte{0, 0, 0, 0x18}, []byte("ftypheic")...), ""},
		"avif":        {append([]byte{0, 0, 0, 0x18}, []byte("ftypavif")...), "avif"},
		"pdf":         {[]byte("%PDF-1.7\n%..."), ""},
		"mp4":         {append([]byte{0, 0, 0, 0x18}, []byte("ftypmp42")...), ""},
		"script":      {[]byte("#!/bin/sh\nrm -rf /"), ""},
		"empty":       {nil, ""},
		"jpeg prefix": {[]byte{0xFF, 0xD8}, ""}, // truncated, not a jpeg
	} {
		if got := sniffImage(tc.body); got != tc.want {
			t.Errorf("%s: got %q, want %q", name, got, tc.want)
		}
	}
}

// Her filename is kept because it is often the only description of the
// photograph — but it cannot escape the prefix or collide.
func TestObjectName(t *testing.T) {
	now := time.Date(2026, 9, 25, 14, 30, 5, 0, time.UTC)

	got := objectName(now, "IMG_4654.HEIC", "heic", "sfx")
	if want := "uploads/sfx/20260925T143005-IMG_4654.heic"; got != want {
		t.Errorf("got %q, want %q", got, want)
	}
	// Gallery first, our structure — not WordPress's year/month.
	for in, want := range map[string]string{
		"Film & TV": "unsorted", "film": "film", "FILM-TELEVISION": "film",
		"casting-sculpting": "casting", "editorial": "editorial",
		"": "unsorted", "nonsense": "unsorted",
	} {
		if got := galleryFolder(in); got != want {
			t.Errorf("galleryFolder(%q) = %q, want %q", in, got, want)
		}
	}
	for name, in := range map[string]string{
		"traversal":  "../../../etc/passwd",
		"absolute":   "/etc/passwd",
		"nested":     "a/b/c.jpg",
		"spaces":     "my holiday photo.jpg",
		"unicode":    "café ☕.jpg",
		"no name":    "",
		"only dots":  "...",
		"very long":  strings.Repeat("x", 300) + ".jpg",
		"semicolons": "a;rm -rf /.jpg",
	} {
		got := objectName(now, in, "jpeg", "sfx")
		if !strings.HasPrefix(got, "uploads/sfx/") {
			t.Errorf("%s: escaped the prefix: %q", name, got)
		}
		if strings.Contains(got, "..") || strings.Contains(strings.TrimPrefix(got, "uploads/sfx/"), "/") {
			t.Errorf("%s: contains a path separator or traversal: %q", name, got)
		}
		if len(got) > 200 {
			t.Errorf("%s: unreasonably long: %d", name, len(got))
		}
	}
}

func uploadRequest(a *adminHandler, field, filename string, body []byte, extra map[string]string) *http.Request {
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	part, _ := w.CreateFormFile(field, filename)
	part.Write(body)
	for k, v := range extra {
		w.WriteField(k, v)
	}
	w.Close()
	req := signedInRequest(a, http.MethodPost, "/admin/images", buf.String())
	req.Header.Set("Content-Type", w.FormDataContentType())
	return req
}

func uploadAdmin(t *testing.T, stored *[][2]string, maxBytes int64) (*adminHandler, *http.ServeMux) {
	t.Helper()
	a := testAdmin(t)
	gcs := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.Header.Get("Authorization"); got != "Bearer test-token" {
			t.Errorf("no bearer token on the upload: %q", got)
		}
		if r.Method != http.MethodPut {
			t.Errorf("upload method = %s, want PUT (the XML API)", r.Method)
		}
		// An original must never be edge-cached: it is deleted as soon as it
		// has been derived, and a cached copy would outlive the delete in a
		// bucket the public can read.
		if got := r.Header.Get("Cache-Control"); got != "no-store, max-age=0" {
			t.Errorf("Cache-Control = %q, want no-store", got)
		}
		body, _ := io.ReadAll(r.Body)
		// The XML API carries the object name in the path, and the separators
		// must survive: an object named "uploads%2Fsfx%2F…" is not the same
		// object, and nothing downstream would ever find it.
		name := strings.TrimPrefix(r.URL.Path, "/test-bucket/")
		if strings.Contains(name, "%2F") || strings.Contains(name, "%2f") {
			t.Errorf("object path has escaped separators: %q", r.URL.Path)
		}
		*stored = append(*stored, [2]string{name, string(body)})
		fmt.Fprint(w, "{}")
	}))
	t.Cleanup(gcs.Close)
	a.uploads = &uploads{
		bucket:   "test-bucket",
		maxBytes: maxBytes,
		client:   gcs.Client(),
		tokenFor: func() (string, error) { return "test-token", nil },
	}
	// Point the uploader at the stub by rewriting the URL template is not
	// possible without a field, so the stub is addressed through a transport.
	a.uploads.client = &http.Client{Transport: rewriteHost{gcs.URL, gcs.Client().Transport}}

	// A successful upload also records itself in pending-uploads.json, so the
	// GitHub side has to answer too. Without this the handler reaches a nil
	// client and panics — which is what happens when only the failure paths
	// are ever tested.
	gh := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			http.Error(w, `{"message":"Not Found"}`, http.StatusNotFound) // first upload creates it
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"commit": map[string]string{"sha": "new"}})
	}))
	t.Cleanup(gh.Close)
	a.gh = &github{token: "t", repo: "owner/name", branch: "main", client: gh.Client(), base: gh.URL}

	mux := http.NewServeMux()
	a.routes(mux)
	return a, mux
}

// rewriteHost sends storage.googleapis.com to the stub.
type rewriteHost struct {
	base string
	next http.RoundTripper
}

func (rt rewriteHost) RoundTrip(r *http.Request) (*http.Response, error) {
	if strings.Contains(r.URL.Host, "storage.googleapis.com") {
		u := *r.URL
		stub := strings.TrimPrefix(rt.base, "http://")
		u.Host, u.Scheme = stub, "http"
		r = r.Clone(r.Context())
		r.URL = &u
		r.Host = stub
	}
	next := rt.next
	if next == nil {
		next = http.DefaultTransport
	}
	return next.RoundTrip(r)
}

func TestUploadRejectsWhatIsNotAPhotograph(t *testing.T) {
	var stored [][2]string
	a, mux := uploadAdmin(t, &stored, 25<<20)
	_ = a

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, uploadRequest(a, "image", "notes.pdf", []byte("%PDF-1.7 not a photo"), nil))
	if rec.Code != http.StatusBadRequest {
		t.Errorf("a PDF was accepted: %d %s", rec.Code, rec.Body)
	}
	if len(stored) != 0 {
		t.Errorf("a rejected file still reached the bucket: %v", stored)
	}
}

func TestUploadRejectsOversize(t *testing.T) {
	var stored [][2]string
	a, mux := uploadAdmin(t, &stored, 1<<10) // 1KB limit
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, uploadRequest(a, "image", "big.jpg", jpegBytes(4<<10), nil))
	if rec.Code != http.StatusRequestEntityTooLarge && rec.Code != http.StatusBadRequest {
		t.Errorf("an oversize file was accepted: %d %s", rec.Code, rec.Body)
	}
	if len(stored) != 0 {
		t.Errorf("an oversize file reached the bucket: %v", stored)
	}
}

func TestUploadIsRefusedWithoutASession(t *testing.T) {
	var stored [][2]string
	_, mux := uploadAdmin(t, &stored, 25<<20)
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)
	p, _ := w.CreateFormFile("image", "a.jpg")
	p.Write(jpegBytes(16))
	w.Close()
	req := httptest.NewRequest(http.MethodPost, "/admin/images", &buf)
	req.Header.Set("Content-Type", w.FormDataContentType())
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous upload: got %d, want 401", rec.Code)
	}
	if len(stored) != 0 {
		t.Errorf("an anonymous upload reached the bucket: %v", stored)
	}
}

// pending-uploads.json must be writable, and nothing else must have been
// opened up along with it.
func TestPendingListIsWritableAndNothingElseIs(t *testing.T) {
	if !writablePaths[pendingPath] {
		t.Errorf("%s is not writable; uploads cannot be recorded", pendingPath)
	}
	for _, forbidden := range []string{".github/workflows/ci.yml", "src/generated/images.json", "package.json"} {
		if writablePaths[forbidden] {
			t.Errorf("%s became writable", forbidden)
		}
	}
	if len(writablePaths) != 4 {
		keys := make([]string, 0, len(writablePaths))
		for k := range writablePaths {
			keys = append(keys, k)
		}
		t.Errorf("the writable set changed size: %v", keys)
	}
}

func TestPendingEntryShape(t *testing.T) {
	entry := pendingUpload{Object: "uploads/2026/09/a.jpeg", Original: "a.jpg", Bytes: 12, Uploaded: "2026-09-25T00:00:00Z"}
	encoded, err := encodeContent([]pendingUpload{entry}, true)
	if err != nil {
		t.Fatal(err)
	}
	var back []pendingUpload
	if err := json.Unmarshal(encoded, &back); err != nil {
		t.Fatalf("the pending list does not round trip: %v", err)
	}
	if back[0] != entry {
		t.Errorf("round trip changed the entry: %+v vs %+v", back[0], entry)
	}
	// Optional fields stay out when unset, so the file reads as what it is.
	if strings.Contains(string(encoded), `"gallery"`) || strings.Contains(string(encoded), `"alt"`) {
		t.Errorf("empty optional fields were written:\n%s", encoded)
	}
}

// An iPhone shoots HEIC by default, and the pipeline cannot decode it — sharp
// reads the header and then fails on the pixels, because the libvips build has
// no HEVC decoder. Storing one would mean an upload that succeeds and an image
// that never appears.
//
// So it has to be refused, and refused with something useful: falling through
// to "that is not a photograph" would be both wrong and unhelpful to someone
// holding a photograph.
func TestHeicIsRefusedWithAdvice(t *testing.T) {
	heic := append([]byte{0, 0, 0, 0x18}, []byte("ftypheic")...)
	if got := sniffImage(heic); got != "" {
		t.Errorf("HEIC was accepted as %q; the pipeline cannot decode it", got)
	}
	name, advice := sniffUndecodable(heic)
	if name != "HEIC" {
		t.Errorf("HEIC was not recognised: %q", name)
	}
	if !strings.Contains(advice, "Most Compatible") {
		t.Errorf("the advice does not say how to fix it: %q", advice)
	}

	var stored [][2]string
	a, mux := uploadAdmin(t, &stored, 25<<20)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, uploadRequest(a, "image", "IMG_8226.HEIC", heic, nil))
	if rec.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), "HEIC") {
		t.Errorf("the message does not name the format: %s", rec.Body)
	}
	if len(stored) != 0 {
		t.Errorf("a file the pipeline cannot use reached the bucket: %v", stored)
	}
}

// Everything still accepted must be something scripts/images.mjs will actually
// process — its SKIP_EXT is the other half of this contract.
func TestAcceptedFormatsAreOnesThePipelineProcesses(t *testing.T) {
	skipped := map[string]bool{"heic": true, "heif": true, "gif": true, "svg": true}
	for _, m := range imageMagic {
		if skipped[m.name] {
			t.Errorf("%s is accepted at upload but skipped by the image pipeline", m.name)
		}
	}
}

// A photograph with no description cannot be published: alt-check.mjs fails
// the build for a published image without one. Accepting it would store a file
// that can never become an image on the site — the same dead end HEIC was.
func TestUploadRequiresGalleryAndDescription(t *testing.T) {
	for name, fields := range map[string]map[string]string{
		"no gallery":             {"alt": "A prosthetic burn across one cheek"},
		"unknown gallery":        {"gallery": "nonsense", "alt": "A prosthetic burn"},
		"no description":         {"gallery": "sfx"},
		"blank description":      {"gallery": "sfx", "alt": "   "},
		"description too long":   {"gallery": "sfx", "alt": strings.Repeat("x", maxAltLen+1)},
		"newline in description": {"gallery": "sfx", "alt": "one\ntwo"},
	} {
		var stored [][2]string
		a, mux := uploadAdmin(t, &stored, 25<<20)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, uploadRequest(a, "image", "a.jpg", jpegBytes(64), fields))
		if rec.Code != http.StatusBadRequest {
			t.Errorf("%s: got %d, want 400 (%s)", name, rec.Code, rec.Body)
		}
		if len(stored) != 0 {
			t.Errorf("%s: reached the bucket anyway", name)
		}
	}

	// And the good case still works, with the gallery normalised.
	var stored [][2]string
	a, mux := uploadAdmin(t, &stored, 25<<20)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, uploadRequest(a, "image", "burn.jpg", jpegBytes(64),
		map[string]string{"gallery": "SFX", "alt": "A prosthetic burn across one cheek"}))
	if rec.Code != http.StatusOK && rec.Code != http.StatusAccepted {
		t.Fatalf("a complete upload was refused: %d %s", rec.Code, rec.Body)
	}
	if len(stored) != 1 || !strings.HasPrefix(stored[0][0], "uploads/sfx/") {
		t.Errorf("stored at %q, want uploads/sfx/…", stored[0][0])
	}
}

func TestObjectPathEscapesSegmentsNotSeparators(t *testing.T) {
	// The XML API takes the object name as a path. urlEscape is correct for a
	// query parameter and wrong here; this is the difference.
	for _, c := range []struct{ in, want string }{
		{"uploads/film/plain.jpg", "uploads/film/plain.jpg"},
		{"uploads/sfx/20260925T020000-a b.jpg", "uploads/sfx/20260925T020000-a%20b.jpg"},
		{"uploads/sfx/100%-real.jpg", "uploads/sfx/100%25-real.jpg"},
		{"uploads/sfx/a?b#c.jpg", "uploads/sfx/a%3Fb%23c.jpg"},
	} {
		if got := objectPath(c.in); got != c.want {
			t.Errorf("objectPath(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}
