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

- Scaffold the Next.js app (Next 16 / React 19 / Tailwind v4 / Node 22, matching `tesserix-blog`).
- Rebuild direction C to the D10 structure: credits primary, For Production block, showreel slot,
  Journal dropped.
- Typography pass — the reviews were unanimous that a neutral grotesque leaves a stripped-back
  design with no personality.
- Dockerfile (multi-stage → nginx) and `nginx.conf` handling trailing slashes plus 410s for the
  dead and demo URLs.
- Helm chart in `tesserix-k8s` following the `tesserix-home` pattern.
- Re-capture the 1920 homepage properly — the split-slider defeats `fullPage` screenshots.
- Decide whether to obtain the WXR export for the Testimonials CPT. Low value given the Portfolio
  CPT turned out to be empty demo content, but it is the only route to Testimonials.
