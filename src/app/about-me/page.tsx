import type { Metadata } from "next";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Credits } from "@/components/Credits";
import { SITE, LOCATIONS } from "@/lib/site";
import { getCredits } from "@/lib/credits";

export const metadata: Metadata = {
  title: "About",
  description:
    "Parimiti is a prosthetics, SFX and makeup artist working between Sydney and Mumbai across film, television and editorial.",
  alternates: { canonical: "/about-me/" },
};

export default function About() {
  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)" }}>
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
        </section>

        {/* TODO(client): the "For Production" block goes here — availability,
            crew, turnaround, insurance, ABN/GST, WWCC. Almost no competitor
            publishes this, which is exactly why it earns its place. Waiting on
            docs/OPEN-QUESTIONS.md. */}

        <Credits credits={getCredits()} />
      </main>
      <SiteFooter />
    </>
  );
}
