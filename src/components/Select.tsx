"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A select that can be styled.
 *
 * The native control cannot be: the closed field takes our border and ground,
 * but the open list is drawn by the OS, so on the dark page it dropped a white
 * system menu in a system font with a system accent — the one element on the
 * site that looked like a form rather than like the site.
 *
 * This is the APG combobox-with-listbox pattern rather than a div with a click
 * handler. Focus never leaves the button; the active option is named by
 * `aria-activedescendant`, which is what lets a screen reader follow the arrow
 * keys without the list stealing focus and without a focus trap to unwind.
 *
 * A hidden input carries the value, because a listbox is not a form control
 * and the form is read with `new FormData(form)` — without it the enquiry type
 * would silently not post.
 */
export function Select({
  id,
  name,
  label,
  options,
  defaultValue,
}: {
  id: string;
  name: string;
  label: string;
  options: readonly string[];
  defaultValue?: string;
}) {
  const initial = defaultValue && options.includes(defaultValue) ? defaultValue : options[0];
  const [value, setValue] = useState(initial);
  const [open, setOpen] = useState(false);
  /** Index the arrow keys move; only committed to `value` on selection. */
  const [active, setActive] = useState(() => Math.max(0, options.indexOf(initial)));

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const reactId = useId();
  const listId = `${reactId}-listbox`;
  const labelId = `${reactId}-label`;
  const optionId = (i: number) => `${reactId}-option-${i}`;

  // Pointer down rather than click: a click that starts inside the list and
  // ends outside it should not count as dismissing the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Keep the active option in view when the arrows walk past the edge.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`#${CSS.escape(optionId(active))}`)
      ?.scrollIntoView({ block: "nearest" });
    // optionId is derived from reactId, which is stable for the component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const commit = (i: number) => {
    setValue(options[i]);
    setActive(i);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        if (!open) {
          setOpen(true);
          return;
        }
        setActive((i) => Math.min(options.length - 1, Math.max(0, i + step)));
        return;
      }
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        return;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(options.length - 1);
        }
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) commit(active);
        else setOpen(true);
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        // Tabbing away commits nothing and closes — same as the native control.
        setOpen(false);
        return;
    }
  };

  return (
    <div className="grid gap-1.5">
      <span className="lab" id={labelId}>
        {label}
      </span>

      <div className="relative" ref={rootRef}>
        <button
          type="button"
          id={id}
          ref={buttonRef}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-labelledby={`${labelId} ${id}`}
          aria-activedescendant={open ? optionId(active) : undefined}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={onKeyDown}
          className="flex min-h-[46px] w-full items-center justify-between gap-3 rounded-sm border border-hair bg-ink-2 px-3 py-3 text-left text-[14px] text-chalk transition-colors hover:border-ash/60"
        >
          <span className="truncate">{value}</span>
          <svg
            width="11"
            height="7"
            viewBox="0 0 11 7"
            aria-hidden="true"
            className="shrink-0 transition-transform duration-200"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            <path
              d="M1 1l4.5 4.5L10 1"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="square"
            />
          </svg>
        </button>

        {open && (
          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            aria-labelledby={labelId}
            tabIndex={-1}
            className="absolute inset-x-0 top-[calc(100%+4px)] z-50 m-0 max-h-[248px] list-none overflow-y-auto rounded-sm border border-hair bg-ink-2 p-1 shadow-[0_18px_48px_rgba(0,0,0,.6)]"
          >
            {options.map((opt, i) => {
              const selected = opt === value;
              return (
                <li
                  key={opt}
                  id={optionId(i)}
                  role="option"
                  aria-selected={selected}
                  /* Pointer down, not click: the button keeps focus, so a
                     click would first fire the outside-dismiss handler. */
                  onPointerDown={(e) => {
                    e.preventDefault();
                    commit(i);
                  }}
                  onPointerEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-[2px] px-3 py-2.5 text-[14px] ${
                    i === active ? "bg-ink-3 text-chalk" : "text-ash"
                  }`}
                >
                  <span>{opt}</span>
                  {selected && (
                    <span aria-hidden="true" className="text-leaf">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <input type="hidden" name={name} value={value} />
    </div>
  );
}
