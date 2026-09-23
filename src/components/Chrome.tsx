import Link from "next/link";
import { SITE, DISCIPLINES } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

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
        {/* Journal is deliberately absent (D10): two posts from 2023 signals an
            unattended site. The pages still resolve and stay in the sitemap —
            they are indexed WordPress URLs — they just no longer lead the nav.
            Credits takes the slot, because credits are what convert (D9). */}
        {/* min-h-[32px]: .lab renders ~16px tall, and a standalone link under
            24x24 fails WCAG 2.2 target size (2.5.8). The header is 72px on
            desktop, so the taller hit area costs nothing visually. */}
        <nav className="pointer-events-auto hidden items-center gap-6 md:flex">
          {[
            ...DISCIPLINES.map((d) => ({ href: `/${d.slug}/`, label: d.short })),
            { href: "/credits/", label: "Credits" },
            { href: "/about-me/", label: "About" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="lab inline-flex min-h-[32px] items-center hover:text-chalk"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <MobileMenu />
      </header>

      <Link
        href="/contact-us/"
        /* z-30, below the header's z-40: the mobile menu panel renders inside
           the header, and as equal-z siblings the later-in-DOM pill would
           paint on top of the open menu — an interactive control outside an
           aria-modal dialog. */
        className="fixed z-30 inline-flex items-center rounded-full bg-cruor px-5 py-3.5 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-chalk no-underline shadow-[0_10px_34px_rgba(0,0,0,.5)] hover:bg-[#C8151F]"
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
