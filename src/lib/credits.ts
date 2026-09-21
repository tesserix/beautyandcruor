import raw from "@/content/credits.json";

export type Credit = {
  title: string;
  director: string;
  production: string;
  year: string;
  location: string;
  /** TODO(client): her role/department per credit. A producer reads this first. */
  role?: string;
  /** Inferred from the title, not sourced. Replace once the client confirms. */
  type: CreditType;
  /** "Lucky" carries "In Progress" in the director column of the source data. */
  inProgress: boolean;
};

export type CreditType = "Commercial" | "Feature" | "Series" | "Poster" | "Production";

function inferType(title: string): CreditType {
  const t = title.toLowerCase();
  if (t.includes("commercial")) return "Commercial";
  if (t.includes("web series") || t.includes("series")) return "Series";
  if (t.includes("poster")) return "Poster";
  return "Production";
}

export function getCredits(): Credit[] {
  return (raw as Omit<Credit, "type" | "inProgress">[]).map((c) => {
    const inProgress = c.director.trim().toLowerCase() === "in progress";
    return {
      ...c,
      director: inProgress ? "" : c.director,
      type: inferType(c.title),
      inProgress,
    };
  });
}

/** Newest first. The source data is not chronological. */
export function byYearDesc(credits: Credit[]): Credit[] {
  return [...credits].sort((a, b) => {
    const ay = parseInt(a.year.slice(0, 4), 10) || 0;
    const by = parseInt(b.year.slice(0, 4), 10) || 0;
    return by - ay || a.title.localeCompare(b.title);
  });
}

export function groupByYear(credits: Credit[]): [string, Credit[]][] {
  const m = new Map<string, Credit[]>();
  for (const c of byYearDesc(credits)) {
    if (!m.has(c.year)) m.set(c.year, []);
    m.get(c.year)!.push(c);
  }
  return [...m.entries()];
}

export function countsByLocation(credits: Credit[]): Record<string, number> {
  return credits.reduce<Record<string, number>>((a, c) => {
    a[c.location] = (a[c.location] ?? 0) + 1;
    return a;
  }, {});
}

export function countsByType(credits: Credit[]): Record<string, number> {
  return credits.reduce<Record<string, number>>((a, c) => {
    a[c.type] = (a[c.type] ?? 0) + 1;
    return a;
  }, {});
}

/**
 * The credits a film producer should see first.
 *
 * Sorting purely by date puts five baby-product commercials at the top, which
 * is the wrong first impression for a features audience. Until the client
 * confirms her own preferred six to eight, lead with non-commercial work.
 * TODO(client): replace with her chosen list.
 */
export function leadCredits(credits: Credit[], limit = 8): Credit[] {
  return byYearDesc(credits)
    .filter((c) => c.type !== "Commercial")
    .slice(0, limit);
}
