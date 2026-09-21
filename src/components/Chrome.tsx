import Link from "next/link";
import { SITE, DISCIPLINES } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * Persistent interface. Deliberately minimal: the mark, a way in, and the one
 * control the site exists for. Enquire sits in the thumb arc on phones.
 */
export function Chrome({ solidMark = true }: { solidMark?: boolean }) {
  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between pointer-events-none"
        style={{
          height: "var(--hud)",
          paddingInline: "var(--gut)",
          background:
            "linear-gradient(rgba(7,7,10,.92) 0%, rgba(7,7,10,.66) 62%, rgba(7,7,10,0) 100%)",
        }}
      >
        <Link
          href="/"
          className="pointer-events-auto"
          aria-label={`${SITE.name} — home`}
          style={{ opacity: solidMark ? 1 : 0, transition: "opacity .45s" }}
        >
          <Logo className="h-[26px] md:h-[30px]" />
        </Link>
        <nav className="pointer-events-auto hidden items-center gap-6 md:flex">
          {DISCIPLINES.map((d) => (
            <Link key={d.slug} href={`/${d.slug}/`} className="lab hover:text-chalk">
              {d.short}
            </Link>
          ))}
          <Link href="/about-me/" className="lab hover:text-chalk">About</Link>
          <Link href="/blogs/" className="lab hover:text-chalk">Journal</Link>
        </nav>
        <Link href="/contact-us/" className="lab pointer-events-auto md:hidden">Menu</Link>
      </header>

      <Link
        href="/contact-us/"
        className="fixed z-40 inline-flex items-center rounded-full bg-cruor px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chalk no-underline shadow-[0_10px_34px_rgba(0,0,0,.5)] hover:bg-[#C8151F]"
        style={{
          right: "var(--gut)",
          bottom: "calc(var(--gut) + env(safe-area-inset-bottom))",
        }}
      >
        Enquire
      </Link>
    </>
  );
}
