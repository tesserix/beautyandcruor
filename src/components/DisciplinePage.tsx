import { Chrome } from "./Chrome";
import { SiteFooter } from "./SiteFooter";
import type { Discipline } from "@/lib/site";

/**
 * One component for all four disciplines, fed different content. They are the
 * same kind of page and should not drift apart.
 *
 * TODO(content): the work grid is intentionally empty until the client
 * confirms the real edit, the real titles and the alt text. Rendering invented
 * captions was flagged in review and must not ship.
 */
export function DisciplinePage({ discipline }: { discipline: Discipline }) {
  return (
    <>
      <Chrome />
      <main style={{ paddingTop: "var(--hud)" }}>
        <section style={{ paddingInline: "var(--gut)" }} className="pt-10 pb-6">
          <p className="lab">Discipline</p>
          <h1 className="mt-2 font-display text-[clamp(32px,9vw,56px)] leading-[1.02] font-600">
            {discipline.title}
          </h1>
          <p className="mt-4 max-w-[52ch] text-ash">{discipline.blurb}</p>
        </section>

        <section
          aria-label={`${discipline.title} work`}
          style={{ paddingInline: "var(--gut)" }}
          className="pb-24"
        >
          <p className="lab">Selected work</p>
          <p className="mt-3 max-w-[52ch] text-ash">
            Awaiting the confirmed edit, titles and credits.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
