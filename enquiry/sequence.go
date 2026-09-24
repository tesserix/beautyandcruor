package main

// Sequence: what the homepage opens on, and what each gallery leads with.
//
// This edits curation.json, which answers a different question from
// galleries.json. Membership — is this image hers to publish — comes from the
// live-site crawl and is not a judgement anyone should be making in a web form.
// Order is entirely judgement, and it is hers.
//
// It writes the file in the form it already has, including the 24 lines of
// commentary under "_note". Those are round-tripped verbatim: they explain to
// the next person why the file exists, and an editor that silently deleted its
// own documentation the first time it saved would be a poor trade.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
)

const (
	curationPath  = "src/content/curation.json"
	galleriesPath = "src/content/galleries.json"
	manifestPath  = "src/generated/images.json"

	maxHero  = 12
	maxLeads = 24
)

// Files the editor may read but must never write. Kept separate from
// writablePaths rather than folded into it: galleries.json is generated and
// the manifest is derived from the image pipeline, so a write to either would
// be overwritten by the next `npm run images` and is a mistake by definition.
var readablePaths = map[string]bool{
	galleriesPath: true,
	manifestPath:  true,
}

// curation mirrors curation.json, in its committed key order.
//
// Note is RawMessage so the commentary survives a round trip untouched — it is
// not ours to reformat. omitempty so a file without one does not gain a null.
type curation struct {
	Note   json.RawMessage `json:"_note,omitempty"`
	Hero   []string        `json:"hero"`
	Leads  leadsMap        `json:"leads"`
	Artist string          `json:"artist,omitempty"`
	Covers coversMap       `json:"covers"`
}

// encoding/json sorts map keys, which would reorder every discipline the first
// time anything was saved and bury a one-line change in a whole-file diff.
// These emit the disciplines in the order src/lib/site.ts declares them — the
// client's stated priority order, which is also the order already in the file.
//
// Anything unrecognised is appended, sorted, rather than dropped: a gallery
// added later should survive a save by someone running an older build.
var (
	galleryOrder = []string{"sfx", "casting", "film", "editorial"}
	coverOrder   = []string{"sfx-prosthetics", "casting-sculpting", "film-television", "editorial-fashion"}
)

type leadsMap map[string][]string

func (m leadsMap) MarshalJSON() ([]byte, error) { return marshalOrdered(m, galleryOrder) }

type coversMap map[string]string

func (m coversMap) MarshalJSON() ([]byte, error) { return marshalOrdered(m, coverOrder) }

// marshalOrdered writes a map with `order` first and the rest sorted after.
func marshalOrdered[V any](m map[string]V, order []string) ([]byte, error) {
	keys := make([]string, 0, len(m))
	seen := map[string]bool{}
	for _, k := range order {
		if _, ok := m[k]; ok {
			keys = append(keys, k)
			seen[k] = true
		}
	}
	rest := make([]string, 0, len(m))
	for k := range m {
		if !seen[k] {
			rest = append(rest, k)
		}
	}
	sort.Strings(rest)
	keys = append(keys, rest...)

	var buf bytes.Buffer
	buf.WriteByte('{')
	for i, k := range keys {
		if i > 0 {
			buf.WriteByte(',')
		}
		name, err := json.Marshal(k)
		if err != nil {
			return nil, err
		}
		buf.Write(name)
		buf.WriteByte(':')
		value, err := json.Marshal(m[k])
		if err != nil {
			return nil, err
		}
		buf.Write(value)
	}
	buf.WriteByte('}')
	return buf.Bytes(), nil
}

// thumb is one image as the picker needs it: the stable identity that goes in
// curation.json, and enough to draw it.
type thumb struct {
	ID     string `json:"id"`
	Src    string `json:"src"`
	Width  int    `json:"w"`
	Height int    `json:"h"`
}

type manifestEntry struct {
	SourcePath string `json:"sourcePath"`
	Src        string `json:"src"`
	WebP       []struct {
		W   int    `json:"w"`
		H   int    `json:"h"`
		Src string `json:"src"`
	} `json:"webp"`
}

// galleryIndex is what the sequence editor needs to draw itself: each gallery's
// images, in membership order, addressed by identity.
type galleryIndex struct {
	Galleries map[string][]thumb `json:"galleries"`
	// ByID lets the client render a curated entry whose gallery it does not
	// know — a cover, or the artist portrait.
	ByID map[string]thumb `json:"byId"`
	// Paths is the manifest's own spelling of each upload, so a newly chosen
	// image is written the way the rest of the file is written rather than as
	// the lowercased identity. Server-side only; the client works in
	// identities and never sees a path.
	Paths map[string]string `json:"-"`
}

// The index is cached for the life of the process, and that is correct rather
// than lazy: the manifest only changes when the image pipeline runs, which
// changes the site image, which rolls the pod this runs in. A stale cache
// therefore cannot outlive the deploy that made it stale.
type indexCache struct {
	once  sync.Once
	index *galleryIndex
	err   error
}

func (a *adminHandler) galleryIndex() (*galleryIndex, error) {
	a.index.once.Do(func() {
		a.index.index, a.index.err = a.buildIndex()
		if a.index.err != nil {
			// Reset, so a failure caused by a blip is retried on the next
			// request rather than cached until the pod restarts.
			a.index.once = sync.Once{}
		}
	})
	return a.index.index, a.index.err
}

func (a *adminHandler) buildIndex() (*galleryIndex, error) {
	rawManifest, _, err := a.gh.readOnly(manifestPath)
	if err != nil {
		return nil, fmt.Errorf("manifest: %w", err)
	}
	var manifest map[string]manifestEntry
	if err := json.Unmarshal(rawManifest, &manifest); err != nil {
		return nil, fmt.Errorf("manifest: %w", err)
	}

	rawGalleries, _, err := a.gh.readOnly(galleriesPath)
	if err != nil {
		return nil, fmt.Errorf("galleries: %w", err)
	}
	var galleries map[string]json.RawMessage
	if err := json.Unmarshal(rawGalleries, &galleries); err != nil {
		return nil, fmt.Errorf("galleries: %w", err)
	}

	idx := &galleryIndex{
		Galleries: map[string][]thumb{},
		ByID:      map[string]thumb{},
		Paths:     map[string]string{},
	}

	// Only images that are in a gallery. The manifest also holds 68 under
	// "unpublished" — work the live WordPress site never showed — and
	// scripts/assets-sync.mjs refuses to upload anything outside the cleared
	// list, so choosing one would not produce a broken image, it would fail
	// the build on the rights gate. Offering her something that cannot be
	// published is the wrong place to enforce that.
	for name, raw := range galleries {
		var keys []string
		if json.Unmarshal(raw, &keys) != nil {
			continue // "covers" is an object, not a list; it is not a gallery
		}
		for _, key := range keys {
			entry, ok := manifest[key]
			if !ok {
				continue
			}
			t := a.thumbFor(entry)
			idx.Galleries[name] = append(idx.Galleries[name], t)
			idx.ByID[t.ID] = t
			idx.Paths[t.ID] = stripExtension(sourceOf(entry))
		}
	}
	return idx, nil
}

func sourceOf(e manifestEntry) string {
	if e.SourcePath != "" {
		return e.SourcePath
	}
	return e.Src
}

func (a *adminHandler) thumbFor(e manifestEntry) thumb {
	t := thumb{ID: identityOf(sourceOf(e))}
	// The smallest derivative that is still legible in a picker. They are
	// emitted smallest-first, so the first is the 400px one.
	for _, v := range e.WebP {
		if v.W >= 400 || t.Src == "" {
			t.Src, t.Width, t.Height = a.assetBase+v.Src, v.W, v.H
			break
		}
	}
	return t
}

// --- handlers ---------------------------------------------------------------

func (a *adminHandler) getSequence(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, false) {
		return
	}
	raw, sha, err := a.gh.read(curationPath)
	if err != nil {
		log.Printf("admin: reading curation: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not load the running order."})
		return
	}
	var c curation
	if err := json.Unmarshal(raw, &c); err != nil {
		log.Printf("admin: curation.json will not parse: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "The running order could not be read."})
		return
	}
	index, err := a.galleryIndex()
	if err != nil {
		log.Printf("admin: building the gallery index: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not load the images."})
		return
	}

	// Identities, so the client compares like with like. The file may hold any
	// of WordPress's several spellings of the same upload.
	writeJSON(w, http.StatusOK, map[string]any{
		"sha":       sha,
		"hero":      identities(c.Hero),
		"leads":     identityLists(c.Leads),
		"covers":    identityMap(c.Covers),
		"artist":    identityOf(c.Artist),
		"galleries": index.Galleries,
		"byId":      index.ByID,
	})
}

type sequenceSave struct {
	SHA    string              `json:"sha"`
	Hero   []string            `json:"hero"`
	Leads  map[string][]string `json:"leads"`
	Covers map[string]string   `json:"covers"`
	Artist string              `json:"artist"`
}

func (a *adminHandler) putSequence(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, true) {
		return
	}
	var save sequenceSave
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxAdminBody)).Decode(&save); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Malformed save."})
		return
	}
	if save.SHA == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Reload before saving."})
		return
	}
	index, err := a.galleryIndex()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not load the images."})
		return
	}
	if problem := validateSequence(save, index); problem != "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": problem})
		return
	}

	// Read again to carry the commentary and the existing spellings forward.
	raw, _, err := a.gh.read(curationPath)
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not load the running order."})
		return
	}
	var existing curation
	if err := json.Unmarshal(raw, &existing); err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "The running order could not be read."})
		return
	}

	spelling := existingSpellings(existing)
	next := curation{
		Note:   existing.Note,
		Hero:   spellAll("hero", save.Hero, spelling, index),
		Leads:  leadsMap{},
		Covers: coversMap{},
		Artist: spell("artist", save.Artist, spelling, index),
	}
	for name, ids := range save.Leads {
		next.Leads[name] = spellAll("leads."+name, ids, spelling, index)
	}
	for slug, id := range save.Covers {
		if id != "" {
			next.Covers[slug] = spell("covers."+slug, id, spelling, index)
		}
	}

	encoded, err := json.MarshalIndent(next, "", "  ")
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not encode the running order."})
		return
	}
	encoded = append(encoded, '\n') // the committed file ends with one

	switch err := a.gh.write(curationPath, encoded, save.SHA, "Update the running order"); {
	case err == nil:
		log.Printf("admin: committed the running order")
		writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
	case err == errConflict:
		writeJSON(w, http.StatusConflict, map[string]string{
			"error": "Someone else saved while you were editing. Reload to get their changes, then make yours again.",
		})
	default:
		log.Printf("admin: committing curation: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "Could not save. Nothing was changed."})
	}
}

// --- spelling ---------------------------------------------------------------
//
// curation.json holds upload paths as whoever wrote them saw them — some with
// WordPress's "-scaled" suffix, some without. They all resolve to the same
// image, so rewriting them would be harmless and would also produce a diff of
// every line the first time she reordered anything. Keeping the existing
// spelling means her first edit reads as her edit.

// spellings remembers how each upload is written, per section.
//
// Per section, not once overall, because the file spells the same upload two
// ways: leads.casting has "2024/04/IMG_3542-scaled" while covers has
// "2024/04/IMG_3542". Both resolve to the same image. Collapsing them to one
// spelling would be a tidy-up she did not ask for, showing up as edits to
// lines she never touched — and a diff you cannot trust to be your own change
// is the thing that stops people using an editor.
type spellings struct {
	bySection map[string]map[string]string
	anywhere  map[string]string
}

func newSpellings() *spellings {
	return &spellings{bySection: map[string]map[string]string{}, anywhere: map[string]string{}}
}

func (s *spellings) remember(section, path string) {
	if path == "" {
		return
	}
	id := identityOf(path)
	if s.bySection[section] == nil {
		s.bySection[section] = map[string]string{}
	}
	s.bySection[section][id] = path
	// First one wins: only a fallback for an entry moved between sections.
	if _, ok := s.anywhere[id]; !ok {
		s.anywhere[id] = path
	}
}

func (s *spellings) lookup(section, id string) (string, bool) {
	if was, ok := s.bySection[section][id]; ok {
		return was, true
	}
	was, ok := s.anywhere[id]
	return was, ok
}

func existingSpellings(c curation) *spellings {
	out := newSpellings()
	for _, p := range c.Hero {
		out.remember("hero", p)
	}
	for gallery, list := range c.Leads {
		for _, p := range list {
			out.remember("leads."+gallery, p)
		}
	}
	for slug, p := range c.Covers {
		out.remember("covers."+slug, p)
	}
	out.remember("artist", c.Artist)
	return out
}

// spell renders one identity as a path for the file: the spelling already
// there, or failing that the manifest's own, stripped of its extension to
// match how the rest of the file is written. The lowercased identity is the
// last resort — it resolves correctly, it just does not look like the file.
func spell(section, id string, existing *spellings, index *galleryIndex) string {
	if id == "" {
		return ""
	}
	if was, ok := existing.lookup(section, id); ok {
		return was
	}
	if path, ok := index.Paths[id]; ok {
		return path
	}
	return id
}

func spellAll(section string, ids []string, existing *spellings, index *galleryIndex) []string {
	out := make([]string, 0, len(ids))
	for _, id := range ids {
		out = append(out, spell(section, id, existing, index))
	}
	return out
}

// --- validation -------------------------------------------------------------

func validateSequence(save sequenceSave, index *galleryIndex) string {
	if len(save.Hero) == 0 {
		return "The homepage needs at least one opening image."
	}
	if len(save.Hero) > maxHero {
		return fmt.Sprintf("That is %d opening images; the limit is %d.", len(save.Hero), maxHero)
	}
	if problem := checkKnown("the homepage", save.Hero, index); problem != "" {
		return problem
	}
	for name, ids := range save.Leads {
		if len(ids) > maxLeads {
			return fmt.Sprintf("%s has %d leading images; the limit is %d.", name, len(ids), maxLeads)
		}
		if problem := checkKnown(name, ids, index); problem != "" {
			return problem
		}
		// A lead that is not in its own gallery silently does nothing: the
		// build filters leads to members before ordering them.
		members := map[string]bool{}
		for _, t := range index.Galleries[name] {
			members[t.ID] = true
		}
		for _, id := range ids {
			if !members[id] {
				return fmt.Sprintf("An image chosen to lead %s is not in that gallery.", name)
			}
		}
	}
	for slug, id := range save.Covers {
		if id == "" {
			continue
		}
		if _, ok := index.ByID[id]; !ok {
			return fmt.Sprintf("The cover chosen for %s is not an image in this build.", slug)
		}
	}
	if save.Artist != "" {
		if _, ok := index.ByID[save.Artist]; !ok {
			return "The portrait chosen is not an image in this build."
		}
	}
	return ""
}

func checkKnown(where string, ids []string, index *galleryIndex) string {
	seen := map[string]bool{}
	for _, id := range ids {
		if seen[id] {
			return fmt.Sprintf("%s lists the same image twice.", where)
		}
		seen[id] = true
		if _, ok := index.ByID[id]; !ok {
			return fmt.Sprintf("%s lists an image that is not in this build.", where)
		}
	}
	return ""
}

// --- helpers ----------------------------------------------------------------

func identities(paths []string) []string {
	out := make([]string, 0, len(paths))
	for _, p := range paths {
		out = append(out, identityOf(p))
	}
	return out
}

func identityLists(in leadsMap) map[string][]string {
	out := map[string][]string{}
	for k, v := range in {
		out[k] = identities(v)
	}
	return out
}

func identityMap(in coversMap) map[string]string {
	out := map[string]string{}
	keys := make([]string, 0, len(in))
	for k := range in {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		out[k] = identityOf(in[k])
	}
	return out
}

// identityOf is the Go half of src/lib/identity.mjs. The two must agree: this
// writes the paths that file resolves at build time.
//
// It strips a known image extension rather than everything after the last dot,
// because WhatsApp exports carry dots in the stem — the bug that left two
// curated film leads silently unresolvable.
func identityOf(path string) string {
	if path == "" {
		return ""
	}
	dir, file := "", path
	if i := strings.LastIndex(path, "/"); i >= 0 {
		dir, file = path[:i], path[i+1:]
	}
	for _, ext := range []string{".jpeg", ".jpg", ".png", ".webp", ".avif", ".gif", ".tiff", ".tif", ".heic", ".heif", ".bmp"} {
		if len(file) > len(ext) && strings.EqualFold(file[len(file)-len(ext):], ext) {
			file = file[:len(file)-len(ext)]
			break
		}
	}
	file = trimDimensions(file)
	// One suffix, matching identity.mjs's single alternation — not a loop that
	// would strip both from a "-rotated-scaled" name where the JS strips one.
	for _, suffix := range []string{"-scaled", "-rotated"} {
		if strings.HasSuffix(file, suffix) {
			file = file[:len(file)-len(suffix)]
			break
		}
	}
	if dir == "" {
		return "./" + strings.ToLower(file)
	}
	return dir + "/" + strings.ToLower(file)
}

// trimDimensions removes a trailing "-1024x768" produced by WordPress.
func trimDimensions(file string) string {
	i := strings.LastIndex(file, "-")
	if i < 0 {
		return file
	}
	rest := file[i+1:]
	x := strings.Index(rest, "x")
	if x <= 0 || x == len(rest)-1 {
		return file
	}
	if allDigits(rest[:x]) && allDigits(rest[x+1:]) {
		return file[:i]
	}
	return file
}

// stripExtension removes a known image extension and nothing else. curation.json
// writes paths without one.
func stripExtension(path string) string {
	for _, ext := range []string{".jpeg", ".jpg", ".png", ".webp", ".avif", ".gif", ".tiff", ".tif", ".heic", ".heif", ".bmp"} {
		if len(path) > len(ext) && strings.EqualFold(path[len(path)-len(ext):], ext) {
			return path[:len(path)-len(ext)]
		}
	}
	return path
}
