import raw from "@/content/credits.json";

export type Credit = {
  title: string;
  director: string;
  production: string;
  year: string;
  location: string;
  /** TODO(client): her role/department per credit. A producer reads this first. */
  role?: string;
  /**
   * Inferred from the title unless the row states one.
   *
   * An explicit `type` in credits.json wins, because the guess reads the
   * title text and a brand name carries no format word: "Ola Cabs" is a
   * commercial and looked like a generic production until she said so.
   */
  type: CreditType;
  /** "Lucky" carries "In Progress" in the director column of the source data. */
  inProgress: boolean;
};

export type CreditType = "Commercial" | "Feature" | "Series" | "Poster" | "Production";

/**
 * Type is read off the title text and nothing else — the source table has no
 * format column. "Beco Commercial" and "Yaariyan ... Feature Film" say what
 * they are; most titles do not, and those fall to "Production".
 *
 * TODO(client): "Sugar box" is still ambiguous — a brand with no format word,
 * so it may be a commercial sitting in the Production bucket. "Ola Cabs" had
 * the same problem and is now stated outright in the row, which is the escape
 * hatch for any other the guess gets wrong.
 */
function inferType(title: string): CreditType {
  const t = title.toLowerCase();
  if (t.includes("commercial")) return "Commercial";
  if (t.includes("feature")) return "Feature";
  if (t.includes("web series") || t.includes("series")) return "Series";
  if (t.includes("poster")) return "Poster";
  return "Production";
}

/**
 * How each type is written in the interface. "Production" is the bucket for
 * everything whose format the title does not state, and a producer reads it as
 * screen work — which is what it is, minus the two ambiguous brand entries.
 */
export const TYPE_LABEL: Record<CreditType, string> = {
  Feature: "Feature",
  Series: "Series",
  Commercial: "Commercial",
  Poster: "Poster",
  Production: "Film & TV",
};

/** Filter order: what a producer is looking for, longest-form first. */
const TYPE_ORDER: CreditType[] = ["Production", "Feature", "Series", "Commercial", "Poster"];

/** The types actually present, in producer order, with counts — drives the filter. */
export function typesPresent(credits: Credit[]): { type: CreditType; count: number }[] {
  const counts = countsByType(credits);
  return TYPE_ORDER.filter((t) => counts[t] > 0).map((t) => ({ type: t, count: counts[t] }));
}

export function getCredits(): Credit[] {
  return (raw as Omit<Credit, "type" | "inProgress">[]).map((c) => {
    const inProgress = c.director.trim().toLowerCase() === "in progress";
    return {
      ...c,
      director: inProgress ? "" : c.director,
      type: (c as { type?: CreditType }).type ?? inferType(c.title),
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
 * confirms her own preferred six to eight, lead with narrative screen work —
 * commercials and poster shoots are held back for the filtered full list.
 * TODO(client): replace with her chosen list.
 */
export function leadCredits(credits: Credit[], limit = 8): Credit[] {
  return byYearDesc(credits)
    .filter((c) => c.type !== "Commercial" && c.type !== "Poster")
    .slice(0, limit);
}
