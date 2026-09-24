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
| 2 | **Real title of the 2022 Village Roadshow credit** | Listed as "Mad max". Consistent with *Furiosa*, but that is an inference and will not be published unverified against a Warner Bros. title. |
| 3 | **Which 6–8 credits lead** | Chronological sorting puts five baby-product commercials first. |
| 4 | **Johnson's Baby: company and year** | Credits table says Mothership Production / 2025. Her own Instagram says DDB Mudra + Directors Cut / 2026. |
| 5 | **Which email address works** | The live site publishes both `info@beautyandcruor.com` and `info@beautycruor.com`. If the wrong one is live, enquiries may have been bouncing. **Worth checking today, independent of the rebuild.** |
| 6 | **A phone or WhatsApp number** | Nobody on a production books through a web form. |
| 7 | **Images that must not be published** | BTS, phone snapshots and photos of other people are mixed into the library. |
| 8 | **Model and photographer releases** | Publishing a named actor's real face beside the character is a rights question. Constrains which credits can carry a sequence. |
| 9 | **Real titles and dates for the work shown** | Current captions ("Burn appliance", "Creature sculpt") are ours, written from looking at the images. |
| 10 | **Does she still make and sell appliances?** | The Rahul Creations collaboration has ended. Decides whether the site needs a shop section. |
| 11 | **Parimiti or Parimitii** | Instagram display name says one, her own post credit says the other. Needs settling before it goes on a masthead. |

## Important, not blocking

- **Alt text for 290 images.** All empty. Lighthouse accessibility 100 is unreachable without
  them, and they cannot be migrated — they have to be written. Can be drafted from the imagery
  for her to correct.
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

- **Alt text.** Currently positional: `"SFX & Prosthetics, work 11 of 52"`. Useless to a screen
  reader, worthless for image search, and the reason Lighthouse accessibility cannot reach 100.
  Draft from the imagery for her to correct.
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
3. **Positional alt text.** Same item as Phase 2; it is both an accessibility and an image-search
   failure.
4. **`breadcrumbSchema` is written but never used.** No page emits it.
5. **`llms.txt` does not exist.** An emerging convention for telling AI crawlers what a site is
   and what matters on it. Cheap, and well suited to a site whose value is a credits list.
6. **robots.txt says nothing about AI crawlers.** It is `Allow: /` for everything. The Cloudflare
   zone is set to allow Search and Agent crawlers and **block Training** — robots.txt should say
   the same thing, or the two signals disagree.

**A trap while the site is on the staging host:** `robots.txt`, `sitemap.xml` and every canonical
point at `https://beautyandcruor.com` — the old WordPress site — because `SITE.url` is the
production domain. The staging host is fully crawlable and advertises canonicals for a different
site. Add `noindex` for the staging host until the cutover, or accept that anything indexed points
at WordPress.

**Still ours**

- **Authoring.** She has no way to upload an image, fix a credit or reorder a gallery without
  someone else doing it. D18 writes up the options and recommends one; it needs a decision, and
  the Kargo half of it is worth doing whatever is chosen.

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
block of `argocd/prod/infrastructure/istio-auth-policies.yaml`, and the `noindex` if it was added.
