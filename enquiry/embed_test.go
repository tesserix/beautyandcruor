package main

import (
	"os"
	"path"
	"regexp"
	"strings"
	"testing"
)

// Everything go:embed-ed must be copied by the Dockerfile.
//
// The image build copies this directory file by file — go.mod, *.go,
// admin.html — rather than wholesale, which keeps the context small and the
// layers honest. The cost is that anything newly embedded has to be added
// there too, and forgetting does not fail locally: `go build` reads the files
// off disk, and only the container build reports
//
//	fonts.go:39:12: pattern fonts/*.woff2: no matching files found
//
// which is a long way from the change that caused it. That is what happened
// when the invoice builder embedded its typefaces.
//
// Skipped inside the image build itself, where the Dockerfile is not part of
// the context it describes.
func TestEverythingEmbeddedIsCopiedByTheDockerfile(t *testing.T) {
	dockerfile, err := os.ReadFile("Dockerfile")
	if err != nil {
		t.Skip("no Dockerfile here — this is the image build, which does not copy it")
	}
	sources, err := os.ReadDir(".")
	if err != nil {
		t.Fatal(err)
	}

	embed := regexp.MustCompile(`//go:embed\s+(.+)`)
	var patterns []string
	for _, f := range sources {
		if f.IsDir() || !strings.HasSuffix(f.Name(), ".go") {
			continue
		}
		b, err := os.ReadFile(f.Name())
		if err != nil {
			t.Fatal(err)
		}
		for _, m := range embed.FindAllStringSubmatch(string(b), -1) {
			patterns = append(patterns, strings.Fields(m[1])...)
		}
	}
	if len(patterns) == 0 {
		t.Fatal("found no go:embed patterns — this test is no longer checking anything")
	}

	// Only the COPY directives, never the whole file. Matching the text of
	// the Dockerfile matched the word "fonts" in a comment about the very
	// bug this guards, so removing the COPY line left the test passing.
	var copyLines []string
	for _, line := range strings.Split(string(dockerfile), "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "COPY ") && !strings.Contains(line, "--from=") {
			copyLines = append(copyLines, strings.TrimPrefix(line, "COPY "))
		}
	}
	copied := strings.Join(copyLines, "\n")

	for _, p := range patterns {
		// A directory pattern is satisfied by the directory being copied;
		// a bare file has to be named, or matched by COPY *.go.
		needle := p
		if dir, _ := path.Split(p); dir != "" {
			needle = strings.TrimSuffix(dir, "/")
		}
		if !strings.Contains(copied, needle) {
			t.Errorf("%q is go:embed-ed but the Dockerfile never copies %q — the image build will fail to compile", p, needle)
		}
	}
}
