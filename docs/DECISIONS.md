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
