package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// identityOf must agree with src/lib/identity.mjs: this service writes the
// paths that module resolves at build time, so a disagreement means a curated
// choice silently does nothing.
//
// Every case below was produced by running identity.mjs itself. The full
// cross-check — all 280 manifest paths plus every path in curation.json, 313
// in total — passed with zero mismatches; these are the shapes worth keeping
// in front of anyone who edits either side.
func TestIdentityMatchesTheJavaScript(t *testing.T) {
	for input, want := range map[string]string{
		// The bug that started all this: dots in the stem. Stripping
		// everything after the last dot ate "-AM" and the path matched nothing.
		"2022/09/WhatsApp-Image-2019-06-29-at-1.41.08-AM.jpeg": "2022/09/whatsapp-image-2019-06-29-at-1.41.08-am",
		"2022/09/WhatsApp-Image-2019-06-29-at-1.41.08-AM":      "2022/09/whatsapp-image-2019-06-29-at-1.41.08-am",

		// WordPress's several names for one upload.
		"2024/11/IMG_2489.jpg":        "2024/11/img_2489",
		"2024/11/IMG_2489-scaled":     "2024/11/img_2489",
		"2024/11/IMG_2489-scaled.jpg": "2024/11/img_2489",
		"2024/11/IMG_2489-1024x768":   "2024/11/img_2489",
		"2024/11/IMG_2489-rotated":    "2024/11/img_2489",

		// Case folds; the extension match is case-insensitive too.
		"a/b/UPPER.PNG": "a/b/upper",

		// One suffix is stripped, not both — matching the JS alternation.
		"a/b/x-rotated-scaled.png": "a/b/x-rotated",

		// Things that are not dimensions must survive.
		"a/b/mix-2x":     "a/b/mix-2x",
		"a/b/plain-name": "a/b/plain-name",
		"a/b/no-ext":     "a/b/no-ext",

		"noslash.jpg": "./noslash",
		"":            "",
	} {
		if got := identityOf(input); got != want {
			t.Errorf("identityOf(%q) = %q, want %q", input, got, want)
		}
	}
}

func testIndex() *galleryIndex {
	idx := &galleryIndex{
		Galleries: map[string][]thumb{},
		ByID:      map[string]thumb{},
		Paths:     map[string]string{},
	}
	add := func(gallery, id, path string) {
		t := thumb{ID: id, Src: "https://assets.example/" + id + ".webp", Width: 400, Height: 500}
		idx.ByID[id] = t
		idx.Paths[id] = path
		if gallery != "" {
			idx.Galleries[gallery] = append(idx.Galleries[gallery], t)
		}
	}
	add("sfx", "2025/02/img_4654", "2025/02/IMG_4654")
	add("sfx", "2025/02/img_4652", "2025/02/IMG_4652")
	add("casting", "2024/04/img_3542", "2024/04/IMG_3542")
	add("", "2024/11/img_2489", "2024/11/IMG_2489")
	return idx
}

func TestValidateSequence(t *testing.T) {
	idx := testIndex()
	good := sequenceSave{
		SHA:    "sha",
		Hero:   []string{"2025/02/img_4654"},
		Leads:  map[string][]string{"sfx": {"2025/02/img_4652"}},
		Covers: map[string]string{"sfx-prosthetics": "2025/02/img_4654"},
		Artist: "2024/11/img_2489",
	}
	if got := validateSequence(good, idx); got != "" {
		t.Fatalf("a valid running order was rejected: %s", got)
	}

	empty := good
	empty.Hero = nil
	unknown := good
	unknown.Hero = []string{"2099/01/not_in_this_build"}
	dupe := good
	dupe.Hero = []string{"2025/02/img_4654", "2025/02/img_4654"}
	// The one that matters: the build filters leads to gallery members before
	// ordering them, so a lead from the wrong gallery silently does nothing.
	wrongGallery := good
	wrongGallery.Leads = map[string][]string{"sfx": {"2024/04/img_3542"}}
	badCover := good
	badCover.Covers = map[string]string{"sfx-prosthetics": "2099/01/nope"}
	badArtist := good
	badArtist.Artist = "2099/01/nope"

	for name, save := range map[string]sequenceSave{
		"no hero":                   empty,
		"hero not in build":         unknown,
		"hero listed twice":         dupe,
		"lead in the wrong gallery": wrongGallery,
		"cover not in build":        badCover,
		"portrait not in build":     badArtist,
	} {
		if validateSequence(save, idx) == "" {
			t.Errorf("%s was accepted", name)
		}
	}

	over := good
	for i := 0; i <= maxHero; i++ {
		over.Hero = append(over.Hero, "2025/02/img_4654")
	}
	if validateSequence(over, idx) == "" {
		t.Error("an over-long hero was accepted")
	}
}

// An unchanged entry keeps the spelling already in the file, so her first
// reorder does not rewrite every line of it.
func TestSpellingIsPreserved(t *testing.T) {
	idx := testIndex()

	// The real file spells one upload two ways — "-scaled" in leads, plain in
	// covers. Each section has to keep its own, or a save edits lines she
	// never touched.
	c := curation{
		Leads:  leadsMap{"casting": {"2024/04/IMG_3542-scaled"}},
		Covers: coversMap{"casting-sculpting": "2024/04/IMG_3542"},
		Hero:   []string{"2025/02/IMG_4654"},
	}
	existing := existingSpellings(c)

	if got := spell("leads.casting", "2024/04/img_3542", existing, idx); got != "2024/04/IMG_3542-scaled" {
		t.Errorf("leads spelling: got %q, want the -scaled form it already had", got)
	}
	if got := spell("covers.casting-sculpting", "2024/04/img_3542", existing, idx); got != "2024/04/IMG_3542" {
		t.Errorf("covers spelling: got %q, want the plain form it already had", got)
	}
	if got := spell("hero", "2025/02/img_4654", existing, idx); got != "2025/02/IMG_4654" {
		t.Errorf("hero spelling not kept: %q", got)
	}
	// Moved into a section that has never held it: fall back to how it is
	// written elsewhere in the file rather than inventing a spelling.
	if got := spell("hero", "2024/04/img_3542", existing, idx); got != "2024/04/IMG_3542-scaled" {
		t.Errorf("cross-section fallback: got %q", got)
	}
	// Never seen at all: the manifest's own form, not the lowercased identity.
	if got := spell("hero", "2025/02/img_4652", existing, idx); got != "2025/02/IMG_4652" {
		t.Errorf("new entry spelled %q, want the manifest's form", got)
	}
	if got := spell("hero", "", existing, idx); got != "" {
		t.Errorf("empty id produced %q", got)
	}
}

// The commentary at the top of curation.json explains why the file exists. An
// editor that deleted it on first save would be a poor trade.
func TestCurationCommentarySurvivesARoundTrip(t *testing.T) {
	const original = `{
  "_note": [
    "Human curation: which images lead each gallery.",
    "Keyed by ORIGINAL upload path, not by manifest key."
  ],
  "hero": [
    "2025/02/IMG_4654"
  ],
  "leads": {
    "sfx": [
      "2025/02/IMG_4652"
    ]
  },
  "artist": "2024/11/IMG_2489",
  "covers": {
    "sfx-prosthetics": "2025/02/IMG_4654"
  }
}
`
	var c curation
	if err := json.Unmarshal([]byte(original), &c); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	encoded, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	encoded = append(encoded, '\n')
	if string(encoded) != original {
		t.Errorf("a round trip changed the file.\n--- got ---\n%s\n--- want ---\n%s", encoded, original)
	}
}

func TestSequenceWritesAreGuarded(t *testing.T) {
	a := testAdmin(t)
	mux := http.NewServeMux()
	a.routes(mux)

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/admin/sequence", nil))
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("anonymous GET: got %d, want 401", rec.Code)
	}

	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/admin/sequence", strings.NewReader("{}"))
	req.AddCookie(&http.Cookie{Name: sessionCookie, Value: a.sessions.issue(time.Now())})
	mux.ServeHTTP(rec, req)
	if rec.Code != http.StatusForbidden {
		t.Errorf("signed in without CSRF: got %d, want 403", rec.Code)
	}
}

// Generated files are readable so the pickers can draw, and must stay
// unwritable: the next `npm run images` would overwrite anything put there.
func TestGeneratedFilesAreReadableButNotWritable(t *testing.T) {
	g := &github{repo: "owner/name", branch: "main", client: http.DefaultClient}
	for _, path := range []string{manifestPath, galleriesPath} {
		if !readablePaths[path] {
			t.Errorf("%s is not readable — the sequence editor cannot draw", path)
		}
		if writablePaths[path] {
			t.Errorf("%s is writable; it is generated and would be clobbered", path)
		}
		if err := g.write(path, []byte("{}"), "sha", "msg"); err == nil {
			t.Errorf("write %q was permitted", path)
		}
	}
}
