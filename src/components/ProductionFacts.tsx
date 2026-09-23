import Link from "next/link";
import { confirmedFacts } from "@/content/production";

/**
 * "For Production" — the block a line producer reads before shortlisting.
 *
 * Renders only confirmed facts (src/content/production.ts). If a fact has no
 * answer yet it is absent rather than hedged, because a producer costing a day
 * off a guessed turnaround finds out on the day. The enquiry line at the foot
 * carries the rest: asking is a lead, a wrong published number is a bad hire.
 */
export function ProductionFacts() {
  const facts = confirmedFacts();
  if (facts.length === 0) return null;

  return (
    <section
      id="for-production"
      aria-labelledby="for-production-heading"
      style={{ paddingInline: "var(--gut)" }}
      className="border-t border-hair py-14"
    >
      <p className="lab">For production</p>
      <h2
        id="for-production-heading"
        className="mt-2 font-display text-[clamp(24px,6.5vw,36px)] leading-tight font-600"
      >
        Booking details
      </h2>

      <dl className="mt-7 grid max-w-[62ch] gap-0">
        {facts.map((f) => (
          <div
            key={f.term}
            className="grid gap-1 border-b border-hair py-4 last:border-0 sm:grid-cols-[minmax(0,15ch)_1fr] sm:gap-6"
          >
            <dt className="lab pt-0.5">{f.term}</dt>
            <dd className="m-0">
              <span className="block text-[16px] leading-snug text-chalk">{f.value}</span>
              {f.note && <span className="mt-1 block text-[13.5px] text-ash">{f.note}</span>}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-7 max-w-[52ch] text-[14px] text-ash">
        Scheduling, crew and compliance paperwork for a specific shoot —{" "}
        <Link href="/contact-us/" className="text-chalk underline underline-offset-4">
          ask directly
        </Link>{" "}
        and you get it the same day.
      </p>
    </section>
  );
}
