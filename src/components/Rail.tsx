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
  /** Optional overlay, given the live frame index. Used for the gallery counter. */
  status?: (index: number) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const w = first?.offsetWidth || el.clientWidth || 1;
    setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / w))));
    setAtStart(el.scrollLeft <= 1);
    // 1px of slack: fractional widths mean scrollLeft rarely lands exactly.
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  }, [count]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    // Frames measure 0 until layout settles, and their width changes at breakpoints.
    window.addEventListener("resize", sync);
    window.addEventListener("load", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("load", sync);
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

      {status?.(index)}
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
      /* hidden on coarse pointers: a phone already has the gesture.
         opacity, not display — it has to be focusable by keyboard, and it
         fades in on hover over the rail or on focus. */
      className={`absolute top-1/2 z-[5] hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-chalk/25 bg-ink/70 text-chalk opacity-0 backdrop-blur-sm transition-[opacity,background-color,border-color] duration-300 hover:border-chalk/60 hover:bg-ink/90 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0 group-hover/rail:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:grid`}
      style={dir === -1 ? { left: "calc(var(--gut) / 2)" } : { right: "calc(var(--gut) / 2)" }}
    >
      <svg width="9" height="15" viewBox="0 0 9 15" aria-hidden="true">
        <path
          d={dir === -1 ? "M7.5 1L1.5 7.5L7.5 14" : "M1.5 1L7.5 7.5L1.5 14"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}
