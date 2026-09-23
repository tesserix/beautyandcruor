"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The shared horizontal scroller behind both the full galleries and the
 * homepage strips.
 *
 * Native CSS scroll-snap does the scrolling, so the gesture stays the OS's and
 * costs no JavaScript on a phone. What this adds is the desktop half of the
 * story: a pointer has no swipe. The row scrolled only via shift+wheel or a
 * horizontal trackpad gesture, neither of which is discoverable and neither of
 * which a mouse has at all, so on a desktop the galleries read as a static
 * crop of the first three images.
 *
 * The arrows appear on hover and on keyboard focus, never on touch — a phone
 * has the gesture already, and a control over the work is chrome competing
 * with it.
 *
 * IMPORTANT: like Reel, this takes already-rendered frames as `children` and
 * never imports the image layer. Importing <Picture> here would pull the whole
 * generated manifest into the client bundle. See Reel.tsx.
 */
export function Rail({
  children,
  count,
  label,
  className = "",
  status,
}: {
  children: ReactNode;
  count: number;
  label: string;
  /** Extra classes for the scroller itself (frame sizing lives on the frames). */
  className?: string;
  /**
   * Optional overlay, given the first visible frame and how many are on
   * screen. Used for the gallery counter.
   */
  status?: (index: number, perView: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const w = first?.offsetWidth || el.clientWidth || 1;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / w))));
    // Four frames are on screen at xl, so "02 / 05" was true of the leading
    // frame while the rail had already run out of travel — which is why the
    // next arrow looked like it had vanished for no reason.
    setPerView(Math.max(1, Math.min(count, Math.round(el.clientWidth / w))));
    setAtStart(el.scrollLeft <= 1);
    // 1px of slack: fractional widths mean scrollLeft rarely lands exactly.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, [count]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);

    /**
     * Frames measure 0 until their images give them layout, and a `load`
     * listener added here is useless — on a warm cache load has already fired,
     * so the first, pre-layout measurement stuck and the rail believed it was
     * already at the end. That is why the next arrow was disabled on the hero
     * before anyone had scrolled it.
     *
     * A ResizeObserver on the track catches the frames gaining width whenever
     * that happens, cache warm or cold, and covers breakpoint changes too.
     */
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      ro.disconnect();
    };
  }, [sync]);

  const step = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const w = first?.offsetWidth || el.clientWidth || 1;
    el.scrollBy({ left: dir * w, behavior: "smooth" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  return (
    <div className="group/rail relative h-full">
      <div
        ref={ref}
        role="group"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={label}
        onKeyDown={onKeyDown}
        className={`rail h-full snap-x snap-mandatory ${className}`}
      >
        {children}
      </div>

      <RailButton dir={-1} disabled={atStart} onClick={() => step(-1)} label={`${label}, previous`} />
      <RailButton dir={1} disabled={atEnd} onClick={() => step(1)} label={`${label}, next`} />

      {status?.(index, perView)}
    </div>
  );
}

function RailButton({
  dir,
  disabled,
  onClick,
  label,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      /* Hidden on coarse pointers: a phone already has the gesture. On a
         pointer it is always on screen rather than waiting for hover — an
         affordance nobody can see is not an affordance — and a spent
         direction dims instead of disappearing, so the control never looks
         like it broke. */
      className="rail-btn absolute top-1/2 z-[5] h-12 w-12 -translate-y-1/2 rounded-full border border-chalk/45 bg-ink/75 text-chalk shadow-[0_6px_24px_rgba(0,0,0,.55)] backdrop-blur-sm transition-[opacity,background-color,border-color,transform] duration-300 hover:scale-105 hover:border-chalk hover:bg-ink/95 disabled:pointer-events-none disabled:border-chalk/15 disabled:opacity-25"
      style={dir === -1 ? { left: "calc(var(--gut) / 2)" } : { right: "calc(var(--gut) / 2)" }}
    >
      <svg width="10" height="17" viewBox="0 0 9 15" aria-hidden="true">
        <path
          d={dir === -1 ? "M7.5 1L1.5 7.5L7.5 14" : "M1.5 1L7.5 7.5L1.5 14"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
