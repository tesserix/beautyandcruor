# Findings

Everything discovered during Phase 1 capture, the design reviews, and the competitive research.
Recorded because most of it is not recoverable once the WordPress site is decommissioned.

Captured September 2026.

---

## 1. The old site

### URLs

41 URLs across seven Yoast sitemaps. Full inventory with titles, descriptions, canonicals and
robots directives in [`../capture/meta/seo-inventory.json`](../capture/meta/seo-inventory.json).

**Live navigation is seven items** — and the four disciplines *are* the projects pages. There is
no `/projects/`, `/work/` or `/portfolio/` page; all return 404.

```
About Me · SFX & Prosthetics · Film & Television
Casting & Sculpting · Editorial & Fashion · Blogs · Contact Us
```

The nav also contains five duplicate `?page_id=` entries labelled "More Info" that resolve to
the same discipline pages.

### Pages that are not what the brief assumed

| URL | Reality |
|---|---|
| `/beauty-cruor/` | **Not a separate page.** It is the homepage's own slug; `wp-json` reports its link as `/`. 301s to root. |
| `/main-home/` | **A real, separate 45 KB page** the original brief did not list. Curly demo home duplicate. |
| `/paritivity/` | Published, **0 bytes of content**. Dead. |
| `/location-contact-us/` | Published, **0 bytes of content**. Dead. |

### The Portfolio CPT is empty demo content

16 `/portfolio-item/*` URLs (`colors`, `braids`, `keratin`, `curls`, `pixie`, `bob`, `bangs`,
`ombre`…), all dated 2018-04-05 — the Curly theme demo install date. Plus 3 portfolio-category
and 7 portfolio-tag URLs.

**All four sampled items reference an identical set of 9 uploads** — the logo and header/footer
chrome. They have no imagery of their own. There is nothing in the Portfolio CPT worth
extracting.

Portfolio and Testimonials are registered without `show_in_rest` — `wp/v2/types` does not list
them at all, so a WXR export is the only route to Testimonials. Given the Portfolio finding, that
export is low priority.

### The desktop homepage is a split-slider, not a page

`document.body.scrollHeight` at 1920 is 1080 — exactly one viewport — while the same page is
5791px at 390 and 7408px at 768. The cause is a Mikado **vertical split-slider**
(`div.mkdf-vertical-split-slider`, `scrollHeight` 6620, `overflow: hidden`): two panes scrolling
in opposite directions, driven by JS.

Consequences:

- `fullPage` screenshots of the 1920 homepage only ever capture the first state. Stepping it with
  wheel events did not advance it — it is bound to a custom handler.
- **Nothing about this interaction survives into a mobile-first rebuild.** The desktop home needs
  a new concept rather than a port.

### Page heights at 390px

Some pages are absurd on a phone, which is itself an argument for the rebuild:

| Page | 390px height |
|---|---|
| `/film-television/` | **26,723px** (~32 screens) |
| `/sfx-prosthetics/` | 16,050px |
| `/editorial-fashion/` | 15,138px |
| `/contact-us/` | 930px |

### SEO

**Only the homepage has a meta description.** 39 of 41 URLs have none — so there is nothing to
preserve and descriptions must be written from scratch.

---

## 2. The image library

290 originals, 225 MB, pulled via `wp-json` `source_url` (which returns originals, not
WordPress's resized derivatives). Zero download failures.

| | |
|---|---|
| Portrait | **204 (70.8%)** |
| Landscape | 62 (21.5%) |
| Square | 22 (7.6%) |
| Dominant ratios | 3:4 (100 images), 2:3 (47) |
| Width median | 1440px (min 433, max 3840) |

### Three problems

**All 290 images have empty alt text.** This single fact blocks the Lighthouse accessibility-100
target. Alt text has to be authored.

**78 of 288 are under 1200px wide.** A full-bleed image on a 390px screen at 3× needs ~1170px, so
these sit at or below the retina floor. They need either a non-full-bleed treatment or
re-export from originals. Flagged as `retinaFloor` in the generated manifest.

**Two files are corrupt** — `2022/09/a7f5bcb0-f2c7-4094-9d37-21046941556d.jpg` and its `-1`
sibling both fail to decode (`VipsJpeg: premature end of JPEG image`).

Also present: **2 HEIC files** no browser renders, and **9 video files** (largest a 24.6 MB
3840×2160 `.mov`).

### What the work actually is

Reviewed via contact sheets. The library divides into:

- **SFX / prosthetics** — burns, trauma, creature builds, old-age, severed pieces, skulls. The
  strongest and most distinctive material.
- **Casting & sculpting** — lifecast busts, clay lion reliefs, hand casts, moulds, a 3D-printed
  nose core.
- **Editorial** — a dark, dramatically-lit body-art/henna series; gel-lit portraits; underwater;
  millinery.
- **Film & TV** — Indian television continuity and age makeup.
- **Cinematic character work** — warrior/creature pieces under hard key light. The best images
  on the account.
- A substantial amount of **behind-the-scenes and phone snapshots** that are not portfolio-grade.

---

## 3. Credits

27 productions parsed from the About page's HTML table into
[`../capture/credits.json`](../capture/credits.json) as `{title, director, production, year,
location}`.

| | |
|---|---|
| Span | 2018–2026 |
| India | 18 |
| Australia | 8 |
| UAE | 1 |

Notable: **Mad Max (Village Roadshow, 2022)**, **The Bengal Files** (Vivek Agnihotri),
**Rakht Brahmand** (Rahi Anil Barve), **PUBG Originals**, plus national commercials for
Johnson's, Asian Paints, Panasonic and HSBC.

### Data quality issues

- **No role or department on any credit.** A producer reads role before title. This is the single
  biggest gap in the dataset.
- **Rows are not chronological** in the source — 2021 entries sit after 2018.
- `"Lucky"` has **`In Progress` in the director column** — a status, not a name.
- `"Thief"`, `"Ola Cabs"`, `"Sugar box"` have no director and no company. 11 of 27 have no
  production company.
- Spellings need checking: `Leo Brunett` (Leo Burnett), `Village roadshows`, `Savadhan India`.
- **The "Mad max" entry is unverified.** 2022 + NSW + Village Roadshow is consistent with
  *Furiosa: A Mad Max Saga*, but that is an inference and has deliberately not been published
  anywhere.
- Five credits are dated **2026** — confirm they are released and not under embargo.
- **Johnson's Baby conflicts with her own Instagram**: the table says Mothership Production,
  2025; her post credits DDB Mudra and Directors Cut, dated 2026.

### Sorting chronologically is a strategic error

Sorted newest-first, the first five credits a producer sees are Beco, Asian Paints, Himalaya,
Baby Sebamed and Johnson's — **all baby-product commercials**. A feature producer reads that and
stops. Features and television must lead; commercials belong in a filtered full list.

---

## 4. Instagram

`@_parimiti_sfx_and_prosthetics_` — 2,778 followers, 356 posts, business account, category
"Makeup Artist", external link already pointing at beautyandcruor.com.

Display name reads **"Parimitii"** (two i's) while the credit inside her own post reads
"Parimiti". Spelling needs confirming.

Bio lists six roles as a flat list — and leads with **"Educator"**, a whole dimension absent from
the website. It also lists **Hair Stylist** and **Nail Artist**, neither of which appears on the
site.

### Reel performance, all 39 reels

| Type | n | Median plays | Likes/1k |
|---|---|---|---|
| **Narrative** (short films) | 3 | **78,589** | 8.1 |
| Showcase | 1 | 9,080 | 23.7 |
| Appliance (collaboration ended) | 9 | 7,300 | 10.8 |
| Celebrity | 1 | 7,025 | 47.4 |
| Craft clip | 6 | 6,471 | 14.2 |
| Credit post | 2 | 1,442 | 34.0 |
| Personal | 8 | 1,194 | 50.7 |
| **Process** (sculpting, studio) | 7 | **812** | 36.5 |
| Educational | 2 | 730 | 68.0 |

Account median: 3,504 plays.

- **Narrative pieces reach 22× the account median.** Three in three years produced her three best
  results by an order of magnitude.
- **Process content is her worst performer** — what artists enjoy posting, and what nobody
  watches.
- **Longer reels win**: 40s+ median 11,231 vs under-20s median 1,277. Opposite of standard
  short-form advice, consistent across three years.
- **Reach is unrelated to following**: best reel hit 122,255 plays against 2,778 followers — 44×.
  Distribution is Explore and Reels, not the follower graph.
- **Credit posts get the least reach of anything** (The Bengal Files: 419 plays). Instagram will
  not carry her credits — that is the website's job.

### Showreel material exists

There is no cut showreel, but roughly **10 minutes of usable footage** across 8 candidate reels,
recorded in [`../capture/reels.json`](../capture/reels.json). Strongest: *The Track* parts 1 and 2
(122k and 79k plays) and *The Saturation Point* (18k), on which **she has a concept-and-direction
credit**.

The WordPress library's own 9 videos are not a substitute — they are a PUBG production trailer, a
640×352 promo, and seven phone clips of 5–11 seconds.

### The appliance business has ended

Nine reels promote a silicone appliance product line (coded SKUs, pregnancy and fatty bellies,
silicone hands) built with **Rahul Creations Prosthetic Lab**. The client has confirmed **she no
longer works with Rahul or that team**, so this content is stale and must not be featured.

Consequence: the crew named in those posts (Shital Bagul, Sandesh Sharmila, Akshay Mhatre) is
**not** her team. Crew capability is an open question, not a solved one.

---

## 5. Competitive research

~30 SFX, prosthetics, creature-shop and agency sites examined, plus recent award-winning
portfolios.

### Three findings confirmed by more than one research stream

1. **Credits must be primary and IMDb-reconciled.** Producers treat IMDb as the record; a gap
   between site and IMDb gets noticed.
2. **No competitor carries testimonials.** ~30 sites grepped for `testimonial`, `blockquote` and
   quote patterns — **zero** genuine director, producer or actor quotes anywhere. Standard in
   nearly every other B2B category. The cheapest available differentiator.
3. **No competitor publishes availability.** A live "currently shooting in Queensland"-style line
   is an unoccupied field.

### Before/after reveals have no professional precedent

Zero of the sites examined use a before/after reveal in the page UI. The industry convention is
that the transformation lives **inside the showreel video** — wipes, split-screens, PLATE/FINAL
labels cut into the footage. `beforesandafters.com` is editorial text wrapped around an embedded
video; DNEG organises its navigation around "breakdown" and "showreel".

A drag-to-reveal slider is genuinely unoccupied but is a consumer-web mechanism. Treat as an
optional experiment, not a recommendation.

Supported alternatives with real precedent: **numbered stage sequences** (Mike Marino's Black
Swan page orders its DOM images deliberately: `1 → 2 → 2a → 4,5,6 → 8,8a → 9,10,11`) and
**close-ups of edges and blend lines**, which is where a producer's eye goes.

### Other patterns worth noting

- **ILM self-hosts video** rather than embedding YouTube — keeps the viewer on-site, which matters
  for a hiring tool.
- **Autonomous F/X gates its full portfolio behind a login**, with a public teaser gallery. For
  graphic trauma work this converts a defensive gate into an exclusivity signal.
- **Studio Gillis separates `/theprocess` and `/behind-the-scenes`** into their own pages.

### Actor experience: register matters

Trade press reports application and removal times as scheduling facts (*The Penguin* 2.5–5 hrs;
*The Whale* 7 hrs optimised to 2h45). The wrong register is the tabloid "suffering actor" framing,
which makes the artist sound like a hazard. The right one is **comfort as iterative design** and
**prosthetics as a performance tool** — a piece that closes off an ear shifts an actor's
equilibrium and feeds the performance.

### Practical constraint

Publishing before/after material showing a named actor's real face requires **model and
photographer releases**. This is a rights question, not a formality, and may constrain which
credits can carry a full sequence.

### Citation corrections

`mugfx.com.au`, `makeupeffectsgroup.com.au`, `mashsfx.com.au` do not resolve. `jmbfxstudio.com.au`
and `megeffects.com.au` return 403 to automated fetches. DNEG, Weta FX, Method and Framestore are
JS-rendered and their in-page layouts could not be characterised — do not cite them.

---

## 6. Design review findings

Three independent reviews were run against the design directions.

### Art direction

Direction C reads as the full-screen photographer-portfolio template of roughly 2016–2020
(Squarespace *Wexley*, Format *Peak*) — hamburger plus tracked "MENU", letter-spaced micro-labels,
numbered "01 · DISCIPLINE" eyebrow, red pill CTA. On mobile specifically it reproduces an
Instagram Story: full-bleed portrait, sideways swipe, segmented progress bar.

> Nothing on any screen could only belong to a prosthetics artist. Swap the photos for a wedding
> photographer's and not one pixel of chrome would need to change.

Recommendations: a display face with a point of view (**Eczar**, which has a Devanagari
companion; or **Fraunces** with the WONK axis), the mark out of the HUD and used at scale exactly
twice, monochrome rather than lime, and an opening that *demonstrates* rather than displays.

### Accessibility audit

The riskiest interaction turned out to be sound: **nested vertical-snap-inside-horizontal-swipe
survived 11 gesture vectors** including thumb arcs and diagonals — no gesture ever moved both
axes or left a scroller off-snap.

Defects found and fixed: Escape closing a sheet without clearing the hash (which permanently
killed the Enquire CTA), JS `behavior:'smooth'` overriding the CSS reduced-motion rule, the CTA
buried under overlays, sheets claiming `aria-modal` with no focus management, sub-44px touch
targets, pull-to-refresh reloading the document, 5 duplicate alt strings, and ~98 KB of images
shipped but never rendered.

**Not fixed, and architectural:** the prototype inlines all images as base64, giving LCP ~9.4s and
an estimated Lighthouse mobile score around 66. This is a constraint of the prototype format
(artifact CSP blocks external images), **not** of the production design — `scripts/images.mjs`
already emits real files with a proper srcset ladder. The production build must not inline.

### The rights gate can clear more than it was told to

`scripts/assets-sync.mjs` refuses to publish any image the live WordPress site
never showed and nobody has explicitly cleared. It matches on an *identity* —
WordPress serves one upload under several names, so `x.jpg`, `x-scaled.jpg`
and `x-1024x768.jpg` all have to resolve to the same thing.

That function also strips `-edited` and `-edited-N`, and those are not aliases
of one upload. They are separate photographs:

```
2023/04/IMG_1077-edited.jpg     ┐
2023/04/IMG_1077-edited-1.jpg   ├─ three images, one identity
2023/04/IMG_1077-edited-2.jpg   ┘
```

Nothing is wrong today. All three are `unpublished/`, in no gallery, so the
gate never evaluates them; and the one real match it needs — the crawl's
`2022/09/IMG_1077-scaled.jpg` to `casting/casting-004` — is correct and comes
from the `-scaled` rule, not this one.

The hazard is latent and points the wrong way. **Clearing any one of those
three would silently clear the other two**, and over-matching in a gate whose
whole purpose is Q7/Q8 — photographs of other people whose releases are
unresolved — is the failure it exists to prevent.

Worth noting too that the crawl contains **no** `-edited` names at all, so the
rule currently buys nothing and costs a collision. Removing it looks safe, but
it is a change to how publication is decided and deserves its own reasoning
rather than riding along with something else.

It is also a third copy of `identity()`. `src/lib/identity.mjs` is shared
between `organize.mjs` and the site; this one is separate and has diverged —
which is exactly how the curated film leads were silently unresolvable before.

## A bare `catch {}` turned a missing import into "no images"

Extracting the derivative ladder into `scripts/lib/ladder.mjs` moved `sharp`
out of `scripts/images.mjs`, but `pickSample()` still called it. The call sat
inside `catch {}`, so the `ReferenceError` was swallowed once per file and the
run reported `0 images` — then wrote that empty manifest over the real one.

Two things were wrong and both are fixed:

- The `catch` now rethrows `ReferenceError` and `TypeError`. It was there to
  skip an unreadable image, and a programming error is not that.
- `images.mjs` refuses to replace a populated manifest with an empty one. The
  library does not vanish; an empty result means the walk read nothing, and
  the manifest costs fifteen minutes to regenerate.

## `--sample` wrote the real manifest

`npm run images:sample` derives a dozen representative images to check encoder
settings. It wrote `src/generated/images.json` — the same file the full run
produces — so a sample replaced 280 entries with 12. It now writes
`images.sample.json`, which is gitignored.

Worth saying plainly, because it cost two recoveries in one session: `npm run
images` is `images.mjs && organize.mjs`. Running `images.mjs` alone is not half
the job, it is a different job — it emits keys derived from source paths
(`2022/04/Copy-of-…`), and `organize.mjs` is what renames them to `sfx/sfx-001`
and moves the derivatives to match. Run the pair or neither.

## One bucket cannot have a private prefix

The assets bucket is the CDN origin, so `allUsers` holds
`roles/storage.legacyObjectReader` on it. Uploaded originals went to
`uploads/` in the same bucket, which made every original she uploads
anonymously readable to anyone who knows its name — full resolution,
unprocessed, while model and photographer releases are unresolved. Listing is
refused (401), so the only protection was that object names contain a
timestamp.

The obvious fix does not exist. GCS rejects an IAM condition on an `allUsers`
binding outright — `Conditions are not allowed on public resources` — and
uniform bucket-level access rules out object ACLs. Within one bucket it is
all-public or all-private; there is no public `img/` beside a private
`uploads/`.

So the original is deleted once its derivatives are verified fetchable. The
site only ever serves derivatives, so nothing needs it afterwards. Two details
that matter:

- **Verify before deleting, per image.** A derivative that is not actually
  fetchable means the original is still the only copy. `derive-uploads.mjs`
  HEADs every object it uploaded and keeps the original if any is missing.
- **The original must not be cacheable.** Deleting an object does not purge
  Google's edge cache: a deleted original kept answering 200 for the remainder
  of its `max-age`, which was an hour. The sidecar now stores originals with
  `Cache-Control: no-store`, which meant moving the upload from the JSON API to
  the XML API — a JSON simple upload cannot set it. Both need only
  `storage.objects.create`.

The escaping differs between the two APIs and the difference is silent. The
JSON API takes the object name as a query parameter, where `/` must be `%2F`;
the XML API takes it as a path, where escaping the separator creates an object
genuinely named `uploads%2Fsfx%2F…` that nothing will ever find again.
