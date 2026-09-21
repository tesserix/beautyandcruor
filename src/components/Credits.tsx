import { groupByYear, countsByLocation, type Credit } from "@/lib/credits";

/**
 * The credibility engine. A producer reads role first, then title — so the
 * role slot is rendered whenever present and its absence is visible rather
 * than hidden. TODO(client): roles are not yet in the data.
 */
export function Credits({ credits }: { credits: Credit[] }) {
  const grouped = groupByYear(credits);
  const locs = countsByLocation(credits);

  return (
    <section
      id="credits"
      aria-labelledby="credits-heading"
      style={{ paddingInline: "var(--gut)" }}
      className="py-14"
    >
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

      {grouped.map(([year, rows]) => (
        <div key={year} className="mt-8 border-t border-hair pt-4">
          <h3 className="font-display text-[22px] font-600">{year}</h3>
          <ul className="mt-2">
            {rows.map((c) => (
              <li
                key={`${c.title}-${c.year}`}
                className="grid gap-1 border-b border-hair/70 py-3 last:border-0"
              >
                <span className="text-[17px] leading-snug">{c.title}</span>
                <span className="lab" style={{ letterSpacing: "0.06em" }}>
                  {[
                    c.type,
                    c.role,
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
        </div>
      ))}
    </section>
  );
}
