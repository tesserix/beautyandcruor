"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Horizontal, full-bleed reel — one frame per screen on a phone, three or four
 * across on desktop. Native CSS scroll-snap, so the gesture is the OS's and
 * scrolling costs no JavaScript.
 *
 * IMPORTANT: this takes already-rendered frames as `children` and never
 * imports the image layer. Importing <Picture> here pulled
 * src/generated/images.json — all 276 entries and their base64 LQIPs, 316KB —
 * into the client bundle and blew the JS budget by 70KB. The manifest must
 * stay server-side; this component only syncs the counter.
 *
 * Portrait sources would crop to a letterbox sliver if one filled a landscape
 * viewport, hence multi-up on desktop — 71% of the library is portrait.
 */
export function Reel({
  children,
  count,
  label,
}: {
  children: ReactNode;
  count: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const sync = () => {
      const first = el.firstElementChild as HTMLElement | null;
      const w = first?.offsetWidth || el.clientWidth || 1;
      setIndex(Math.max(0, Math.min(count - 1, Math.round(el.scrollLeft / w))));
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [count]);

  return (
    <div className="relative h-full">
      <div
        ref={ref}
        role="group"
        tabIndex={0}
        aria-roledescription="carousel"
        aria-label={label}
        className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ overscrollBehaviorX: "contain" }}
      >
        {children}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[3]"
        style={{
          paddingInline: "var(--gut)",
          paddingBottom: "calc(78px + env(safe-area-inset-bottom))",
          paddingTop: 56,
          background:
            "linear-gradient(rgba(7,7,10,0) 0%, rgba(7,7,10,.74) 30%, rgba(7,7,10,.95) 100%)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="lab num">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <span className="flex max-w-[190px] flex-1 gap-1">
            {Array.from({ length: count }, (_, i) => (
              <i
                key={i}
                className="h-0.5 flex-1 transition-colors"
                style={{
                  background: i === index ? "var(--color-chalk)" : "rgba(242,239,234,.45)",
                }}
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Server-rendered frame. Lives here only so the markup stays in one place. */
export function ReelFrame({ children }: { children: ReactNode }) {
  return (
    <figure className="relative m-0 h-full w-full flex-none snap-start bg-ink-2 md:w-1/3 xl:w-1/4">
      {children}
    </figure>
  );
}
