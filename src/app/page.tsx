import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { WorkReel } from "@/components/WorkReel";
import { Showreel, hasShowreel } from "@/components/Showreel";
import { PreviewStrip } from "@/components/PreviewStrip";
import { SITE, DISCIPLINES } from "@/lib/site";
import { getCredits, leadCredits } from "@/lib/credits";
import { heroKeys, galleryFor, coverFor, PREVIEW_COUNT } from "@/lib/galleries";

export const metadata: Metadata = {
  description:
    "Prosthetics, SFX, hair and makeup for film and television. Sydney and Mumbai.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const credits = getCredits();
  const lead = leadCredits(credits, 6);
  const hero = heroKeys();

  return (
    <>
      <Chrome solidMark={false} plate />
      <main id="main">
        <h1 className="vh">
          {SITE.artist} — {SITE.tagline}
        </h1>

        {/* Opening: one slot, the mark over it. D10 puts the showreel above the
            fold; until a cut exists (src/content/showreel.ts) the work itself
            fills it at full bleed. */}
        <section
          className="relative h-[100svh]"
          aria-label={hasShowreel ? "Showreel" : "Recent character work"}
        >
          {hasShowreel ? (
            <Showreel />
          ) : (
            <WorkReel imageKeys={hero} label="Recent character work" priorityFirst />
          )}
          <div
            className="pointer-events-none absolute inset-x-0 z-[4] grid gap-3"
            style={{ bottom: "calc(120px + env(safe-area-inset-bottom))", paddingInline: "var(--gut)" }}
          >
            {/* The bar mark measures this and then takes its place, so the
                two are never both on screen. Left here rather than removed:
                with no script, or with reduced motion, this is the mark. */}
            {/* The monogram and the wordmark are stacked rather than drawn
                from the single lockup file, because only the monogram may
                travel: <Chrome> scales the bar's own mark up into this spot,
                and that reads as one object only while both are the same
                artwork. The wordmark fades instead. Widths are tied so the
                pair keeps the proportions the lockup was drawn in. */}
            <div
              className="grid justify-items-start gap-[0.45em]"
              style={{ width: "clamp(128px,33vw,190px)" }}
            >
              <Logo data-hero-mark variant="mark" className="w-[75%]" />
              <Logo data-hero-wordmark variant="wordmark" className="w-full" />
            </div>
            <p className="lab" style={{ letterSpacing: "0.22em" }}>
              {SITE.artist} · Sydney / Mumbai
            </p>
            {/* The prototype's cue, which the build had dropped: the opening
                frame fills the viewport, so without it nothing says there is
                anything underneath. */}
            <span className="cue mt-1">
              <i className="ln" aria-hidden="true" />
              Swipe · Scroll
            </span>
          </div>
        </section>

        {/* Each discipline shows several of its best works, not one plate: the
            homepage has to prove range before anyone clicks through. The title
            block is the link — the strip itself scrolls, and making the whole
            section clickable would fire a navigation at the end of a swipe. */}
        <nav aria-label="Disciplines">
          {DISCIPLINES.map((d, i) => {
            const keys = galleryFor(d.slug);
            const cover = coverFor(d.slug);
            // Lead with the configured cover, then the rest of the curated order.
            const preview = [
              ...(cover ? [cover] : []),
              ...keys.filter((k) => k !== cover),
            ].slice(0, PREVIEW_COUNT);

            return (
              <section
                key={d.slug}
                aria-labelledby={`disc-${d.slug}`}
                className="relative h-[62svh] overflow-hidden md:h-[78svh]"
              >
                <PreviewStrip imageKeys={preview} label={d.title} />
                <div
                  className="settle pointer-events-none absolute inset-x-0 bottom-0 z-[2]"
                  style={{
                    paddingInline: "var(--gut)",
                    paddingBottom: 24,
                    paddingTop: 96,
                    background:
                      "linear-gradient(rgba(7,7,10,0) 0%, rgba(7,7,10,.72) 45%, rgba(7,7,10,.94) 100%)",
                  }}
                >
                  <span className="lab num block">{String(i + 1).padStart(2, "0")}</span>
                  <Link
                    id={`disc-${d.slug}`}
                    href={`/${d.slug}/`}
                    className="pointer-events-auto mt-1 block font-display font-600 leading-[1.03] text-chalk no-underline"
                    style={{ fontSize: "clamp(26px,7vw,44px)" }}
                  >
                    {d.title}
                  </Link>
                  <Link
                    href={`/${d.slug}/`}
                    className="lab pointer-events-auto mt-1.5 inline-flex min-h-[32px] items-center no-underline hover:text-chalk"
                  >
                    {keys.length} works →
                  </Link>
                </div>
              </section>
            );
          })}
        </nav>

        <section className="wrap py-14 md:py-20">
          <p className="lab rise">Selected credits</p>
          <ul className="rise-stagger mt-4 grid gap-3">
            {lead.map((c) => (
              <li key={`${c.title}-${c.year}`} className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-[19px]">{c.title}</span>
                <span className="lab num">{c.year}</span>
                {c.director && <span className="lab">Dir. {c.director}</span>}
              </li>
            ))}
          </ul>
          <p className="lab rise mt-6">
            {credits.length} productions ·{" "}
            <Link href="/credits/" className="text-chalk underline underline-offset-4">
              All credits
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
