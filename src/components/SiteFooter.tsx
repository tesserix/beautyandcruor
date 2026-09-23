import Link from "next/link";
import { SITE, LOCATIONS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-hair"
      style={{
        paddingInline: "var(--gut)",
        // The Enquire pill is fixed bottom-right on every page and every
        // breakpoint, so the last row of the footer has to clear it or the
        // pill sits on top of it. Pill height + its own offset + a gap.
        paddingBlock: "28px calc(var(--gut) + 78px + env(safe-area-inset-bottom))",
      }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="lab">
          © {new Date().getFullYear()} {SITE.artist} · {SITE.name}
        </span>
        <span className="lab">{LOCATIONS.map((l) => l.city).join(" · ")}</span>
      </div>
      {/* Journal is off the main nav (D10) but the pages are live and indexed,
          so the footer is where they stay reachable. */}
      <nav className="mt-3 flex flex-wrap gap-x-5" aria-label="Secondary">
        {/* py-2 is not decoration: .lab renders ~16px tall, and a standalone
            link under 24x24 fails WCAG 2.2 target size (2.5.8). The inline
            links inside paragraphs elsewhere are covered by that rule's
            inline exception; these are not. */}
        {[
          { href: "/credits/", label: "Credits" },
          { href: "/about-me/", label: "About" },
          { href: "/blogs/", label: "Journal" },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="lab inline-flex min-h-[32px] items-center no-underline hover:text-chalk"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 flex flex-wrap gap-2">
        <a
          href={SITE.imdb}
          target="_blank"
          rel="noopener"
          className="lab flex-1 min-w-[140px] border border-hair px-4 py-3 text-center text-chalk no-underline hover:border-chalk"
        >
          IMDb ↗
        </a>
        <a
          href={SITE.instagram}
          target="_blank"
          rel="noopener"
          className="lab flex-1 min-w-[140px] border border-hair px-4 py-3 text-center text-chalk no-underline hover:border-chalk"
        >
          Instagram ↗
        </a>
      </div>
    </footer>
  );
}
