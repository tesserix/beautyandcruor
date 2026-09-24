"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SITE, DISCIPLINES } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";

/**
 * Persistent interface. Deliberately minimal: the mark, a way in, and the one
 * control the site exists for. Enquire sits in the thumb arc on phones.
 *
 * A client component for one reason: the mark has to know where the page is.
 *
 * On a surface whose opening frame carries the mark at full size, the header
 * mark *is* that mark: it starts transformed onto the opening frame's position
 * at its size, and travels up into the bar as you scroll. One element the whole
 * way, so it reads as the mark moving rather than as one fading out while a
 * second fades in. The opening frame renders its own copy for the no-script and
 * reduced-motion cases, and that copy is hidden the moment this takes over —
 * see `[data-hero-mark]` in globals.css.
 *
 * `solidMark={false}` without a measurable opening mark falls back to the plain
 * crossfade c-immersive specifies.
 */

/** Matches the prototype's `deck.scrollTop > innerHeight * 0.55`. */
const REVEAL_AT = 0.55;

export function Chrome({
  solidMark = true,
  plate = false,
}: {
  solidMark?: boolean;
  /**
   * The page opens with a full-bleed image plate.
   *
   * There the header stays the gradient scrim c-immersive specifies and never
   * solidifies: a rule across a photograph is a seam, and the whole point of
   * the scrim is that the plate runs under it unbroken. Only text surfaces —
   * where rows were visibly dissolving into the top of the window — take the
   * opaque treatment.
   */
  plate?: boolean;
}) {
  // Starts true when the mark is unconditional, so server and first client
  // render agree and nothing flashes during hydration.
  const [past, setPast] = useState(solidMark);
  const [scrolled, setScrolled] = useState(false);
  /** null until the opening mark has been measured, or when motion is off. */
  const [travel, setTravel] = useState<{ dy: number; heroH: number; barH: number } | null>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  /** The bar's own geometry, read from a node nothing ever overrides. */
  const slotRef = useRef<HTMLAnchorElement>(null);
  const progress = useRef(0);

  /**
   * Measure the opening mark against the bar mark once layout has settled.
   *
   * Both sit on the same gutter, so their left edges already agree and only
   * the vertical offset and the size differ — which is why the transform below
   * needs a left-centre origin and no horizontal term.
   */
  useEffect(() => {
    if (solidMark) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const measure = () => {
      const hero = document.querySelector<HTMLElement>("[data-hero-mark]");
      const slot = slotRef.current;
      if (!hero || !slot) return;

      /**
       * The bar geometry comes from the link, never from the mark.
       *
       * The mark is the thing being transformed *and* resized — once it is
       * carrying the opening size, measuring it reports 72px as the bar
       * height, the reduction computes to 1, and the animation solves itself
       * away to nothing. The link keeps the bar's own box at all times, so it
       * is the only honest source for where the mark has to land.
       */
      const h = hero.getBoundingClientRect();
      const m = slot.getBoundingClientRect();

      // Both measure 0 until the fonts and the mask have painted.
      if (!h.height || !m.height) return;
      // h is in viewport coordinates at the current scroll; the bar is fixed.
      // Normalise the opening mark to where it sits with the page at the top.
      const heroCentreAtTop = h.top + window.scrollY + h.height / 2;
      setTravel({
        dy: heroCentreAtTop - (m.top + m.height / 2),
        heroH: h.height,
        barH: m.height,
      });
      document.documentElement.dataset.markTravel = "";
    };

    measure();
    const ro = new ResizeObserver(measure);
    const hero = document.querySelector<HTMLElement>("[data-hero-mark]");
    if (hero) ro.observe(hero);
    ro.observe(document.documentElement);
    return () => {
      ro.disconnect();
      delete document.documentElement.dataset.markTravel;
    };
  }, [solidMark]);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(!plate && y > 8);
      if (!solidMark) setPast(y > window.innerHeight * REVEAL_AT);

      // Written straight to the node rather than through state: this runs on
      // every frame of a scroll, and a re-render per frame is how a smooth
      // transform becomes a janky one.
      const mark = markRef.current;
      if (mark && travel) {
        const p = Math.min(1, Math.max(0, y / (window.innerHeight * REVEAL_AT)));
        progress.current = p;
        const k = 1 - p;
        /**
         * The mark is drawn at the opening size and scaled *down* to the bar,
         * never up.
         *
         * Drawn at the bar's 30px and scaled up 2.4x it was visibly soft: the
         * mask rasterises once at the element's layout size and the transform
         * stretches that bitmap — and `will-change` pins the layer, so it
         * never re-rasterises at the size actually on screen. Downscaling a
         * larger raster has no such problem.
         *
         * -50% keeps it centred on the bar's own line; the travel rides on
         * top of that.
         */
        const scale = 1 + (travel.barH / travel.heroH - 1) * p;
        mark.style.transform = `translateY(calc(-50% + ${travel.dy * k}px)) scale(${scale})`;
      } else if (mark) {
        mark.style.transform = "";
      }
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
  }, [solidMark, plate, travel]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between pointer-events-none"
        /* Gradient scrim, exactly as c-immersive specifies — and deliberately
           no bottom rule: over a photograph that reads as a black seam across
           the plate. Text surfaces deepen the scrim once the page moves (see
           `plate`), which is enough to stop rows showing through it, without
           drawing a line. */
        style={{
          height: "var(--hud)",
          paddingInline: "var(--gut)",
          background: scrolled
            ? "linear-gradient(rgba(7,7,10,.97) 0%, rgba(7,7,10,.93) 62%, rgba(7,7,10,.82) 100%)"
            : "linear-gradient(rgba(7,7,10,.92) 0%, rgba(7,7,10,.66) 62%, rgba(7,7,10,0) 100%)",
          transition: "background .35s ease",
        }}
      >
        <Link
          href="/"
          ref={slotRef}
          className="pointer-events-auto relative block h-[26px] w-[98px] md:h-[30px] md:w-[113px]"
          aria-label={`${SITE.name} — home`}
          /* aria-hidden while invisible: the same link is still reachable in
             the mobile menu, and an opacity-0 link is a focus trap for a
             sighted keyboard user who cannot see where focus went. While the
             mark is travelling it is on screen the whole way, so it stays
             reachable. */
          aria-hidden={travel || past ? undefined : true}
          tabIndex={travel || past ? undefined : -1}
          style={{
            opacity: travel ? 1 : past ? 1 : 0,
            transition: travel ? "none" : "opacity .45s ease",
          }}
        >
          <Logo
            ref={markRef}
            /* The height classes are the unmeasured default — and the size
               measure() reads to work out the reduction. Without them the
               node has no box, so nothing can be measured and the mark never
               appears at all. */
            className="absolute left-0 top-1/2 h-[26px] md:h-[30px]"
            style={{
              // Sized to the opening mark once measured, so every transform
              // from here is a reduction. Falls back to the bar's own size
              // while unmeasured, which is what interior pages use.
              height: travel ? travel.heroH : undefined,
              transformOrigin: "left center",
              // No transition on transform: the scroll position drives it
              // frame by frame, and easing a value that is already following
              // the pointer only adds lag.
              transform: travel ? undefined : "translateY(-50%)",
              willChange: travel ? "transform" : undefined,
            }}
          />
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
