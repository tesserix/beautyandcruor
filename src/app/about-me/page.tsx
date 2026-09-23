import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductionFacts } from "@/components/ProductionFacts";
import { SITE, LOCATIONS } from "@/lib/site";
import { getCredits } from "@/lib/credits";
import { artistPortrait } from "@/lib/galleries";
import { Picture } from "@/components/Picture";

export const metadata: Metadata = {
  title: "About",
  description:
    "Parimiti is a prosthetics, SFX and makeup artist working between Sydney and Mumbai across film, television and editorial.",
  alternates: { canonical: "/about-me/" },
};

export default function About() {
  const portrait = artistPortrait();
  const creditCount = getCredits().length;

  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)" }}>
        {/* Two columns rather than a float. Floated, the portrait left the
            measure entirely: it pinned itself to the far right of the viewport
            while the prose stayed in the gutter, so on a wide display the two
            had no shared edge and the image ran on past the end of the text
            it was meant to sit beside. As a grid cell it shares the measure,
            and on mobile it simply stacks first. */}
        <div className="wrap grid gap-8 pt-10 pb-12 md:grid-cols-[minmax(0,1fr)_minmax(0,34%)] md:items-start md:gap-12 md:pb-20">
          {portrait && (
            <Picture
              imageKey={portrait}
              alt={`${SITE.artist} in the studio`}
              size="portrait"
              priority
              className="settle block w-full md:order-2 md:sticky md:top-[calc(var(--hud)+28px)]"
              imgClassName="w-full h-auto"
            />
          )}
          <section className="md:order-1">
            <p className="lab">About</p>
            <h1 className="mt-2 font-display text-[clamp(32px,9vw,56px)] leading-[1.02] font-600">
              {SITE.artist}
            </h1>
            <div className="mt-5 grid max-w-[58ch] gap-4 text-ash">
              <p>
                <strong className="font-medium text-chalk">
                  Prosthetics, SFX, hair and makeup.
                </strong>{" "}
                {LOCATIONS.map((l) => l.city).join(" and ")}.
              </p>
              <p>
                Lifecast, sculpt, mould, run, apply — the whole pipeline under one pair of
                hands, so a character never gets handed between studios.
              </p>
              <p>
                Feature film, television, editorial and live performance. Trained at SLA and
                the Australian Academy of Cinemagraphic Make-up.
              </p>
            </div>

            {/* The credits live on their own page (D10). This is the route
                across, not a second copy of the list. */}
            <Link
              href="/credits/"
              className="group mt-9 flex items-baseline justify-between gap-4 border-y border-hair py-5 no-underline hover:text-chalk"
            >
              <span>
                <span className="lab block">Credits</span>
                <span className="mt-1 block font-display text-[clamp(20px,5vw,28px)] font-600 text-chalk">
                  {creditCount} productions
                </span>
              </span>
              <span className="lab shrink-0">
                View{" "}
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </span>
            </Link>
          </section>
        </div>

        <ProductionFacts />
      </main>
      <SiteFooter />
    </>
  );
}
