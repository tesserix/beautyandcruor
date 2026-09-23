# beautyandcruor.com — rebuild

Rebuilding the portfolio of **Parimiti**, a hair, makeup and SFX prosthetics artist working
between Sydney and Mumbai, replacing a WordPress + Elementor build that is being decommissioned.

**Status:** deployed and publicly reachable at
**<https://beautyandcruor.tesserix.app>** — a staging host on the GKE cluster. The production
domain is untouched: `beautyandcruor.com` still serves the old WordPress site at Hostinger, and
is cut over only when the rebuild is signed off (see `docs/OPEN-QUESTIONS.md`).

Built to the D10 structure — credits as their own route, a "For Production" block, a showreel
slot, the Journal demoted. 212 published images wired in, categorised from the live site's own
discipline pages, served from GCS behind a rights gate that refuses anything she never published.
CI builds and pushes on every merge; ArgoCD deploys the chart from `tesserix-k8s`.

What is left is mostly **not ours**: roles for the 27 credits, which credits lead, the booking
facts, alt text for 290 images. Those are in
[`docs/OPEN-QUESTIONS.md`](docs/OPEN-QUESTIONS.md), and the surfaces waiting on them are already
built — they render what is confirmed and omit what is not, so answers light them up without a
code change.

Start with [`docs/FINDINGS.md`](docs/FINDINGS.md) for what the old site and the research actually
turned up, and [`docs/DECISIONS.md`](docs/DECISIONS.md) for what was decided and why.

---

## Why the rebuild

The live site runs the Curly (Mikado) ThemeForest theme with Elementor 3.25.4 and Slider
Revolution. There is no licence, so it cannot be updated, and two plugins carry unpatchable CVEs.
The homepage loads 50 script tags and 47 stylesheets.

Treat <https://beautyandcruor.com> as **read-only visual reference**. Elementor layouts are
serialized JSON in postmeta and are worthless outside Elementor — do not try to convert them.

---

## Repository layout

```
src/
  app/                  Routes. One page per preserved URL, plus /credits/ (new).
  components/           Chrome, MobileMenu, Reel, Picture, Credits, ProductionFacts, Showreel.
  content/              credits.json, galleries.json, posts/*.mdx, production.ts, showreel.ts
  generated/images.json Written by scripts/images.mjs. Never edited by hand.
  lib/                  site.ts (facts), credits.ts, galleries.ts, images.ts, posts.ts, jsonld.tsx

brand/                  Brand mark, traced to vector
  logo.svg              Two-path SVG: .bc-script and .bc-leaf, recolourable via
                        --logo-ink and --logo-leaf. 4x potrace trace of the raster original.
  logo.min.svg          Single-line form, for inlining

capture/                Phase 1 reference capture. Read-only record of the old site.
  meta/                 Sitemaps, seo-inventory.json (41 URLs), home.html
  assets/uploads/       290 original images pulled via wp-json (225 MB, gitignored)
  assets/manifest.json  Per-image dimensions, mime, alt text, filesize
  screens/              33 full-height screenshots at 390 / 768 / 1920 (95 MB, gitignored)
  contactsheets/        6 contact sheets + index.json, for visual image selection
  credits.json          27 film/TV credits parsed from the About page table
  reels.json            8 candidate showreel sources from Instagram
  audit/                Accessibility audit harness and evidence screenshots
  scripts/              Capture tooling (see below)

scripts/
  images.mjs            THE IMAGE PIPELINE. Build-time AVIF/WebP generation.
  contactsheet.mjs      Builds contact sheets for image selection
  protoimages.mjs       Emits curated images as data URIs for prototypes

design/sources/         The three design directions, as templates with __IMAGES__ placeholders
  a-darkroom.src.html   Warm near-black, Bodoni Moda + IBM Plex Mono. Rejected.
  b-plaster.src.html    Plaster ground, Gloock. Rejected.
  c-immersive.src.html  Full-bleed immersive gallery. Current direction.

deliverables/
  create-parimiti-form.gs   Apps Script that builds the client questionnaire as a Google Form
  questions.src.html        Same questionnaire as a self-contained HTML page
  instagram-plan.html       Bio, pinned posts, showreel running order, content direction

docs/
  FINDINGS.md           What the old site, the image library and the research turned up
  DECISIONS.md          Decisions made, with rationale
  OPEN-QUESTIONS.md     What is blocked on the client
```

---

## The image pipeline

**This is the critical path.** Static export means `next/image` has no runtime optimiser, so
every derivative is generated at build time and committed.

```bash
npm run images          # full run over capture/assets/uploads
npm run images:sample   # 12 representative images, one per aspect bucket
```

Emits to `public/img/` and writes a manifest to `src/generated/images.json`. Components consume
the manifest, never a raw file path.

| | |
|---|---|
| Ladder | 400, 780, 1080, 1290, 1536, 1920, 2560 — never upscales |
| Formats | AVIF + WebP across the ladder, one JPEG at 1080 as `<img>` fallback |
| LQIP | 24px WebP inlined as a data URI (~273 bytes) |
| Measured | **87% smaller**; a full-bleed phone image lands at **62 KB** AVIF |

The ladder is derived from the layout, not convention: a full-bleed image on a 390px screen at
3× needs ~1170px; 430px (largest phone) at 3× needs 1290.

**`retinaFloor`** in the manifest flags the 78 images under 1170px wide — they cannot go
full-bleed on a phone without softening.

---

## Capture tooling

Run from the repo root unless noted. Playwright lives in `capture/node_modules`.

```bash
node capture/scripts/meta.mjs      # sitemap URLs + title/meta/canonical -> seo-inventory.json
node capture/scripts/assets.mjs    # download originals via wp-json (idempotent, resumable)
node capture/scripts/shots.mjs     # 390/768/1920 full-height screenshots
node scripts/contactsheet.mjs      # contact sheets for picking images
node capture/build-imm.mjs         # build design C from its template
```

### Two gotchas worth knowing

**`networkidle` never settles on the old site.** Jetpack and analytics hold connections open. The
capture scripts use `domcontentloaded` plus a bounded settle, and block tracking hosts. An
earlier version hung indefinitely.

**Scroll reveals must be primed.** The old theme uses Waypoints and jQuery.appear, so a naive
`fullPage` screenshot captures elements still at `opacity: 0`. `shots.mjs` scrolls the whole page
first.

---

## Working on the designs

The design sources are templates containing `__IMAGES__` (and for C, `__CREDITS__` and
`__LOGO__`) placeholders. Build C with:

```bash
node scripts/protoimages.mjs   # regenerate the data-URI image bundle
node capture/build-imm.mjs     # splice placeholders -> immersive.html + a wrapped copy
```

**When rendering a design locally, wrap it first.** These files have no `<head>` — the publishing
platform injects charset and viewport meta. Render one raw and mobile emulation falls back to a
980px layout viewport, and you will see a broken layout that is not a real defect.
`build-imm.mjs` writes a correctly wrapped copy for exactly this reason.

---

## Target stack

Next.js App Router + TypeScript, `output: 'export'`, Tailwind, Framer Motion, Embla. Served by
nginx on the existing GKE cluster. Content as MDX in-repo, no CMS. Contact form posts to Resend.

**Match the house versions:** Next.js 16, React 19, Tailwind v4, Node 22 — per `tesserix-blog`.

### Deployment differs from the brief

The original brief asked for Deployment/Service/Ingress/Certificate manifests in this repo. That
is not how this platform works. Kubernetes config lives in the separate **`tesserix-k8s`** repo as
Helm charts synced by **ArgoCD** — see `charts/apps/tesserix-home` for the house pattern
(Kong ingress, Istio VirtualService, KEDA ScaledObject, ExternalSecrets, HPA/VPA/PDB).

**Never run `kubectl apply`/`patch`/`edit` against the cluster.** All changes go through the Helm
chart and ArgoCD.

**TLS:** cert-manager via ingress-shim annotation (`cert-manager.io/cluster-issuer:
letsencrypt-prod`), with **two named SANs**, not a wildcard. Their CAA records restrict
`issuewild` to `pki.goog` and `globalsign.com`, so a wildcard will fail until
`0 issuewild "letsencrypt.org"` is added at Cloudflare. Named SANs need no DNS change.

---

## Budgets and targets

| | |
|---|---|
| JS | target under 150 KB gzipped — **currently 185 KB and over budget, see below** |
| Lighthouse mobile | 95+ performance, 100 accessibility |
| Primary viewport | **390px** — design and test here first, then scale up |
| No jQuery | |

**The JS budget is blown by ~35 KB and it is not application code.** Nine chunks ship on every
route, 185 KB gzipped, of which the app's own client components (the reel counter, the credits
filter, the mobile menu, the enquiry form) are about 1 KB. The rest is the Next 16 App Router
runtime and React 19. Framer Motion and Embla are in `package.json` but imported nowhere, so they
cost nothing. Getting under 150 KB means changing the framework posture, not trimming components
— that is a decision, not a cleanup, and it has not been made.

**Accessibility 100 is currently unreachable** for a reason that has nothing to do with code: all
290 images have empty alt text. Alt text must be authored, not migrated.

---

## Licensing constraint

No marketplace templates. The previous build was an unlicensable ThemeForest theme and that is
the reason this project exists. Acceptable starting points: build the components, Tailwind Plus
"Studio" (owned source), or an MIT-licensed base.
