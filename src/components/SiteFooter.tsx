import Link from "next/link";
import { SITE, LOCATIONS } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer
      className="border-t border-hair"
      style={{ paddingInline: "var(--gut)", paddingBlock: "28px 40px" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="lab">
          © {new Date().getFullYear()} {SITE.artist} · {SITE.name}
        </span>
        <span className="lab">{LOCATIONS.map((l) => l.city).join(" · ")}</span>
      </div>
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
        <Link
          href="/contact-us/"
          className="lab flex-1 min-w-[140px] border border-hair px-4 py-3 text-center text-chalk no-underline hover:border-chalk"
        >
          Enquire
        </Link>
      </div>
    </footer>
  );
}
