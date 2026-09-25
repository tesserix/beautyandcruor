import Link from "next/link";
import { Chrome } from "./Chrome";
import { SiteFooter } from "./SiteFooter";
import { WorkReel } from "./WorkReel";
import { DISCIPLINES, type Discipline } from "@/lib/site";
import { galleryFor } from "@/lib/galleries";
import { JsonLd, breadcrumbSchema } from "@/lib/jsonld";

/**
 * One component for all four disciplines. Full-bleed reel filling the
 * viewport, then the title block, then the next discipline — so the work is
 * the first and largest thing, and the words sit under it.
 */
export function DisciplinePage({ discipline }: { discipline: Discipline }) {
  const keys = galleryFor(discipline.slug);
  const i = DISCIPLINES.findIndex((d) => d.slug === discipline.slug);
  const next = DISCIPLINES[(i + 1) % DISCIPLINES.length];

  return (
    <>
      <Chrome plate />
      <main id="main">
        <h1 className="vh">{discipline.title}</h1>

        <section className="relative h-[100svh]" aria-label={discipline.title}>
          {keys.length > 0 ? (
            <WorkReel imageKeys={keys} label={discipline.title} priorityFirst />
          ) : (
            <div className="grid h-full place-items-center text-ash">No work selected yet</div>
          )}
          <div
            className="pointer-events-none absolute inset-x-0 z-[4]"
            style={{ bottom: "calc(120px + env(safe-area-inset-bottom))", paddingInline: "var(--gut)" }}
          >
            <p className="lab num">{String(i + 1).padStart(2, "0")} · Discipline</p>
            <p
              className="mt-1.5 font-display font-600 leading-[1.02]"
              style={{ fontSize: "clamp(30px,8vw,52px)" }}
            >
              {discipline.title}
            </p>
            {/* Said plainly, alongside the work rather than in front of it.
                See `notice` in @/lib/site for why this is not a gate. */}
            {discipline.notice && (
              /* text-chalk, not text-ash-img: a notice that cannot be read
                 over the photograph it is warning about is decoration. */
              <p className="lab mt-2 text-chalk">{discipline.notice}</p>
            )}
          </div>
        </section>

        <section className="wrap py-12 md:py-20">
          <p className="rise max-w-[52ch] text-ash">{discipline.blurb}</p>
          <p className="lab rise mt-6">
            {keys.length} works ·{" "}
            <span className="text-ash-img">titles and credits pending confirmation</span>
          </p>
          <Link
            href={`/${next.slug}/`}
            className="lab rise group mt-10 flex items-baseline gap-3 border-t border-hair pt-6 no-underline hover:text-chalk"
          >
            Next
            <span className="font-display text-[clamp(20px,5vw,28px)] normal-case tracking-normal text-chalk">
              {next.title}
            </span>
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1.5">
              →
            </span>
          </Link>
        </section>
      </main>
      <JsonLd
        schemas={[
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: discipline.title, path: `/${discipline.slug}/` },
          ]),
        ]}
      />
      <SiteFooter />
    </>
  );
}
