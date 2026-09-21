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

## D10 — Structural consequences of D9 (agreed in principle, not yet built)

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
