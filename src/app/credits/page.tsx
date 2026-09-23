import type { Metadata } from "next";
import Link from "next/link";
import { Chrome } from "@/components/Chrome";
import { SiteFooter } from "@/components/SiteFooter";
import { Credits } from "@/components/Credits";
import { SITE } from "@/lib/site";
import { getCredits, leadCredits } from "@/lib/credits";

/**
 * Credits as a first-class surface (D10), not a section inside About.
 *
 * This is the page the site exists for: the audience is directors, producers
 * and actors deciding whether to hire her (D9), and credits are what convert.
 * The lead block answers "can she do this?" before anyone scrolls; the full
 * filterable list below is the complete record.
 */

export const metadata: Metadata = {
  title: "Credits",
  description:
    "Feature film, television, series and commercial credits for Parimiti — prosthetics, SFX and makeup across Australia, India and the UAE.",
  alternates: { canonical: "/credits/" },
};

export default function CreditsPage() {
  const credits = getCredits();
  // TODO(client): question 3 in docs/OPEN-QUESTIONS.md — she picks the six to
  // eight that lead. Until then: newest first, commercials held back, because
  // a pure date sort opens on five baby-product commercials.
  const lead = leadCredits(credits, 6);

  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)" }}>
        <section className="wrap pt-10">
          <p className="lab">Selected work</p>
          <h1 className="mt-2 font-display text-[clamp(32px,9vw,56px)] leading-[1.02] font-600">
            Credits
          </h1>

          <ul className="rise-stagger mt-9 grid gap-0">
            {lead.map((c) => (
              <li
                key={`${c.title}-${c.year}`}
                className="border-b border-hair py-5 first:border-t md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:items-baseline md:gap-8"
              >
                <span className="font-display text-[clamp(21px,5.5vw,30px)] leading-tight font-600">
                  {c.title}
                </span>
                <span className="lab mt-1.5 block md:mt-0" style={{ letterSpacing: "0.06em" }}>
                  {[
                    c.year,
                    c.inProgress ? "In progress" : c.director && `Dir. ${c.director}`,
                    c.production,
                    c.location,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-2">
            <a
              href={SITE.imdb}
              target="_blank"
              rel="noopener"
              className="lab min-w-[150px] flex-1 border border-hair px-4 py-3 text-center text-chalk no-underline hover:border-chalk"
            >
              IMDb ↗
            </a>
            <Link
              href="/about-me/#for-production"
              className="lab min-w-[150px] flex-1 border border-hair px-4 py-3 text-center text-chalk no-underline hover:border-chalk"
            >
              Booking details
            </Link>
          </div>
        </section>

        <Credits credits={credits} />

        {/* Said out loud rather than quietly asserted. Formats are read off the
            titles (see inferType), and two brand entries are genuinely
            ambiguous — docs/OPEN-QUESTIONS.md. */}
        <div className="wrap pb-16">
          <p className="max-w-[58ch] text-[13.5px] text-ash">
            Production formats and roles are being confirmed with the production
            companies. IMDb carries the verified record.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
