/**
 * The "For Production" facts — what a line producer or UPM checks before they
 * shortlist. Almost no competitor publishes any of this (docs/FINDINGS.md),
 * which is exactly why the block earns its place (D10).
 *
 * EVERY FIELD IS `string | null` ON PURPOSE. `null` means "not answered yet",
 * and the block renders only what is confirmed — an absent row is better than
 * an invented one, because a producer who acts on a wrong turnaround or a
 * wrong insurance status finds out on the day.
 *
 * The unanswered fields are questions in docs/OPEN-QUESTIONS.md. Fill them in
 * here as answers arrive; the surface lights up row by row with no code change.
 */

export type ProductionFact = {
  /** Row label, in the credit register. */
  term: string;
  /** Confirmed value, or null while it is still a question for the client. */
  value: string | null;
  /** Shown under the value. Context a producer needs to read it correctly. */
  note?: string;
};

export const PRODUCTION_FACTS: ProductionFact[] = [
  {
    term: "Based",
    // Confirmed: both cities were published on the old site and are in LOCATIONS.
    value: "Sydney and Mumbai",
    note: "Works across both; travels for production.",
  },
  {
    term: "In-house pipeline",
    // Carried from the About copy, which came from the client.
    value: "Lifecast, sculpt, mould, run, apply",
    note: "A character is never handed between studios.",
  },
  // ---- everything below is waiting on the client -------------------------
  // See docs/OPEN-QUESTIONS.md → "Important, not blocking".
  {
    term: "Workshop turnaround",
    value: null,
    note: "Days from lifecast to first application.",
  },
  {
    term: "Crew",
    value: null,
    note: "Size she can assemble per city, and notice required.",
  },
  {
    term: "Public liability",
    value: null,
  },
  {
    term: "Working With Children Check",
    value: null,
    // Not a footnote: five of the 27 credits are baby-product commercials.
    note: "A real hiring criterion on the commercial work.",
  },
  {
    term: "ABN / GST",
    value: null,
  },
  {
    term: "Availability",
    value: null,
    note: "Only worth publishing if it is kept current.",
  },
];

/** The confirmed rows — the only ones that render. */
export function confirmedFacts(): ProductionFact[] {
  return PRODUCTION_FACTS.filter((f) => f.value !== null);
}
