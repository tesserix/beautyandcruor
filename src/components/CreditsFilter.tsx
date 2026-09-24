"use client";

import { useEffect, useState } from "react";

/**
 * The filterable credit list.
 *
 * IMPORTANT: this imports nothing from @/lib/credits — not even a helper.
 * That module imports src/content/credits.json at the top level, so a single
 * value import would bundle the whole dataset into the client on top of the
 * props it already receives. Same failure Reel.tsx documents for the image
 * manifest. Everything here is display-ready strings computed on the server.
 *
 * Filtering is by type, not by country (D10): country is what the artist cares
 * about, type is what a producer cares about.
 */

export type CreditRow = {
  id: string;
  title: string;
  /**
   * The four-digit year this row is grouped under, NOT the raw value.
   *
   * The source data mixes formats — "PUBG Originals" carries "2019-2020"
   * while two other credits carry "2019". Sorted by parsed year those
   * interleave, so grouping on the raw string produced three groups, two of
   * them headed "2019" with the same React key. Group on the parsed year; the
   * raw span rides in `meta` when it differs, so nothing is lost.
   */
  groupYear: string;
  /** Pre-joined metadata line: year span (when notable), type, role, director, production, location. */
  meta: string;
  /** Filter key. Matched against Chip.type, never shown raw. */
  type: string;
};

export type Chip = { type: string; label: string; count: number };

const ALL = "__all__";

export function CreditsFilter({ rows, chips }: { rows: CreditRow[]; chips: Chip[] }) {
  const [active, setActive] = useState<string>(ALL);

  /**
   * The filter lives in the URL, so "here are her television credits" is a
   * link someone can paste to a producer rather than an instruction to click
   * a chip after arriving.
   *
   * Read after mount, not during render: the markup is prerendered at build
   * time with no query string, so touching location during render would
   * disagree with the server output. Written with replaceState rather than
   * push so the back button leaves the page instead of walking the filters.
   */
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("type");
    if (t && chips.some((c) => c.type === t)) setActive(t);
    // Chips are derived from the dataset and stable for the page's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = (type: string) => {
    setActive(type);
    const url = new URL(window.location.href);
    if (type === ALL) url.searchParams.delete("type");
    else url.searchParams.set("type", type);
    window.history.replaceState(null, "", url);
  };

  const shown = active === ALL ? rows : rows.filter((r) => r.type === active);

  // Rows arrive newest-first and sorted so equal group years are adjacent,
  // so first-seen order is already the right order.
  const groups: [string, CreditRow[]][] = [];
  for (const r of shown) {
    const last = groups[groups.length - 1];
    if (last && last[0] === r.groupYear) last[1].push(r);
    else groups.push([r.groupYear, [r]]);
  }

  return (
    <>
      {/* Sticky under the header: the list runs to 27 rows across a decade of
          year groups, and a filter you have to scroll back to the top to
          change is a filter nobody uses twice. The ink backdrop matches the
          page ground, so it reads as the row parting the list rather than as a
          floating bar. */}
      <div
        className="sticky z-20 -mx-[var(--gut)] flex flex-wrap gap-2 border-b border-hair/60 bg-ink/95 px-[var(--gut)] py-3 backdrop-blur-sm"
        style={{ top: "var(--hud)" }}
        role="group"
        aria-label="Filter credits by production type"
      >
        <FilterChip
          label="All work"
          count={rows.length}
          active={active === ALL}
          onClick={() => select(ALL)}
        />
        {chips.map((c) => (
          <FilterChip
            key={c.type}
            label={c.label}
            count={c.count}
            active={active === c.type}
            onClick={() => select(c.type)}
          />
        ))}
      </div>

      {/* The count is the live region, not the list: a screen reader hears how
          many credits remain instead of 27 rows being re-announced. */}
      <p className="lab mt-5" role="status">
        {shown.length} {shown.length === 1 ? "credit" : "credits"}
      </p>

      {groups.map(([year, items]) => (
        <div key={year} className="mt-8 border-t border-hair pt-4">
          <h3 className="font-display text-[22px] font-600">{year}</h3>
          <ul className="rise-stagger mt-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="grid gap-1 border-b border-hair/70 py-3 transition-[background-color,padding] duration-200 last:border-0 hover:bg-ink-2 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] md:items-baseline md:gap-8 md:px-3 md:hover:px-4"
              >
                <span className="text-[17px] leading-snug">{c.title}</span>
                {c.meta && (
                  <span className="lab" style={{ letterSpacing: "0.06em" }}>
                    {c.meta}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`lab min-h-[40px] rounded-full border px-4 transition-colors ${
        active
          ? "border-chalk bg-chalk text-ink"
          : "border-hair text-ash hover:border-chalk hover:text-chalk"
      }`}
    >
      {label} <span className="num">{count}</span>
    </button>
  );
}
