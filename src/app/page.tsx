import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { WorkReel } from "@/components/WorkReel";
import { Picture } from "@/components/Picture";
import { SITE, DISCIPLINES } from "@/lib/site";
import { getCredits, leadCredits } from "@/lib/credits";
import { heroKeys, galleryFor } from "@/lib/galleries";

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

        {/* Opening: the work at full bleed, the mark over it. A showreel takes
            this slot once one is cut — see capture/reels.json. */}
        <section className="relative h-[100svh]" aria-label="Recent character work">
          <WorkReel imageKeys={hero} label="Recent character work" priorityFirst />
          <div
            className="pointer-events-none absolute inset-x-0 z-[4] grid gap-3"
            style={{ bottom: "calc(120px + env(safe-area-inset-bottom))", paddingInline: "var(--gut)" }}
          >
            <Logo className="h-[clamp(44px,14vw,72px)]" />
            <p className="lab" style={{ letterSpacing: "0.22em" }}>
              {SITE.artist} · Sydney / Mumbai
            </p>
          </div>
        </section>

        {/* Each discipline gets a full-bleed plate with its title over it. */}
        <nav aria-label="Disciplines">
          {DISCIPLINES.map((d, i) => {
            const keys = galleryFor(d.slug);
            const cover = keys[0];
            return (
              <Link
                key={d.slug}
                href={`/${d.slug}/`}
                className="relative block h-[62svh] overflow-hidden no-underline md:h-[78svh]"
              >
                {cover && (
                  <Picture
                    imageKey={cover}
                    alt=""
                    size="fullBleed"
                    imgClassName="h-full w-full object-cover"
                    aspectRatio="auto"
                    className="block h-full w-full"
                  />
                )}
                <span
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] block"
                  style={{
                    paddingInline: "var(--gut)",
                    paddingBottom: 24,
                    paddingTop: 72,
                    background:
                      "linear-gradient(rgba(7,7,10,0) 0%, rgba(7,7,10,.72) 40%, rgba(7,7,10,.94) 100%)",
                  }}
                >
                  <span className="lab num block">{String(i + 1).padStart(2, "0")}</span>
                  <span
                    className="mt-1 block font-display font-600 leading-[1.03]"
                    style={{ fontSize: "clamp(26px,7vw,44px)" }}
                  >
                    {d.title}
                  </span>
                  <span className="lab mt-1.5 block">{keys.length} works →</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <section style={{ paddingInline: "var(--gut)" }} className="py-14">
          <p className="lab">Selected credits</p>
          <ul className="mt-4 grid gap-3">
            {lead.map((c) => (
              <li key={`${c.title}-${c.year}`} className="flex flex-wrap items-baseline gap-x-3">
                <span className="font-display text-[19px]">{c.title}</span>
                <span className="lab num">{c.year}</span>
                {c.director && <span className="lab">Dir. {c.director}</span>}
              </li>
            ))}
          </ul>
          <p className="lab mt-6">
            {credits.length} productions ·{" "}
            <Link href="/about-me/#credits" className="text-chalk underline underline-offset-4">
              Full list
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
