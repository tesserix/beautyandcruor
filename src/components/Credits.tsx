import {
  byYearDesc,
  countsByLocation,
  typesPresent,
  TYPE_LABEL,
  type Credit,
} from "@/lib/credits";
import { CreditsFilter, type Chip, type CreditRow } from "./CreditsFilter";

/**
 * The credibility engine, and the surface this site exists to put in front of
 * a producer (D9/D10).
 *
 * Server component: it resolves the dataset and hands the client filter
 * display-ready strings, so credits.json never crosses the boundary.
 *
 * A producer reads role first, then title. TODO(client): not one of the 27
 * credits has a role — question 1 in docs/OPEN-QUESTIONS.md, and the single
 * biggest gap in the dataset. The slot renders as soon as the data has it.
 */
export function Credits({ credits }: { credits: Credit[] }) {
  const locs = countsByLocation(credits);

  const rows: CreditRow[] = byYearDesc(credits).map((c) => {
    const groupYear = c.year.slice(0, 4);
    return {
    id: `${c.title}-${c.year}`,
    title: c.title,
    groupYear,
    type: c.type,
    meta: [
      // Only when the raw value says more than the heading above it, e.g.
      // "2019-2020" grouped under 2019.
      c.year !== groupYear ? c.year : null,
      TYPE_LABEL[c.type],
      c.role,
      c.inProgress ? "In progress" : c.director && `Dir. ${c.director}`,
      c.production,
      c.location,
    ]
      .filter(Boolean)
      .join(" · "),
    };
  });

  const chips: Chip[] = typesPresent(credits).map((t) => ({
    type: t.type,
    label: TYPE_LABEL[t.type],
    count: t.count,
  }));

  return (
    <section id="credits" aria-labelledby="credits-heading" className="wrap py-14 md:py-20">
      <p className="lab">Credits</p>
      <h2
        id="credits-heading"
        className="mt-2 font-display text-[clamp(26px,7vw,40px)] leading-tight font-600"
      >
        {credits.length} productions
      </h2>
      <p className="lab mt-3">
        {Object.entries(locs)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k} ${v}`)
          .join(" · ")}
      </p>

      <CreditsFilter rows={rows} chips={chips} />
    </section>
  );
}
