package main

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// seqStub serves the contents API for the counter file alone and records the
// write, so the test can see both the number handed out and the number left
// behind for next time.
type seqStub struct {
	body     []byte
	sha      string
	gotSHA   string
	gotBody  []byte
	conflict bool
	writes   int
}

func (s *seqStub) server(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	const path = "/repos/owner/name/contents/src/content/invoice-seq.json"
	mux.HandleFunc("GET "+path, func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"content":  base64.StdEncoding.EncodeToString(s.body),
			"encoding": "base64",
			"sha":      s.sha,
		})
	})
	mux.HandleFunc("PUT "+path, func(w http.ResponseWriter, r *http.Request) {
		var in struct{ Message, Content, SHA string }
		_ = json.NewDecoder(r.Body).Decode(&in)
		s.gotSHA = in.SHA
		s.gotBody, _ = base64.StdEncoding.DecodeString(in.Content)
		s.writes++
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

func seqAdmin(t *testing.T, s *seqStub) (*adminHandler, *http.ServeMux) {
	t.Helper()
	srv := s.server(t)
	a := testAdmin(t)
	a.gh = &github{token: "test-token", repo: "owner/name", branch: "main", client: srv.Client(), base: srv.URL}
	mux := http.NewServeMux()
	a.routes(mux)
	return a, mux
}

func TestInvoiceNumberIsHandedOutAndAdvanced(t *testing.T) {
	stub := &seqStub{body: []byte(`{"next": 7101599}`), sha: "seq-sha"}
	a, mux := seqAdmin(t, stub)

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, signedInRequest(a, http.MethodPost, "/admin/invoice-number", ""))
	if rec.Code != http.StatusOK {
		t.Fatalf("got %d — %s", rec.Code, rec.Body)
	}
	var out struct{ Number int }
	if err := json.NewDecoder(rec.Body).Decode(&out); err != nil {
		t.Fatalf("response will not parse: %v", err)
	}
	if out.Number != 7101599 {
		t.Errorf("issued %d, want 7101599", out.Number)
	}

	// The counter left behind must be the next one, or the number after this
	// invoice is the same as this invoice.
	got, err := invoiceNumberOf(stub.gotBody)
	if err != nil {
		t.Fatalf("written counter will not parse: %v — %s", err, stub.gotBody)
	}
	if got != 7101600 {
		t.Errorf("counter left at %d, want 7101600", got)
	}
	if stub.gotSHA != "seq-sha" {
		t.Errorf("wrote with sha %q, want the one from the read", stub.gotSHA)
	}
	// Trailing newline, like every other content file this writes.
	if !strings.HasSuffix(string(stub.gotBody), "\n") {
		t.Error("counter written without a trailing newline")
	}
}

// Two requests must never receive the same number. The stub answers the read
// with the same sha both times, which is exactly the race: the second write
// carries a stale sha and GitHub refuses it.
func TestInvoiceNumberRefusesOnAConcurrentWrite(t *testing.T) {
	stub := &seqStub{body: []byte(`{"next": 500}`), sha: "seq-sha", conflict: true}
	a, mux := seqAdmin(t, stub)

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, signedInRequest(a, http.MethodPost, "/admin/invoice-number", ""))
	if rec.Code != http.StatusConflict {
		t.Fatalf("got %d, want 409 so she is told to try again — %s", rec.Code, rec.Body)
	}
}

// A counter that is missing or zero must not quietly restart at 1 and collide
// with the numbers she has already sent by hand.
func TestInvoiceNumberRefusesWithoutAStartingPoint(t *testing.T) {
	for _, body := range []string{`{}`, `{"next": 0}`} {
		stub := &seqStub{body: []byte(body), sha: "seq-sha"}
		a, mux := seqAdmin(t, stub)
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, signedInRequest(a, http.MethodPost, "/admin/invoice-number", ""))
		if rec.Code == http.StatusOK {
			t.Errorf("%s: handed out a number with no starting point", body)
		}
		if stub.writes != 0 {
			t.Errorf("%s: wrote the counter anyway", body)
		}
	}
}

func TestInvoiceNumberNeedsASession(t *testing.T) {
	stub := &seqStub{body: []byte(`{"next": 1}`), sha: "x"}
	_, mux := seqAdmin(t, stub)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/admin/invoice-number", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("got %d, want 401", rec.Code)
	}
}

// The counter is a content file like the others: it must be in writablePaths,
// or every reservation fails at the last step.
func TestInvoiceCounterIsWritable(t *testing.T) {
	if !writablePaths[invoiceSeqPath] {
		t.Errorf("%s is not writable — no number can ever be reserved", invoiceSeqPath)
	}
}
