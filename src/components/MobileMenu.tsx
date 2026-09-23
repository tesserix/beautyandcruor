"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DISCIPLINES } from "@/lib/site";

/**
 * Phone navigation.
 *
 * 390px is the primary viewport, and before this the header's "Menu" control
 * was a link to /contact-us/ — so on a phone the four disciplines, the credits
 * and the about page were unreachable from anywhere except the homepage. A
 * producer opening a link on their phone could not get to the credits, which
 * is the one thing the site exists to show them (D9).
 *
 * Hand-rolled rather than pulled from a library: it is a button, a panel and an
 * Escape handler, and the JS budget is 150KB for the whole site.
 *
 * Safe to import DISCIPLINES here — @/lib/site is plain constants with no
 * imports of its own, unlike @/lib/credits or @/lib/images, which would drag
 * their JSON into the client bundle.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // aria-modal="true" is a promise that nothing behind the panel is
      // reachable. Without this, Tab walks straight out of the dialog into the
      // page underneath while the overlay still covers it, and focus is
      // somewhere the user cannot see.
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // Hold the page still behind the panel.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus in, so the next Tab lands on a menu link rather than on
    // whatever sits behind the overlay.
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="lab pointer-events-auto min-h-[44px] px-1 md:hidden"
      >
        Menu
      </button>

      {open && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          /* pointer-events-auto is load-bearing: this panel renders inside the
             <header>, which is pointer-events-none so the page stays usable
             under its gradient. Without it every link here is unclickable and
             taps fall through to the image behind. */
          className="pointer-events-auto fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink md:hidden"
          style={{
            paddingInline: "var(--gut)",
            paddingTop: "calc(env(safe-area-inset-top) + 14px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 28px)",
            // Stops a scroll that reaches the end of the panel from chaining
            // to the page behind it.
            overscrollBehavior: "contain",
          }}
        >
          <div className="flex items-center justify-between">
            <span className="lab">Menu</span>
            <button
              type="button"
              onClick={close}
              className="lab min-h-[44px] px-1"
              aria-label="Close menu"
            >
              Close ✕
            </button>
          </div>

          <nav className="mt-8 grid" aria-label="Site">
            {DISCIPLINES.map((d, i) => (
              <MenuLink key={d.slug} href={`/${d.slug}/`} index={i + 1} onNavigate={close}>
                {d.title}
              </MenuLink>
            ))}
            <MenuLink href="/credits/" onNavigate={close}>
              Credits
            </MenuLink>
            <MenuLink href="/about-me/" onNavigate={close}>
              About
            </MenuLink>
            <MenuLink href="/contact-us/" onNavigate={close}>
              Enquire
            </MenuLink>
          </nav>
        </div>
      )}
    </>
  );
}

function MenuLink({
  href,
  children,
  index,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  index?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-baseline gap-3 border-b border-hair py-4 no-underline last:border-0"
    >
      {index !== undefined && (
        <span className="lab num shrink-0">{String(index).padStart(2, "0")}</span>
      )}
      <span className="font-display text-[clamp(24px,7vw,34px)] leading-tight font-600 text-chalk">
        {children}
      </span>
    </Link>
  );
}
