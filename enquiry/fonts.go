package main

import (
	"embed"
	"net/http"
	"strings"
)

// The two faces the invoice is set in.
//
// WHY THEY ARE HERE AND NOT IN public/
//
// The admin is the only thing that uses them. Putting them in public/ would
// ship them to every visitor of a site that already serves the same bytes
// under its own hashed paths, for a document none of those visitors will
// ever see.
//
// # WHY THEY ARE COPIED AT ALL
//
// next/font self-hosts these under names like
// 8375abd741af9b6b-s.p.2ac2soo5sf2jq.woff2, and that hash changes whenever
// the font or the build does. A stable copy is the only way this page can
// reference them without breaking silently on some later rebuild.
//
// Eczar and IBM Plex Mono are the Latin subsets next/font generated, taken
// from the build output; Eczar is one variable file covering every weight the
// site uses. signature.woff2 is Parisienne, which the site does not use — it
// sets her name where a signature would go, so the document is not blank in
// that corner until she uploads an image of her own.
//
// All three are under the SIL Open Font License, which permits this outright —
// the same reason the wordmark could be outlined.
//
// If the site's typography ever changes, these are refreshed by hand from
// out/_next/static/media and the invoice follows. Nothing breaks if that is
// forgotten: the document falls back to Georgia and the system mono, which
// is what it used before.
//
//go:embed fonts/*.woff2
var fontFS embed.FS

func serveFont(w http.ResponseWriter, r *http.Request) {
	name := strings.TrimPrefix(r.URL.Path, "/admin/fonts/")
	// No path of any kind: the two names are the whole set.
	if name != "eczar.woff2" && name != "plex-mono.woff2" && name != "signature.woff2" {
		http.NotFound(w, r)
		return
	}
	b, err := fontFS.ReadFile("fonts/" + name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "font/woff2")
	// Immutable in practice: a change to either arrives as a new binary.
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	_, _ = w.Write(b)
}
