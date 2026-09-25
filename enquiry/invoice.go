package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// The invoice number counter.
//
// # WHY THIS IS THE ONLY PART OF THE INVOICE THAT IS STORED
//
// The invoice builder is otherwise entirely in the browser: the client, the
// line items and the amounts exist in the PDF she saves and nowhere else, and
// her own details sit in localStorage on her machine. That is deliberate —
// this repository is public, and a PAN or a bank account committed to it would
// be permanent and world-readable. Making the repository private later does
// not undo that: the history is kept, and so are forks and mirrors.
//
// A number discloses none of it. It is stored because it is the one thing that
// cannot live in one browser: she invoices from a laptop and a phone, and two
// devices with two local counters will eventually issue the same number twice.
const invoiceSeqPath = "src/content/invoice-seq.json"

type invoiceSeq struct {
	Next int `json:"next"`
}

// reserveInvoiceNumber hands out the next number and writes the one after it
// back, so a number is never issued twice.
//
// The write carries the sha from the read, which is what makes this safe to
// call from two places at once: if anything committed in between, GitHub
// refuses and the caller is told to try again rather than both callers
// receiving the same number.
func (a *adminHandler) reserveInvoiceNumber() (int, error) {
	raw, sha, err := a.gh.read(invoiceSeqPath)
	if err != nil {
		return 0, err
	}
	var seq invoiceSeq
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &seq); err != nil {
			return 0, fmt.Errorf("the invoice counter will not parse: %w", err)
		}
	}
	if seq.Next <= 0 {
		// A missing or zeroed counter is not a reason to start at 1 and
		// collide with numbers she has already sent by hand.
		return 0, errors.New("the invoice counter has no starting number")
	}
	issued := seq.Next
	encoded, err := encodeContent(invoiceSeq{Next: issued + 1}, true)
	if err != nil {
		return 0, err
	}
	if err := a.gh.write(invoiceSeqPath, encoded, sha,
		fmt.Sprintf("Reserve invoice number %d", issued)); err != nil {
		return 0, err
	}
	return issued, nil
}

// postInvoiceNumber reserves a number for an invoice about to be written.
//
// It is a POST because it is not idempotent: every call consumes a number.
// Numbers can therefore be skipped — an abandoned draft burns one — which is
// the right trade. A gap in a sequence is a question someone might ask; the
// same number on two invoices is a problem in her books.
func (a *adminHandler) postInvoiceNumber(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, true) {
		return
	}
	n, err := a.reserveInvoiceNumber()
	if err != nil {
		if errors.Is(err, errConflict) {
			writeJSON(w, http.StatusConflict, map[string]string{
				"error": "Someone took a number at the same moment. Try again."})
			return
		}
		log.Printf("admin: reserving an invoice number: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{
			"error": "Could not reserve a number. Type one in by hand and carry on."})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"number": n})
}

// invoiceNumberOf is used only by the tests, to read a counter back without
// reaching into the JSON shape from three places.
func invoiceNumberOf(raw []byte) (int, error) {
	t := strings.TrimSpace(string(raw))
	var seq invoiceSeq
	if err := json.Unmarshal([]byte(t), &seq); err != nil {
		return 0, err
	}
	if seq.Next == 0 {
		return strconv.Atoi(t)
	}
	return seq.Next, nil
}
