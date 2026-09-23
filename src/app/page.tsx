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
      <Chrome solidMark={false} />
      <main>
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
            className="hero-mark pointer-events-none absolute inset-x-0 z-[4] grid gap-3"
            style={{ bottom: "calc(120px + env(safe-area-inset-bottom))", paddingInline: "var(--gut)" }}
          >
            <Logo className="h-[clamp(44px,14vw,72px)]" />
            <p className="lab" style={{ letterSpacing: "0.22em" }}>
              {SITE.artist} · Sydney / Mumbai
            </p>
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
