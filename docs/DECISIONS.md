# Decisions

What was decided, and why. Newest last. Where a decision reversed an earlier one, the reversal
is recorded rather than the history being rewritten.

---

## D1 — Content lives as MDX in the repo. No CMS.

Considered Keystatic and Sanity. The site changes rarely — two blog posts since 2023.

The deciding argument: on GKE with a static nginx container, **any** content change requires a
container rebuild and redeploy regardless of CMS. A CMS only helps Parimiti if a CI
rebuild-on-commit pipeline is also built, which does not exist yet. MDX now, with a content
schema shaped so Keystatic could be layered on later without migrating content.

---

## D2 — Redesign, mobile-first. Not a port.

The original brief asked for animations "visually indistinguishable from the reference
recordings" and, separately, for a mobile-first animation redesign. Those conflict.

Mobile-first wins. At 440px the old homepage renders one animated element while still shipping
Slider Revolution, Isotope, Packery, Waypoints and Owl Carousel in full — mobile visitors pay the
entire cost of the animation stack and receive none of it. The recordings are documentation of
intent, not an acceptance criterion.

390px is the primary design target. Desktop motion is progressive enhancement.

---

## D3 — Dead and demo URLs return 410 Gone

`/paritivity/` and `/location-contact-us/` are empty. The 16 `/portfolio-item/*` URLs plus
portfolio-category and portfolio-tag URLs are Curly theme demo content with no imagery of their
own.

410 rather than 404: it tells search engines the removal is permanent and de-indexes faster.
`/beauty-cruor/` keeps its existing 301 to `/` since it is the homepage's own slug.

---

## D4 — Contact form posts to Resend

Static-friendly, no server. Simplest setup and a generous free tier. Postmark was the alternative
on deliverability grounds; not judged worth the cost at this volume.

---

## D5 — Image pipeline: pre-generated AVIF + WebP, decided before any component

Static export means no runtime optimiser, and retrofitting an image pipeline is painful, so this
was settled first.

Seven-width ladder derived from the layout rather than convention, AVIF + WebP across it, one
JPEG fallback at 1080, inline LQIP, never upscales. Measured 87% reduction; a full-bleed phone
image lands at 62 KB.

WebP-not-JPEG as the real fallback: WebP is universal from Safari 14, so the JPEG exists only for
genuinely ancient clients and does not need its own ladder.

---

## D6 — Kubernetes config goes in `tesserix-k8s`, not this repo

The brief asked for Deployment/Service/Ingress/Certificate manifests here. That conflicts with
the established platform: K8s config lives in the separate `tesserix-k8s` repo as Helm charts
synced by ArgoCD, following the `charts/apps/tesserix-home` pattern.

**TLS uses two named SANs, not a wildcard.** Their CAA records restrict `issuewild` to `pki.goog`
and `globalsign.com`, so a wildcard fails until `0 issuewild "letsencrypt.org"` is added at
Cloudflare. Named SANs work with no DNS change.

---

## D7 — Brand mark traced to vector, kept

The supplied logo is dark-grey script with a lime leaf flourish, raster-only at 711×218, drawn
for light backgrounds — on a dark ground it all but disappears.

Traced with potrace at 4× and split into two paths (`.bc-script`, `.bc-leaf`) so each recolours
independently via `--logo-ink` and `--logo-leaf`. Sharp at any size, works on either ground,
single-colour knockout available.

**The aesthetic concern is recorded and unresolved.** Both the art-direction review and one design
pass argued the botanical script signature reads wellness/salon and fights imagery of burns and
trauma. Vectorising fixed the technical problem, not that one. The client chose to keep the mark;
the question is in `OPEN-QUESTIONS.md` for Parimiti to settle. Reviewer's compromise, not yet
applied: typeset wordmark at small sizes, the signature used at scale exactly twice, monochrome.

---

## D8 — Direction C: full-bleed immersive gallery

Three directions were built. A (warm near-black, Bodoni Moda, presented as a design deck) and
B (plaster ground, Gloock, multi-page) were both rejected by the client as mediocre and, for B,
too verbose.

C was chosen from four options: full-bleed images filling the screen, horizontal swipe within a
discipline, vertical scroll between disciplines, minimal chrome. The wow comes from scale and
absence of interface rather than from effects.

Desktop shows three full-height plates rather than one, because a portrait source stretched
across a landscape viewport crops to a useless horizontal sliver — and 71% of the library is
portrait.

**Reviewed as "clean, not modern"** — recognisably the 2016–2020 photographer-portfolio template.
Accepted as the right skeleton; the outstanding work is typography, an authorial opening, and
structure (see D10).

---

## D9 — Audience is directors, producers and actors

Confirmed by the client mid-project. This is a business-development tool for getting booked on
productions, not a lifestyle or follower-facing site.

### It reverses part of the original brief

The brief said "Instagram surfaced prominently — likely the main traffic source." For this
audience that is backwards. Instagram may be how they arrive, but **IMDb and the credits are what
convert**. An industry visitor does not want to follow her; they want evidence she can deliver.

The two are no longer a matched pair: IMDb is first-class, Instagram is secondary.

Supporting evidence from her own account: credit posts get the **lowest** reach of any content
type (The Bengal Files: 419 plays). Instagram will not carry credits — that is the site's job.

---

## D10 — Structural consequences of D9 (built, see D14)

- **Credits become a first-class surface**, not a menu item. Confirmed as highest-leverage by two
  independent reviews.
- **Credits must not lead chronologically.** Sorted newest-first the first five are baby-product
  commercials. Features and TV lead; commercials go in a filtered full list. **Filter by type,
  not by country** — country is what she cares about, type is what a producer cares about.
- **A "For Production" block**: availability, territories, workshop turnaround, crew, insurance,
  ABN/GST, working-with-children check. Almost no competitor publishes this, which is exactly why
  it stands out.
- **Testimonials.** Zero of ~30 comparable sites carry any. Cheapest genuine differentiator.
- **Showreel above the fold**, with before/after cut into the footage rather than built as a page
  interaction.
- **Drop the Journal.** Two posts from 2023 signals an unattended site.

---

## D11 — Discipline priority: prosthetics, then makeup, hair last

Client-specified. She also does appliances. Hair styling and nail art appear in her Instagram bio
but not on the site — inclusion is an open question.

---

## D12 — Client questionnaire delivered as a Google Form

Built first as an artifact, which turned out to require a Claude login even when shared — no good
for an external client.

Rebuilt as `deliverables/create-parimiti-form.gs`, an Apps Script that constructs the whole form
(8 sections, 53 questions, 10 required) in one run, including a per-production role field for all
27 credits. `setRequireLogin(false)` so no Google account is needed, wrapped in try/catch because
it throws on personal accounts.

The self-contained HTML version is kept at `deliverables/questions.src.html` as a fallback if
Workspace policy blocks external form responses.

---

## D13 — Reversal: before/after reveal is not a recommendation

An earlier art-direction review proposed a press-and-hold before/after reveal as the single
highest-leverage change, and it was nearly adopted.

Competitive research contradicted it with better evidence. Zero of ~30 comparable sites use a
before/after reveal in page UI; the convention is that the transformation lives inside the
showreel video. Both research streams found the same absence and read it oppositely — the
tiebreaker was positive evidence of the video convention, not the absence itself.

Recorded as an optional experiment. What replaced it: showreel-carried transformation, numbered
stage sequences, and edge/blend-line close-ups.

---

## D14 — The D10 structure, as built

D10 listed the structural consequences of D9. Four of them are now in the app; the rest stay
blocked on the client.

**Credits are their own route, `/credits/`.** Previously a section inside About, reached by an
anchor. It now leads with six credits and carries the full 27 below, filterable by type. The
route is new — it is in `NEW_PATHS`, deliberately not in `PRESERVED_PATHS`, because that list has
a job: the deploy check greps the old sitemap against it for 404s, and a URL the old site never
had would be noise there. About keeps a link across rather than a second copy of the list.

**Filter by type, not country**, per D10. The chips come from the data, so they change when the
data does. Note what the filter is built on: type is read off the title text and nothing else —
the source table has no format column. `Beco Commercial` and `Yaariyan … Feature Film` say what
they are; fifteen titles do not, and fall to a `Film & TV` bucket. Two entries (`Ola Cabs`,
`Sugar box`) are brands with no format word and may be commercials sitting in that bucket. Rather
than assert quietly, the page says in plain sight that formats and roles are being confirmed and
points at IMDb as the record.

**The lead list holds back commercials *and* poster shoots.** D10 said features and TV lead.
Excluding only commercials left `3 Monkeys - Poster` opening the page, which is not the first
impression a features audience should get. Still interim — question 3 is hers to answer.

**"For Production" is driven by data that is mostly null.** Every field in
`src/content/production.ts` is `string | null`, and the block renders only what is confirmed. Two
rows are live (based, in-house pipeline); six are waiting. An absent row beats an invented one
here more than anywhere else on the site: a producer who costs a day off a guessed turnaround
finds out on the day. The surface lights up row by row as answers arrive, with no code change.

**The showreel slot exists and is empty.** `src/content/showreel.ts` is `null`, so the homepage
hero falls back to the full-bleed image reel. When a cut lands, fill in the file — sources, a
poster key through the image pipeline, and a duration — and it takes the slot. Deliberately a
plain `<video controls>`: native controls are accessible for free and a custom player is JS this
budget does not have.

### The one place this departs from D10

D10 said **drop the Journal**. The pages are still live and still in the sitemap; what was
dropped is their prominence — gone from the header nav, demoted to a footer link.

Deleting them would 404 two URLs that WordPress published and search engines have indexed, and
`nginx.conf` already redirects their old root-level permalinks to `/blogs/`. Dropping them from
the navigation achieves what D10 was actually after — two posts from 2023 no longer signal an
unattended site — without throwing away link equity. **If the intent was to remove the content
outright, this is the decision to revisit**, and it needs the 410s in `nginx.conf` rather than a
route deletion.

---

## D15 — Assets move to GCS, and publication is gated on evidence

Two decisions that turned out to be one.

### The assets leave the container

The export was 167 MB, of which 165 MB was `public/img` — derivatives for 276
images, to serve maybe fifteen per visitor. They now live in a public GCS
bucket behind Cloudflare, and the container is **2.7 MB** (verified by building
with `public/img` moved aside; the build needs only the manifest).

Cloudflare rather than Google Cloud CDN, for three reasons: the zone is already
delegated to Cloudflare so the CDN is a DNS record rather than new infra; there
are zero backend-buckets or url-maps in `tesseracthub-480811`, so Cloud CDN
would be a net-new pattern; and a GCLB costs ~$18-25/month, which is the same
money `GCP-COST-ANALYSIS-MARCH-2026.md` records reclaiming by deleting an
orphaned AU load balancer. Total incremental cost is under a dollar a month.

The URLs point at `assets.beautyandcruor.com`, not `storage.googleapis.com`,
because static export freezes ~2500 absolute srcset URLs into the HTML.
A host we own makes a future CDN change a DNS edit; a Google host would make it
a full rebuild and redeploy of every page.

**`NEXT_PUBLIC_ASSET_BASE_URL` is a Docker build arg, never a Helm value.**
The chart cannot influence HTML that was already built.

**Filenames are content-hashed** (`x-1290.d9746565.avif`). This is not tidiness:
the objects are served `immutable, max-age=31536000`, and under the old stable
names, replacing an image would have served the stale copy from Cloudflare and
every browser that had seen it, for a year.

### Publication is gated on what she actually published

The pipeline builds 276 images; the site references 37. The other 239 are not
spare capacity — Q7 and Q8 in `OPEN-QUESTIONS.md` are unresolved, and the
recovered library mixes portfolio work with behind-the-scenes shots, phone
snapshots and photographs of other people. So `scripts/assets-sync.mjs` derives
the upload set from what the site references and never from `public/img/**`.

Crawling the live WordPress site before decommission (`capture/live-images.json`,
41 URLs, 219 photos actually rendered) then produced better evidence than our
own curation: **8 of our 36 curated picks appear on no page of the live site.**
Our selection was made by eye off contact sheets, so those 8 would have
published images she chose not to.

The sync therefore refuses to upload any referenced image that is neither
recorded in `capture/live-images.json` nor listed in
`src/content/cleared-images.json`. It **fails** rather than skipping, because
the site references these images and silently dropping them would ship broken
pages. Default-deny: a missing `live-images.json` is not permission.

The bucket also gives `allUsers` `roles/storage.legacyObjectReader`, not
`objectViewer` as `tesserix-blog-assets` does — `objectViewer` includes
`storage.objects.list`, and an enumerable bucket is the wrong property for one
holding photographs of third parties.

### What the crawl also found

The Media Library holds 294 items; the disk holds 411 originals. WordPress caps
uploads at 2560px into `-scaled.jpg` and the Library's `source_url` points at
**that**, so `capture/scripts/assets.mjs` has been feeding the pipeline
downscaled copies throughout. All 116 comparable pairs are higher resolution on
disk (e.g. 1920x2560 captured against 3024x4032 actual). Regenerating from the
full-resolution originals is outstanding; it rescues only 4 of the 71 images
below the retina floor, so the layout constraint largely stands.

---

## D16 — Assets serve from the bucket's native URL until launch

D15 specified `assets.beautyandcruor.com` fronted by Cloudflare. Two facts
found while implementing it changed the order of work, not the destination.

**Host Header override is a paid Cloudflare feature.** The plan of CNAMEing to
`storage.googleapis.com` and rewriting the Host header needs Origin Rules with
`host_header`, which the Free plan refuses: *"not entitled to use the
HostHeader override"*. The Transform Rule for the path prefix works on Free;
the Host rewrite does not.

**The alternative needs no rules at all.** Naming the bucket
`assets.beautyandcruor.com` lets GCS match the passed-through Host header to
the bucket name, so a plain proxied CNAME to `c.storage.googleapis.com` works
with no Origin Rule, no Transform Rule, and SSL at Full (strict) — that
endpoint serves HTTPS with a valid `*.storage.googleapis.com` certificate.
D15 assumed it was HTTP-only and rejected this; that assumption was wrong.

**But it cannot be done yet.** A domain-named bucket requires Google domain
verification, which requires a resolvable DNS record, which requires the
nameservers moved to our Cloudflare zone. Moving a client's live DNS purely to
host assets — before the new site is finished — is the wrong trade.

So the Docker build defaults to the bucket's native URL. It works today with no
DNS change, and the switch later is a rebuild rather than a migration: change
one default, rebuild, redeploy. The srcset URLs are frozen per build, so
nothing else moves.

The default is set in the Dockerfile rather than left empty because
`public/img` is in `.dockerignore` — a container built with an empty base emits
same-origin `/img/...` paths and 404s every image, which only shows up in a
browser.

**Cloudflare zone state:** `beautyandcruor.com` is added to the estate account
(the one holding `tesserix.app`), `pending`, with all 25 records verified
identical to the live zone and every one DNS-only so nothing proxies the
WordPress site. Nameservers for the eventual switch are `algin.ns.cloudflare.com`
and `nola.ns.cloudflare.com`. The Transform Rule must be deleted when the
renamed bucket lands, or it will prepend a bucket path onto a bucket-named host.

---

## D17 — Deployed to a staging host, not the production domain

The site is live at `beautyandcruor.tesserix.app` rather than `beautyandcruor.com`, deliberately:
the rebuild is not signed off, and moving a client's live DNS to host an unfinished site is the
wrong order. The chart reaches the real domain through a values change — `domains.primary`, the
`www` alias, `tls.enabled: true` — not a rewrite. Both states were rendered and verified.

Three things were learned the hard way and are worth keeping.

**A `tesserix.app` host needs no in-cluster certificate.** Traffic arrives through the Cloudflare
Tunnel, which terminates TLS at the edge and forwards plain HTTP to the ingress gateway. That is
why `blog.tesserix.app` has no Certificate in the cluster and there is no `*.tesserix.app`
wildcard. Asking cert-manager for one on a domain that still points at Hostinger leaves a
Certificate pending forever — a permanently failing resource in production, which is how people
learn to ignore alerts.

**No tunnel or DNS change was needed.** A `*.tesserix.app` wildcard CNAME already points at the
tunnel and a catch-all rule forwards to `istio-ingressgateway`. The hostname resolved and reached
Istio from the first attempt.

**Every public hostname must be listed in `frontendApps`, and only one of the two copies counts.**
The gateway answered 403 `RBAC: access denied` before consulting any route. The cause is Istio's
ALLOW semantics rather than any DENY rule: once a workload is selected by at least one ALLOW
policy, anything matching none of them is denied. `require-customer-auth` looks like the culprit
and is not — its `notHosts` is scoped alongside `paths: /api/v1/*`, so a static site serving `/`
never matches it.

The trap: `frontendApps` is defined **twice** — in
`charts/infrastructure/istio-auth-policies/values-prod.yaml`, and again in a 405-line inline
`helm.values` block on the ArgoCD Application. Inline values are applied after `valueFiles` and
Helm replaces lists rather than merging them, so the chart's copy is shadowed and inert. Editing
it changes nothing: the sync reports "unchanged", the resource stays at the same `generation`, and
a hard refresh does not help because the cache was never the problem. The chart's copy is the
obvious place to edit and sits directly beneath comments documenting this same 403 happening twice
before, to `blog.tesserix.app` and `observability.tesserix.app`.

Two related fixes that are ours and still outstanding: delete the shadowed `frontendApps` from the
chart values so there is one source of truth, and pin the image tag rather than push `latest` —
Artifact Registry negative-caches a 404, so the `latest` tag stayed unresolvable through the
mirror long after the image existed, while a fresh `main-<sha7>` tag resolved immediately.

---

## D18 — Authoring: a login for images, credits and sequence

**Proposal. Not decided — this document exists to be chosen from.**

The ask is that Parimiti can log in and do three things: upload images, add and edit credits, and
set the order work appears in.

### D1 said no CMS, and its reason has expired

D1 weighed Keystatic and Sanity and chose neither. The deciding argument was not that a CMS is
wrong, it was that one could not help her:

> on GKE with a static nginx container, **any** content change requires a container rebuild and
> redeploy regardless of CMS. A CMS only helps Parimiti if a CI rebuild-on-commit pipeline is also
> built, which does not exist yet.

That pipeline exists now. Merging to `main` builds and pushes both images, and has done so
repeatedly. So the reasoning that closed the question no longer applies, and D1 anticipated this —
it kept the content schema "shaped so Keystatic could be layered on later without migrating
content." That shape held: credits are 27 rows of JSON, and sequence is four lists in
`curation.json`.

### Two of the three asks are nearly free

**Credits** are `src/content/credits.json`: title, director, production, year, location, type. Any
editor that can write JSON to a branch can serve them.

**Sequence** is `src/content/curation.json` — `hero`, `leads`, `covers`, `artist`. Reordering is
moving strings in an array. A drag-and-drop list over the gallery is a small piece of UI.

### Images are the hard part, and it is not the upload

Three constraints make "upload an image" the wrong mental model.

**They are not in the repository.** D15 moved them out: the export was 167 MB, of which 165 MB was
`public/img`, and `.dockerignore` excludes it so the container ships without them. They live in
GCS and are fetched by the visitor's browser. A git-based CMS commits images into the repo, which
is the precise thing that decision reversed.

**They are not files, they are ladders.** `scripts/images.mjs` takes an original and derives seven
widths in AVIF and WebP, a JPEG fallback, and a 24px LQIP, then writes `src/generated/images.json`
with dimensions and blur data. The site reads only the manifest. Dropping a JPEG somewhere
produces an image the site cannot render.

**Publication is gated on evidence.** D15 again: `scripts/assets-sync.mjs` refuses to publish
anything not in the cleared list, and CI enforces it on every build. That gate exists because the
recovered library mixes in work she never published. An upload path has to add to that list —
which is correct, since uploading her own work *is* the consent the gate is asking for, but it
means the gate must be written to as well as read.

So "upload" means ingest, derive, push to GCS, write the manifest, extend the cleared list. That
is a pipeline with a UI in front of it, not a file picker.

### And a fourth thing nobody asked for: the deploy has to be automatic

Today: commit → CI builds → **someone bumps the image tag by hand** in `tesserix-k8s` → ArgoCD
syncs. If she edits a credit and it appears four days later when a human happens to bump a tag,
the editor is worse than no editor, because it promises something it does not do.

This is the cheapest gap to close. Kargo is already deployed on the cluster, the blog already uses
it, and the chart's own comment says what is missing: "Until this app has a Kargo Project, bump
this by hand." **Whatever else is chosen, this comes first** — and it is worth doing even if
authoring is never built, because it removes a manual step from every deploy.

### The options

**A — Git CMS, admin hosted separately.** Keystatic or Decap writing to the repo through the
GitHub API.

Credits and sequence fit immediately; this is what D1 kept the schema shaped for. Images do not:
both want to commit files into the repo, against D15. The admin also cannot live in this site —
`output: "export"` has no API routes to host the OAuth exchange — so it needs a second, non-static
app on the cluster. And she needs an identity: a GitHub account, or Keystatic Cloud, which is paid
and external.

*Cheapest for credits and sequence, wrong shape for images, and it asks a makeup artist to hold a
GitHub account.*

**B — Extend the enquiry sidecar into a small admin.** It already exists, already runs beside
nginx, already holds a secret, and already has an nginx route in front of it.

Add a session login, an upload endpoint that runs the derivative ladder and writes to GCS, and
endpoints that commit `credits.json` and `curation.json` through the GitHub API. She gets one
password and a UI built for her three tasks rather than a general-purpose content editor.

The image pipeline is the real work — the encode is minutes of CPU per photograph and cannot run
inside a request, so it needs a job and somewhere to report progress.

*Most work, exactly the right shape, and no third party or GitHub account.*

**C — Headless CMS.** Sanity or similar holds credits, sequence and images; the build pulls at
deploy time.

Solves images by taking them out of our hands entirely, and gives a polished editor for free.
Against: a second content home and a migration, an external dependency and cost for a site that
changed twice in three years, and it makes the rights gate somebody else's property.

*Fastest to a good editor, worst fit for a site whose whole architecture is "no runtime, no
dependencies."*

**D — Do not build it.** She sends changes; they are applied by hand.

The honest baseline. The site changed twice between 2023 and the rebuild. Against: it makes her
dependent on someone else's availability for her own portfolio, which is the thing she is most
likely to want to change the day before a job.

### Recommendation

**Kargo first, regardless.** One day, removes a manual step from every deploy, and is a
prerequisite for anything else being worth building.

**Then B, in two halves.** Credits and sequence first: they are JSON, the UI is a form and a
sortable list, and they deliver most of the value — a producer reads credits, and she can already
feel the cost of not being able to fix them. Image upload second, as a job rather than a request,
once the shape of the first half is proven.

A is tempting for the first half alone, and if images were never in scope it would win. They are
in scope, and splitting authoring across two systems — a git CMS for text, something bespoke for
images — is worse than one small thing that does all three.

**What this needs before it starts:** a decision on where her session lives (a single shared
password in Secret Manager is enough for one user and avoids standing up identity for one person),
and confirmation that the ~165 MB of GCS assets stays the source of truth rather than being
migrated anywhere.

### D18 addendum — what was built

Kargo first, then B, as recommended. Recording the two things that turned out
differently from the write-up.

**`curation.json` did not work the way D18 assumed.** The proposal said
sequence was "nearly free" because the file was already JSON and an admin could
just write it. It could — and nothing would have happened. The file was read
only by `scripts/organize.mjs`, which needs the image originals and rewrites
`public/img`, so it runs on a laptop and never in CI; the build read the
*generated* `galleries.json`. An editor writing `curation.json` would have
appeared to work and changed nothing. Ordering now happens at build time, which
is what makes the file's own promise — "an admin UI, if one is ever built,
writes this file and nothing else changes" — true rather than aspirational.

**Credits shipped before sequence, not with it.** D18 put them in the same
half. Credits alone is the larger share of the value and needs no image
pipeline, no thumbnails and no manifest in the container, so it went first and
is live on its own. Sequence follows now that curation actually takes effect.

The editor writes through the GitHub contents API with the blob sha from the
read, so two people editing at once produces a refusal rather than one of them
silently losing their work. The path is not an input: `writablePaths` is a
fixed set of three content files, checked before any call, on the same
principle as `ENQUIRY_TO` — a session that is somehow stolen can edit her
credits, not the workflow that deploys them.

Session auth is one shared password, as agreed: PBKDF2-SHA256 from the standard
library, so `go.sum` is still empty and the image is still `scratch` plus one
binary.

---

## D19 — Publish the recovered library without releases. Paperwork from here on.

Parimiti has no model or photographer releases for any existing work, and considers
insurance and compliance a low priority in the Indian market. Asked whether to hold
the launch for them, she said to go ahead and get the paperwork for future shoots.

Taken, on grounds that make it a narrower decision than it first looks: **every image
the site publishes was already public on her own WordPress site.** All 210 of the
published keys match `capture/live-images.json`, the crawl of what the live site
actually rendered, and `src/content/cleared-images.json` holds zero manual
clearances. Nothing is being disclosed that she had not already disclosed herself,
under her own name, for years. This is republication at the same domain, not a new
audience.

That is the whole of the argument. It does not extend to anything else:

- **The gate stays.** `scripts/assets-sync.mjs` still refuses to upload any image
  without either prior-publication evidence or an explicit clearance entry. The
  decision above is why the existing set passes, not a reason to stop checking.
- **Photographer copyright is a separate question from model consent**, and was
  asked as one. Nineteen of the published images come from professional bodies
  (`SDIM…`, `1Y4A…`); whoever shot them owns them by default, and a takedown
  request does not care which country anyone is in. Worth one question to her —
  who shot these — and a line of email permission if any were hired. Not blocking.
- **New uploads do not inherit this.** `scripts/derive-uploads.mjs` adds every
  upload to the cleared list, which records *her* consent to publish, not the
  subject's. Releases from here on are what make that honest.

Q8 in docs/OPEN-QUESTIONS.md is answered by this and can be closed.
