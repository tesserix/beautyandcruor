package main

// Image upload: the original goes to a private bucket, and nothing else
// happens yet.
//
// WHY THE ORIGINAL AND NOT THE IMAGE
//
// The site never serves an original. scripts/images.mjs turns one photograph
// into seven widths in AVIF and WebP, a JPEG fallback and a 24px blur
// placeholder, and writes the manifest the pages actually read. A file dropped
// anywhere else is an image the site cannot render.
//
// That derivation is minutes of CPU per photograph and needs libvips, which
// this binary — a static Go program on `scratch` — does not have and should
// not grow. So this endpoint does the half it can do safely and quickly:
// accept the file, check it is what it claims to be, and put it somewhere
// durable and private. Deriving and publishing is a separate step.
//
// That split is not only a technical convenience. An uploaded photograph still
// needs alt text and a gallery, and docs/OPEN-QUESTIONS.md Q7/Q8 record that
// the library mixes work she published with photographs of other people whose
// releases are unresolved. Publishing on upload would skip both.
//
// WHERE IT GOES, AND WHAT STOPS IT GOING ANYWHERE ELSE
//
// One bucket, the same one that serves the site, under an uploads/ prefix.
// That prefix is not a convention anyone has to remember: the identity this
// runs as holds objectCreator with an IAM CONDITION restricting it to
// resource names starting uploads/, so it cannot write img/ — the derivatives
// the site actually serves — at all.
//
// objectCreator and not objectAdmin, so it cannot read an object back,
// overwrite one, or delete one either. An upload can add to the pile and can
// never alter what is already published.
//
// The bucket is world-READABLE but not world-LISTABLE: allUsers holds
// legacyObjectReader, which grants storage.objects.get and not
// storage.objects.list, so an anonymous caller who knows an exact object name
// can fetch it and one who does not cannot enumerate anything. An upload is
// therefore not secret. It is also not discoverable, and the only person who
// can put anything there is whoever holds the admin password.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const (
	metadataTokenURL = "http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token"
	gcsUploadURL     = "https://storage.googleapis.com/upload/storage/v1/b/%s/o?uploadType=media&name=%s"
	pendingPath      = "src/content/pending-uploads.json"

	defaultMaxUpload = 25 << 20
	maxUploadsPerDay = 200
)

// pendingUpload is one row of pending-uploads.json: what arrived, where it
// went, and what she said it is.
type pendingUpload struct {
	Object   string `json:"object"`
	Original string `json:"originalName"`
	Gallery  string `json:"gallery,omitempty"`
	Alt      string `json:"alt,omitempty"`
	Bytes    int    `json:"bytes"`
	Uploaded string `json:"uploadedAt"`
}

type uploads struct {
	bucket   string
	maxBytes int64
	client   *http.Client
	// tokenFor is swappable so tests do not need a metadata server.
	tokenFor func() (string, error)
}

// Magic bytes, because a Content-Type header is whatever the client typed. The
// point is not to catch a determined attacker — the endpoint is behind a
// password — but to stop a file being stored that nothing downstream can use.
//
// # WHY HEIC IS NOT HERE, THOUGH AN iPHONE SHOOTS IT BY DEFAULT
//
// The pipeline cannot read it. sharp reports the format and the dimensions —
// metadata works — and then fails on the pixels with "bad seek", because the
// libvips build has libheif but no HEVC decoder; HEVC is patent-encumbered and
// routinely left out. scripts/images.mjs has skipped .heic and .heif from the
// start for the same reason, and the two HEIC files in the recovered library
// were converted to JPEG by hand before they ever reached it.
//
// Accepting one would store a file that can never become an image on the site:
// the upload would succeed, and nothing would ever appear. A refusal that says
// what to do is better than a silent dead end.
//
// In practice iOS usually transcodes to JPEG when a photo is chosen through a
// file input, so this should rarely be seen. "Usually" is not a reason to
// leave the trapdoor open.
//
// To support it properly the derive step needs a decoder — ImageMagick built
// against libheif, or heif-convert — and someone has to verify that on the
// runner rather than assume it.
var imageMagic = []struct {
	name   string
	prefix []byte
	at     int
}{
	{"jpeg", []byte{0xFF, 0xD8, 0xFF}, 0},
	{"png", []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, 0},
	{"webp", []byte("WEBP"), 8},
	{"avif", []byte("ftypavif"), 4},
}

// Recognised, and refused with a reason. Without this an iPhone photograph
// would fall through to "that is not a photograph", which is both wrong and
// unhelpful.
var undecodable = []struct {
	name   string
	prefix []byte
	at     int
	advice string
}{
	{"HEIC", []byte("ftyphei"), 4, "iPhone photos are HEIC unless you change a setting. In Settings → Camera → Formats, choose “Most Compatible”, or send the photo to yourself first — that converts it to JPEG."},
	{"HEIF", []byte("ftypmif"), 4, "That is a HEIF file. Save or export it as JPEG and upload that."},
}

// sniffUndecodable names a format we recognise but cannot process, with
// something useful to do about it.
func sniffUndecodable(head []byte) (string, string) {
	for _, m := range undecodable {
		end := m.at + len(m.prefix)
		if len(head) >= end && bytes.Equal(head[m.at:end], m.prefix) {
			return m.name, m.advice
		}
	}
	return "", ""
}

func sniffImage(head []byte) string {
	for _, m := range imageMagic {
		end := m.at + len(m.prefix)
		if len(head) >= end && bytes.Equal(head[m.at:end], m.prefix) {
			return m.name
		}
	}
	return ""
}

// Dots are unsafe here too, not just slashes: a filename of "..." would
// otherwise survive into the object name. GCS has no path resolution, so it is
// not traversal — but a name containing ".." invites someone downstream to
// treat it as one.
var unsafeName = regexp.MustCompile(`[^a-zA-Z0-9_-]+`)

// objectName is where the upload lands.
//
// GALLERY FIRST, not year/month. `2022/09/` is WordPress's filing system, and
// it is in this project only because that is how the recovered library
// arrived. Our own structure is by discipline — the published derivatives are
// already img/sfx/, img/casting/, img/film/, img/editorial/ — and new uploads
// follow it rather than perpetuating someone else's.
//
// "unsorted" when she has not said which, because guessing would be worse
// than admitting it is unfiled.
//
// Her filename is kept, because it is often the only description of the
// photograph that exists, but it is sanitised and timestamped so two files
// called IMG_0001.jpg cannot collide and nothing can escape the prefix.
func objectName(now time.Time, original, kind, gallery string) string {
	stem := strings.TrimSuffix(path.Base(original), path.Ext(original))
	stem = strings.Trim(unsafeName.ReplaceAllString(stem, "-"), "-_")
	if len(stem) > 60 {
		stem = stem[:60]
	}
	if stem == "" {
		stem = "upload"
	}
	return fmt.Sprintf("uploads/%s/%s-%s.%s",
		galleryFolder(gallery), now.UTC().Format("20060102T150405"), stem, kind)
}

// galleryFolder maps what she typed to one of the four disciplines, or
// "unsorted". Anything unrecognised is unsorted rather than a new folder
// invented from a typo.
func galleryFolder(gallery string) string {
	switch strings.ToLower(strings.TrimSpace(gallery)) {
	case "sfx", "sfx-prosthetics", "prosthetics":
		return "sfx"
	case "casting", "casting-sculpting", "sculpting":
		return "casting"
	case "film", "film-television", "film-tv", "tv":
		return "film"
	case "editorial", "editorial-fashion", "fashion":
		return "editorial"
	default:
		return "unsorted"
	}
}

// metadataToken asks the GKE metadata server for this pod's access token.
//
// Under Workload Identity that is a token for the pod's own service account —
// one that may create objects in a single private bucket — not the node's
// credentials. The NetworkPolicy opens 169.254.169.254 only when uploads are
// enabled.
func metadataToken(client *http.Client) (string, error) {
	req, err := http.NewRequest(http.MethodGet, metadataTokenURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Metadata-Flavor", "Google")
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("metadata server: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("metadata server: %s", resp.Status)
	}
	var token struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(io.LimitReader(resp.Body, 8<<10)).Decode(&token); err != nil {
		return "", err
	}
	if token.AccessToken == "" {
		return "", fmt.Errorf("metadata server returned no token")
	}
	return token.AccessToken, nil
}

// put stores the bytes. No overwrite is possible: the identity holds
// objectCreator and not objectAdmin, so a repeated name is refused by GCS
// rather than silently replacing what is there.
func (u *uploads) put(object string, body []byte, contentType string) error {
	token, err := u.tokenFor()
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost,
		fmt.Sprintf(gcsUploadURL, u.bucket, urlEscape(object)), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", contentType)
	req.ContentLength = int64(len(body))

	resp, err := u.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("storing %s: %s", object, statusDetail(resp))
	}
	return nil
}

func urlEscape(s string) string {
	return strings.ReplaceAll(strings.ReplaceAll(s, "%", "%25"), "/", "%2F")
}

// --- handler ----------------------------------------------------------------

func (a *adminHandler) postImage(w http.ResponseWriter, r *http.Request) {
	if !a.guard(w, r, true) {
		return
	}
	if a.uploads == nil {
		writeJSON(w, http.StatusNotImplemented, map[string]string{"error": "Image upload is not switched on."})
		return
	}
	max := a.uploads.maxBytes
	r.Body = http.MaxBytesReader(w, r.Body, max+(1<<20)) // room for the form envelope
	if err := r.ParseMultipartForm(8 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": fmt.Sprintf("That file is too large. The limit is %d MB.", max>>20)})
		return
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "No image was attached."})
		return
	}
	defer file.Close()

	body, err := io.ReadAll(io.LimitReader(file, max+1))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "That file could not be read."})
		return
	}
	if int64(len(body)) > max {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]string{
			"error": fmt.Sprintf("That file is %d MB; the limit is %d MB.", len(body)>>20, max>>20)})
		return
	}
	kind := sniffImage(body)
	if kind == "" {
		if name, advice := sniffUndecodable(body); name != "" {
			log.Printf("admin: refused a %s upload from %s", name, clientIP(r))
			writeJSON(w, http.StatusBadRequest, map[string]string{
				"error": fmt.Sprintf("%s images cannot be published yet. %s", name, advice)})
			return
		}
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "That is not a photograph. JPEG, PNG, WebP and AVIF are accepted."})
		return
	}

	now := time.Now()
	object := objectName(now, header.Filename, kind, r.FormValue("gallery"))
	if err := a.uploads.put(object, body, "image/"+kind); err != nil {
		log.Printf("admin: storing upload: %v", err)
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": "The upload did not save. Nothing was stored."})
		return
	}

	entry := pendingUpload{
		Object:   object,
		Original: header.Filename,
		Gallery:  strings.TrimSpace(r.FormValue("gallery")),
		Alt:      strings.TrimSpace(r.FormValue("alt")),
		Bytes:    len(body),
		Uploaded: now.UTC().Format(time.RFC3339),
	}
	if err := a.recordUpload(entry); err != nil {
		// The file is safe; only the note failed. Say so rather than implying
		// the upload was lost, and log the object so it can be picked up by
		// hand.
		log.Printf("admin: stored %s but could not record it: %v", object, err)
		writeJSON(w, http.StatusAccepted, map[string]string{
			"status":  "stored",
			"warning": "Saved, but it could not be added to the list to publish. Tell whoever looks after the site.",
			"object":  object,
		})
		return
	}
	log.Printf("admin: stored upload %s (%d bytes)", object, len(body))
	writeJSON(w, http.StatusOK, map[string]any{"status": "uploaded", "object": object})
}

// recordUpload appends to pending-uploads.json, so that publishing has a list
// to work from rather than having to diff a bucket against a manifest.
func (a *adminHandler) recordUpload(entry pendingUpload) error {
	raw, sha, err := a.gh.read(pendingPath)
	var list []pendingUpload
	switch {
	case err == nil:
		if err := json.Unmarshal(raw, &list); err != nil {
			return fmt.Errorf("pending list will not parse: %w", err)
		}
	default:
		// Not there yet: the first upload creates it. sha stays empty, which
		// is how the contents API is told to create rather than replace.
		sha = ""
	}
	if len(list) >= maxUploadsPerDay {
		return fmt.Errorf("pending list is full (%d)", len(list))
	}
	list = append(list, entry)

	encoded, err := encodeContent(list, true)
	if err != nil {
		return err
	}
	return a.gh.write(pendingPath, encoded, sha,
		fmt.Sprintf("Upload %s", path.Base(entry.Object)))
}

// uploadsFromEnv builds the uploader, or nil when the feature is off.
func uploadsFromEnv(client *http.Client) *uploads {
	bucket := secretEnv("ADMIN_ORIGINALS_BUCKET")
	if bucket == "" {
		return nil
	}
	max := int64(defaultMaxUpload)
	if s := secretEnv("ADMIN_UPLOAD_MAX_BYTES"); s != "" {
		if n, err := strconv.ParseInt(s, 10, 64); err == nil && n > 0 {
			max = n
		} else {
			log.Printf("enquiry: ADMIN_UPLOAD_MAX_BYTES=%q is not a byte count; using %d", s, max)
		}
	}
	u := &uploads{bucket: bucket, maxBytes: max, client: client}
	u.tokenFor = func() (string, error) { return metadataToken(client) }
	return u
}
