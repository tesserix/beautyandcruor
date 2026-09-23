"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SITE, DISCIPLINES } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

/**
 * Persistent interface. Deliberately minimal: the mark, a way in, and the one
 * control the site exists for. Enquire sits in the thumb arc on phones.
 *
 * A client component for one reason: the mark has to know where the page is.
 * `solidMark={false}` is used on surfaces whose opening frame carries the mark
 * at full size (the homepage). There the header mark stays out of the way and
 * fades in once that frame is behind you, so the two are never on screen
 * together — the behaviour c-immersive.src.html specified and the build then
 * froze into a static prop, which left the homepage with no header mark at all
 * at any scroll position.
 */

/** Matches the prototype's `deck.scrollTop > innerHeight * 0.55`. */
const REVEAL_AT = 0.55;

export function Chrome({ solidMark = true }: { solidMark?: boolean }) {
  // Starts true when the mark is unconditional, so server and first client
  // render agree and nothing flashes during hydration.
  const [past, setPast] = useState(solidMark);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 8);
      if (!solidMark) setPast(y > window.innerHeight * REVEAL_AT);
    };
    // Coalesce to one read per frame: scroll fires far faster than paint.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [solidMark]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between pointer-events-none"
        /* At rest the header is a gradient scrim, so the opening plate runs
           under it unbroken. Once the page moves it becomes opaque: the
           gradient is transparent across its lower third, and over a text
           surface — the credits list especially, now that the filter bar
           sticks directly beneath it — that read as rows dissolving into the
           top of the window rather than as depth. */
        style={{
          height: "var(--hud)",
          paddingInline: "var(--gut)",
          background: scrolled
            ? "rgba(7,7,10,.94)"
            : "linear-gradient(rgba(7,7,10,.92) 0%, rgba(7,7,10,.66) 62%, rgba(7,7,10,0) 100%)",
          backdropFilter: scrolled ? "blur(10px)" : undefined,
          WebkitBackdropFilter: scrolled ? "blur(10px)" : undefined,
          borderBottom: `1px solid ${scrolled ? "var(--color-hair)" : "transparent"}`,
          transition: "background .35s ease, border-color .35s ease",
        }}
      >
        <Link
          href="/"
          className="pointer-events-auto"
          aria-label={`${SITE.name} — home`}
          /* aria-hidden while invisible: the same link is still reachable in
             the mobile menu, and an opacity-0 link is a focus trap for a
             sighted keyboard user who cannot see where focus went. */
          aria-hidden={past ? undefined : true}
          tabIndex={past ? undefined : -1}
          style={{
            opacity: past ? 1 : 0,
            // Rises the last few pixels into place rather than appearing flat.
            transform: past ? "none" : "translateY(-6px)",
            transition: "opacity .45s ease, transform .45s ease",
          }}
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
