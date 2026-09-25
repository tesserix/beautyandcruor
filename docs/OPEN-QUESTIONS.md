# Open questions

What the build is waiting on. Sent to Parimiti as a Google Form built by
[`../deliverables/create-parimiti-form.gs`](../deliverables/create-parimiti-form.gs) — 53
questions, 10 marked required.

Nothing here is a design decision. These are facts only she has.

---

## Blocks launch

| # | Question | Why it blocks |
|---|---|---|
| 1 | **Her role on each of the 27 credits** | A producer reads role before title. Not one credit has one. Biggest single gap in the dataset. |
| ~~2~~ | ~~**Real title of the 2022 Village Roadshow credit**~~ | Closed. *Furiosa: A Mad Max Saga* — it shot June–October 2022 in regional NSW for Village Roadshow Pictures, and no other Mad Max production was filming. Her name is **not** in the film's public crew list, which is ordinary for an assistant on a production that size, so the row says "(uncredited)". That is the industry's own convention and it is what keeps the claim checkable against IMDb, which producers treat as the record. |
| 3 | **Which 6–8 credits lead** | Chronological sorting puts five baby-product commercials first. |
| 4 | **Johnson's Baby: company and year** | Credits table says Mothership Production / 2025. Her own Instagram says DDB Mudra + Directors Cut / 2026. |
| 5 | **Which email address works** | The live site publishes both `info@beautyandcruor.com` and `info@beautycruor.com`. If the wrong one is live, enquiries may have been bouncing. **Worth checking today, independent of the rebuild.** |
| 6 | **A phone or WhatsApp number** | Nobody on a production books through a web form. |
| 7 | **Images that must not be published** | BTS, phone snapshots and photos of other people are mixed into the library. |
| 8 | ~~**Model and photographer releases**~~ | **Closed — see D19.** She has none and chose to publish anyway; every published image was already live on her own site, so this is republication. Photographer copyright on the 19 professional-camera images remains a separate, non-blocking question. |
| 9 | **Real titles and dates for the work shown** | Current captions ("Burn appliance", "Creature sculpt") are ours, written from looking at the images. |
| 10 | **Does she still make and sell appliances?** | The Rahul Creations collaboration has ended. Decides whether the site needs a shop section. |
| 11 | **Parimiti or Parimitii** | Instagram display name says one, her own post credit says the other. Needs settling before it goes on a masthead. |

## Important, not blocking

- **Alt text — drafted, needs her correction.** All 210 published images now carry authored alt
  text in `src/content/alt.json`, written from the imagery. It says only what is visible and names
  no production, title or actor, because those are still questions 2 and 9. What it cannot know is
  what the work actually *was* — "a performer in a red bridal sari" may be a specific character in
  a specific show. Her pass over it is what turns a description into a credit.
- **Crew capability.** She works solo and can assemble a team. A producer costing a
  multi-appliance day needs a number, per city, and notice required. *(The crew named in the old
  appliance posts is Rahul's, not hers.)*
- **Turnaround** — days from lifecast to first application. Decides shortlisting for a shoot six
  weeks out.
- **Availability line.** No competitor publishes one. Only worth it if she will keep it current.
- **Insurance and compliance** — public liability, Working With Children Check, ABN/GST. The WWCC
  matters: five baby-product commercials on the list, and it is a real hiring criterion.
- **Testimonials.** Zero of ~30 comparable sites have any. Cheapest differentiator available.
  Even one attributed quote is worth having.
- **Showreel.** No cut reel exists, but ~10 minutes of usable footage does. Running order
  proposed in `deliverables/instagram-plan.html`.
- **Teaching.** "Educator" leads her Instagram bio and appears nowhere on the site.
- **IMDb reconciliation.** Producers treat IMDb as the record; a gap between it and the site gets
  noticed.
- **The logo.** Kept and vectorised, but both reviews flagged that a botanical script signature
  reads wellness rather than prosthetics. Three options offered: keep as is, keep but drop the
  lime, or set the name in type and retire the mark.
- **Are the five 2026 credits released or embargoed?**

## Lower priority

- Hair styling and nail art — in the Instagram bio, absent from the site. Include, or does it
  dilute the prosthetics positioning?
- Content warnings or an industry-login tier for the graphic work. She already uses trigger
  warnings on Instagram; Autonomous F/X gates its full portfolio behind a login.
- Missing details for `Thief`, `Ola Cabs`, `Sugar box`; and whether `Lucky` is still in progress.
- Spelling corrections in the credits: `Leo Brunett` → Leo Burnett, `Savadhan India`,
  `Village roadshows`.

---

## Not blocked on her — our side

**Done**

- ~~Scaffold the Next.js app~~ (Next 16 / React 19 / Tailwind v4).
- ~~Rebuild direction C to the D10 structure~~ — credits primary at `/credits/`, For Production
  block, showreel slot, Journal demoted. See D14 for what was built and the one departure.
- ~~Typography pass~~ — Eczar / Archivo / IBM Plex Mono.
- ~~Dockerfile (multi-stage → nginx) and `nginx.conf`~~ handling trailing slashes plus 410s.

**The route to launch**

Four phases. Her answers are the long pole, so **the questionnaire goes out now** and runs in
parallel with everything else rather than being a phase of its own.

*Phase 1 — the contact path. Launch-blocking, and partly ours.*

The site exists to get her booked, and today **there is no working way to contact her.**
`EnquiryForm` has `ENDPOINT = ""`, so submitting does nothing; the failure message says "email or
call instead" and neither `SITE.email` nor `SITE.phone` is published. A producer who wants to
hire her reaches a dead end on the one page that converts. Ours: stand up the endpoint — the
options are already weighed in `EnquiryForm.tsx`, with the team's existing `notification-service`
preferred. Hers: questions 5 and 6.

*Phase 2 — what we can do without her.*

- ~~**Alt text.**~~ Drafted. Was positional — `"SFX & Prosthetics, work 11 of 52"` — which is
  useless to a screen reader and worthless for image search. Now authored per image in
  `src/content/alt.json`, read through `altFor()`, with the positional string kept only as the
  fallback for an image added since. `scripts/alt-check.mjs` fails the build if a published image
  has no entry, so the fallback cannot quietly come back. Keyed by upload path rather than manifest
  key, for the reason `curation.json` already documents — `organize.mjs` renumbers manifest keys
  and reuses the names it frees, so keying on them would move a description onto a different
  photograph at the next reorganise. Still wants her corrections.
- **SEO and AI-crawler surface** — see the section below; several gaps are ours alone.
- ~~**JS budget.** 185 KB gzipped against a 150 KB target.~~ The target was unmeetable by
  construction — React 19 plus the Next 16 runtime is ~170 KB before any of our code loads, so
  150 KB sat below the floor. Replaced with a split budget in the README: under 25 KB for our own
  client code, which is the half that can catch a regression, and a 200 KB tripwire on the total.
- **Favicon.** `/favicon.ico` 404s. Entangled with the logo question, since the mark is a wide
  script signature and illegible at 32px.
- **Page weight.** Film & TV is 364 KB raw / 59 KB gzipped HTML, mostly srcset URLs across 86
  images plus inlined LQIPs.

*Phase 3 — incorporate her answers, then polish.*

Roles against all 27 credits is the single highest-leverage change (question 1). Film & TV also
needs curating: 86 frames, mostly behind-the-scenes, chair shots and headshots rather than
character work — and it is the first category a producer clicks.

*Phase 4 — flip the production URL.*

Only once the contact path works, alt text is authored, roles are in, and Film & TV is curated.
The mechanics are staged and rehearsed — see "The cutover, already prepared" below.

---

## SEO and AI-crawler optimisation

D9 says the audience is directors and producers. The discovery path that matters is not only
Google: a producer asking an assistant *"who did the prosthetics on The Bengal Files"* should get
her name. That is won with structured, machine-readable credits — which is the same work that
wins search.

**What exists:** static export (fast, fully crawlable), `sitemap.ts`, `robots.ts`, `Person` and
two `LocalBusiness` schemas, per-page titles, descriptions and canonicals.

**Gaps, in leverage order:**

1. **No per-credit structured data.** The credits page carries only `Person` and `LocalBusiness`
   — the same JSON-LD as every other page. 27 credits with roles, years, directors and production
   companies, marked up as `CreativeWork`/`Movie`/`TVSeries` with her role, is exactly what an
   assistant needs to answer a "who did X" question, and what earns rich results. Blocked on
   question 1 for roles, but the scaffolding can be built now.
2. **No `og:image`.** Every share of this site — WhatsApp, Slack, LinkedIn, a producer forwarding
   it — renders as a bare text card. For a visual portfolio that is a straightforward loss.
3. ~~**Positional alt text.**~~ Closed with the Phase 2 item above — 210 authored descriptions,
   gated by a build check.
4. **`breadcrumbSchema` is written but never used.** No page emits it.
5. **`llms.txt` does not exist.** An emerging convention for telling AI crawlers what a site is
   and what matters on it. Cheap, and well suited to a site whose value is a credits list.
6. **robots.txt says nothing about AI crawlers.** It is `Allow: /` for everything. The Cloudflare
   zone is set to allow Search and Agent crawlers and **block Training** — robots.txt should say
   the same thing, or the two signals disagree.

~~**A trap while the site is on the staging host:**~~ Closed. `robots.txt`, `sitemap.xml` and
every canonical point at `https://beautyandcruor.com` — the old WordPress site — because
`SITE.url` is the production domain, and the staging host was fully crawlable while advertising
canonicals for a site we do not control.

nginx now serves `X-Robots-Tag: noindex, nofollow` on every host except `beautyandcruor.com` and
`www.beautyandcruor.com`. Two things follow from doing it there rather than in the build:

- **The cutover needs no rebuild and no follow-up edit.** The same image stops sending the header
  the moment it answers on the production name. Nothing to remember, nothing to undo.
- **It is not `Disallow: /`.** A disallowed URL is never fetched, so the `noindex` is never read,
  and the URL can still be indexed from an external link. Letting the crawler in to be told
  `noindex` is the only instruction that actually removes a page.

Not covered: the image derivatives, which are served from `storage.googleapis.com` and are
therefore outside this nginx entirely. They move behind `assets.beautyandcruor.com` at step 4 of
the cutover.

**Still ours**

- **Authoring.** Decided (D18) and half built.

  - ~~Automatic promotion~~ — done. A merge to `main` builds, advances `deploy`, and Kargo
    promotes it with no human step. Three consecutive cycles observed.
  - ~~Credits~~ — done. `/admin`, one password, commits `credits.json`. It carries a `role`
    field, which is the answer to question 1 arriving one credit at a time rather than as one
    large questionnaire reply.
  - ~~Sequence~~ — done. A second tab: the homepage opening, each gallery's leads, the
    discipline plates and the About portrait, chosen from thumbnails. It writes `curation.json`,
    which reaches the site now that ordering happens at build time.
  - **Image upload** — after that, as a job rather than a request: the derivative ladder is
    minutes of CPU per photograph and cannot run inside an HTTP handler.

- ~~**JS budget.**~~ Decided. The 150 KB target sat below the framework floor, so it was replaced
  with a split budget — under 25 KB for our own client code, a 200 KB tripwire on the total. See
  README.
- ~~**No favicon or app icon.**~~ Shipped. Not an export of the mark, which is illegible at
  32px, but the emblem composed from the logo's own paths — heart, leaves and stem in the brand
  green, transparent. Matches the icon the WordPress site has always used, without the grey B its
  crop carries.
- Helm chart in `tesserix-k8s` following the `tesserix-home` pattern.
- Re-capture the 1920 homepage properly — the split-slider defeats `fullPage` screenshots.
- Decide whether to obtain the WXR export for the Testimonials CPT. Low value given the Portfolio
  CPT turned out to be empty demo content, but it is the only route to Testimonials.

---

## The cutover, already prepared

The DNS work is staged and verified, so the flip is a sequence rather than a project.

`beautyandcruor.com` is registered at Hostinger but its DNS was never managed there — the domain
sits on Cloudflare nameservers that Hostinger assigned, in a Cloudflare account nobody here
controls. Hostinger's own panel says so: *"DNS is managed at another provider."*

A replacement zone is built in the estate Cloudflare account (the one holding `tesserix.app`),
status `pending` and therefore inert. All 25 records were verified byte-identical to the live
zone, and every one is DNS-only so nothing starts proxying the WordPress site the moment the
nameservers move. DNSSEC is off, which removes the failure mode that takes a domain down
completely during a nameserver change.

Order on the day:

1. Nameservers at Hostinger → `algin.ns.cloudflare.com`, `nola.ns.cloudflare.com`.
   The site keeps serving from Hostinger: same A record, same MX, same everything.
2. Verify her Titan email still flows — MX, SPF, `_dmarc`, autodiscover, autoconfig are the five
   records that matter, and they are the reason the zone was copied rather than rebuilt.
3. Google Search Console → verify the domain (a TXT record, addable via the API once the zone is
   live).
4. Rename the assets bucket to `assets.beautyandcruor.com` and re-point the CNAME at
   `c.storage.googleapis.com`. GCS matches the Host header to the bucket name, so this needs no
   Cloudflare rules — which matters, because Host Header override is a paid feature and this zone
   is Free. Delete the Transform Rule at the same time or it will prepend a bucket path onto a
   bucket-named host.
5. Chart: `domains.primary` back to `beautyandcruor.com`, add the `www` alias, `tls.enabled: true`
   — which restores the chart's own Gateway and Certificate. Both states were rendered and checked.
6. A record → the cluster. This is the actual site cutover and the only irreversible-feeling step.
7. Rebuild with `ASSET_BASE_URL=https://assets.beautyandcruor.com` and redeploy. The srcset URLs
   are frozen per build, so this is a rebuild, not a migration.

Rollback at any point is putting `kellen`/`zariyah` back at Hostinger. The old zone is never
edited, only routed away from.

**Drop the staging host afterwards:** the `beautyandcruor` entry in the inline `frontendApps`
block of `argocd/prod/infrastructure/istio-auth-policies.yaml`. The staging `noindex` needs no
action — it is keyed on the host, so it stops applying by itself.
