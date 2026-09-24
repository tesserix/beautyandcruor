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
		"heic":        {append([]byte{0, 0, 0, 0x18}, []byte("ftypheic")...), "heic"},
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
		body, _ := io.ReadAll(r.Body)
		*stored = append(*stored, [2]string{r.URL.Query().Get("name"), string(body)})
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
