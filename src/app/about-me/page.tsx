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
        {portrait && (
          <Picture
            imageKey={portrait}
            alt={`${SITE.artist} in the studio`}
            size="portrait"
            priority
            className="block w-full md:float-right md:ml-8 md:w-[38%]"
            imgClassName="w-full h-auto"
          />
        )}
        <section style={{ paddingInline: "var(--gut)" }} className="pt-10">
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
              Lifecast, sculpt, mould, run, apply — the whole pipeline under one pair of hands, so
              a character never gets handed between studios.
            </p>
            <p>
              Feature film, television, editorial and live performance. Trained at SLA and the
              Australian Academy of Cinemagraphic Make-up.
            </p>
          </div>

          {/* The credits live on their own page (D10). This is the route across,
              not a second copy of the list. */}
          <Link
            href="/credits/"
            className="mt-9 flex items-baseline justify-between gap-4 border-y border-hair py-5 no-underline hover:text-chalk"
          >
            <span>
              <span className="lab block">Credits</span>
              <span className="mt-1 block font-display text-[clamp(20px,5vw,28px)] font-600 text-chalk">
                {creditCount} productions
              </span>
            </span>
            <span className="lab shrink-0">View →</span>
          </Link>
        </section>

        <ProductionFacts />
      </main>
      <SiteFooter />
    </>
  );
}
