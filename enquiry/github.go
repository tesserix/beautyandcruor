package main

// The GitHub contents API, just enough of it to read a JSON file and commit a
// new version.
//
// WHY A COMMIT AND NOT A DATABASE
//
// The site is a static export: content becomes a page at build time, so the
// only way an edit reaches a visitor is a build, and the only thing that
// triggers a build is a commit. A database would need a second mechanism to
// turn a row into a deploy. A commit already has one — CI builds, advances
// `deploy`, and Kargo promotes it. An edit here ships the same way a developer's
// does, through the same review-less-but-audited path, and `git log` is the
// edit history without anyone building an edit history.
//
// THE PATH IS NOT AN INPUT.
//
// Same rule as ENQUIRY_TO in main.go, for the same reason. A request says what
// the new content is, never where it goes: writablePaths is the whole list, it
// is checked against a fixed set, and a path that is not in it is rejected
// before any call is made. Without that, a token with contents:write on this
// repository would let a logged-in session rewrite the workflow that deploys it.

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	githubAPI     = "https://api.github.com"
	githubTimeout = 20 * time.Second
	// The generated image manifest is the big one at ~350KB. The contents API
	// itself stops serving files over 1MB, so this is the smaller ceiling and
	// the one worth reporting against.
	maxContentSize = 900 << 10
)

// The only files this service may ever write. Adding one is a code change,
// reviewed, not a configuration value someone can widen by accident.
var writablePaths = map[string]bool{
	"src/content/credits.json":         true,
	"src/content/curation.json":        true,
	"src/content/alt.json":             true,
	"src/content/pending-uploads.json": true,
	"src/content/invoice-seq.json":     true,
}

// errConflict means the file moved under us — someone committed between the
// read and the write.
var errConflict = errors.New("the file changed since it was loaded")

type github struct {
	token  string
	repo   string // "owner/name"
	branch string
	client *http.Client
	// base overrides the API root. Empty means api.github.com; tests point it
	// at a stub so the commit path is exercised without a network or a token.
	base string
}

func (g *github) root() string {
	if g.base != "" {
		return g.base
	}
	return githubAPI
}

type ghFile struct {
	Content  string `json:"content"`
	Encoding string `json:"encoding"`
	SHA      string `json:"sha"`
}

func (g *github) request(method, path string, body any) (*http.Response, error) {
	var buf io.Reader
	if body != nil {
		encoded, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		buf = bytes.NewReader(encoded)
	}
	req, err := http.NewRequest(method, g.root()+path, buf)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+g.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	return g.client.Do(req)
}

// read returns a content file's bytes and the blob sha needed to write it back.
func (g *github) read(path string) ([]byte, string, error) {
	if !writablePaths[path] {
		return nil, "", fmt.Errorf("refusing to read %q: not a content file", path)
	}
	return g.fetch(path)
}

// readOnly fetches a file the editor needs to show but must never write — the
// generated manifest and the gallery membership. Kept as a separate entry
// point so that widening what can be read cannot widen what can be written.
func (g *github) readOnly(path string) ([]byte, string, error) {
	if !readablePaths[path] {
		return nil, "", fmt.Errorf("refusing to read %q: not a readable file", path)
	}
	return g.fetch(path)
}

func (g *github) fetch(path string) ([]byte, string, error) {
	resp, err := g.request(http.MethodGet,
		fmt.Sprintf("/repos/%s/contents/%s?ref=%s", g.repo, path, g.branch), nil)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, "", fmt.Errorf("github read %s: %s", path, statusDetail(resp))
	}

	var file ghFile
	if err := json.NewDecoder(io.LimitReader(resp.Body, maxContentSize)).Decode(&file); err != nil {
		return nil, "", err
	}
	if file.Encoding != "base64" {
		return nil, "", fmt.Errorf("github read %s: unexpected encoding %q", path, file.Encoding)
	}
	// The API wraps base64 at 60 columns, which the strict decoder rejects.
	decoded, err := base64.StdEncoding.DecodeString(strings.ReplaceAll(file.Content, "\n", ""))
	if err != nil {
		return nil, "", fmt.Errorf("github read %s: %w", path, err)
	}
	return decoded, file.SHA, nil
}

// write commits new content over the blob identified by sha.
//
// Passing the sha is what makes this safe to do from a form: GitHub rejects the
// write if the file has moved since it was read, so two people editing at once
// produces a refusal rather than one of them silently losing their work.
func (g *github) write(path string, content []byte, sha, message string) error {
	if !writablePaths[path] {
		return fmt.Errorf("refusing to write %q: not a content file", path)
	}
	if len(content) > maxContentSize {
		return fmt.Errorf("refusing to write %d bytes to %s", len(content), path)
	}
	resp, err := g.request(http.MethodPut,
		fmt.Sprintf("/repos/%s/contents/%s", g.repo, path),
		map[string]any{
			"message": message,
			"content": base64.StdEncoding.EncodeToString(content),
			"sha":     sha,
			"branch":  g.branch,
		})
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		return nil
	case http.StatusConflict, http.StatusUnprocessableEntity:
		return errConflict
	default:
		return fmt.Errorf("github write %s: %s", path, statusDetail(resp))
	}
}

// statusDetail renders a failed response without letting a long or unexpected
// body into the log wholesale.
func statusDetail(resp *http.Response) string {
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
	detail := strings.TrimSpace(string(body))
	var parsed struct {
		Message string `json:"message"`
	}
	if json.Unmarshal(body, &parsed) == nil && parsed.Message != "" {
		detail = parsed.Message
	}
	return fmt.Sprintf("%s (%s)", resp.Status, detail)
}
