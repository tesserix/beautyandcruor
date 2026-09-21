import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Logo } from "@/components/Logo";
import { SITE, DISCIPLINES } from "@/lib/site";
import { getCredits, leadCredits } from "@/lib/credits";

export const metadata: Metadata = {
  description:
    "Prosthetics, SFX, hair and makeup for film and television. Sydney and Mumbai.",
  alternates: { canonical: "/" },
};

export default function Home() {
  const lead = leadCredits(getCredits(), 6);

  return (
    <>
      <Chrome solidMark={false} />
      <main>
        {/* TODO(content): the opening is a showreel slot. She has no cut reel
            yet; ~10 min of usable footage exists (capture/reels.json). Until
            then this is a typographic holding state, not the design. */}
        <section
          className="flex min-h-[78svh] flex-col justify-end"
          style={{ paddingInline: "var(--gut)", paddingBottom: "96px", paddingTop: "var(--hud)" }}
        >
          <Logo className="h-[clamp(44px,15vw,74px)]" />
          <h1 className="mt-4 font-display text-[clamp(30px,7vw,52px)] leading-[1.03] font-600 max-w-[16ch]">
            {SITE.tagline}
          </h1>
          <p className="lab mt-4">
            {SITE.artist} · Sydney / Mumbai
          </p>
        </section>

        <nav aria-label="Disciplines" className="border-t border-hair">
          {DISCIPLINES.map((d, i) => (
            <Link
              key={d.slug}
              href={`/${d.slug}/`}
              className="flex items-baseline gap-4 border-b border-hair no-underline hover:bg-ink-2"
              style={{ paddingInline: "var(--gut)", paddingBlock: "22px" }}
            >
              <span className="lab num">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-[clamp(22px,6vw,32px)] leading-tight">
                {d.title}
              </span>
            </Link>
          ))}
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
            {getCredits().length} productions · Full list on{" "}
            <Link href="/about-me/" className="text-chalk underline underline-offset-4">
              About
            </Link>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
