"use client";

import { useRef, useState } from "react";
import { Select } from "./Select";

/**
 * Enquiry form for a fully static site.
 *
 * IMPORTANT — Resend cannot be called from the browser. Its API key is a
 * secret; putting it in client code publishes it. So the form posts to
 * NEXT_PUBLIC_ENQUIRY_ENDPOINT, and something server-side owns the key.
 * Options, in order of preference for this project:
 *
 *   1. The team's existing `notification-service` — already deployed, already
 *      holds credentials, no new third party.
 *   2. A small Cloud Run function that forwards to Resend.
 *   3. A hosted form service (Web3Forms, Formspree) which uses a public access
 *      key designed to be exposed.
 *
 * Until one is chosen the form is inert and says so, rather than silently
 * discarding what someone typed.
 *
 * Fields carry `name` and `autocomplete` — the audit flagged that their
 * absence is a WCAG 2.1 AA 1.3.5 failure, and without `name` nothing posts.
 * No prefilled sample data: the prototype shipped a fabricated client name and
 * email, which a real visitor would have had to clear field by field.
 *
 * Validation is ours rather than the browser's, so an error reads in the
 * site's voice and sits next to its field instead of in an OS bubble. The
 * first invalid field takes focus on submit, which is what a screen reader
 * needs to announce the problem at all.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_ENQUIRY_ENDPOINT ?? "";

/** TODO(client): confirm these are the enquiries she actually wants sorted by. */
const ENQUIRY_TYPES = [
  "Prosthetics — feature film",
  "Television series",
  "Commercial",
  "Editorial shoot",
  "Workshop or teaching",
  "Other",
] as const;

type State = { status: "idle" | "sending" | "sent" | "error"; message?: string };
type Errors = Partial<Record<"name" | "email" | "details", string>>;

export function EnquiryForm() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);

  function validate(data: Record<string, FormDataEntryValue>): Errors {
    const next: Errors = {};
    const name = String(data.name ?? "").trim();
    const email = String(data.email ?? "").trim();
    const details = String(data.details ?? "").trim();

    if (!name) next.name = "Please give a name we can reply to.";
    // Deliberately permissive: the job is to catch a typo, not to adjudicate
    // RFC 5322. Anything with a local part, an @ and a dotted domain passes.
    if (!email) next.email = "Please give an email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "That address looks incomplete — check for a typo.";
    if (!details) next.details = "Tell us the dates and what you need.";

    return next;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // Honeypot: bots fill hidden fields, people don't.
    if (data.company) return;

    const found = validate(data);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    if (!ENDPOINT) {
      setState({
        status: "error",
        message:
          "This form isn’t connected yet. Please email or call instead — we’re sorry for the detour.",
      });
      return;
    }

    setState({ status: "sending" });
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setState({ status: "sent" });
      form.reset();
    } catch {
      setState({
        status: "error",
        message: "That didn’t send. Please try again, or email instead.",
      });
    }
  }

  if (state.status === "sent") {
    return (
      <div role="status" className="border border-leaf/40 bg-ink-2 p-5">
        <p className="font-display text-[20px]">Enquiry sent.</p>
        <p className="mt-2 text-ash">
          You’ll get a reply to the address you gave. If it’s urgent, call.
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      className="grid max-w-[440px] gap-3"
    >
      <Field
        id="name"
        name="name"
        label="Name"
        autoComplete="name"
        error={errors.name}
        onInput={() => setErrors((p) => ({ ...p, name: undefined }))}
      />
      <Field
        id="email"
        name="email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        /* An address is not prose; the red underline is noise and some
           keyboards autocapitalise off the back of it. */
        spellCheck={false}
        autoCapitalize="none"
        error={errors.email}
        onInput={() => setErrors((p) => ({ ...p, email: undefined }))}
      />

      <Select
        id="enquiry"
        name="enquiry"
        label="Enquiry"
        options={ENQUIRY_TYPES}
        defaultValue={ENQUIRY_TYPES[0]}
      />

      <label className="grid gap-1.5">
        <span className="lab">Details</span>
        <textarea
          id="details"
          name="details"
          rows={4}
          placeholder="e.g. 12–18 March, Gold Coast, three burn appliances…"
          aria-invalid={errors.details ? true : undefined}
          aria-describedby={errors.details ? "details-error" : undefined}
          onInput={() => setErrors((p) => ({ ...p, details: undefined }))}
          className="w-full rounded-sm border border-hair bg-ink-2 px-3 py-3 text-[14px] leading-relaxed text-chalk"
        />
        {errors.details && (
          <span id="details-error" className="text-[13px] text-cruor">
            {errors.details}
          </span>
        )}
      </label>

      {/* honeypot — hidden from people, not from bots */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="vh"
      />

      <button
        type="submit"
        disabled={state.status === "sending"}
        className="mt-1 min-h-[48px] rounded-sm bg-chalk px-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink transition-opacity disabled:opacity-60"
      >
        {state.status === "sending" ? "Sending…" : "Send enquiry"}
      </button>

      {state.status === "error" && (
        <p role="alert" className="text-[13px] text-cruor">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  inputMode,
  autoComplete,
  autoCapitalize,
  spellCheck,
  error,
  onInput,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  inputMode?: "text" | "email" | "tel" | "url" | "numeric";
  autoComplete?: string;
  autoCapitalize?: string;
  spellCheck?: boolean;
  error?: string;
  onInput?: () => void;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="lab">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onInput={onInput}
        className="min-h-[46px] w-full rounded-sm border border-hair bg-ink-2 px-3 py-3 text-[14px] text-chalk"
      />
      {error && (
        <span id={`${id}-error`} className="text-[13px] text-cruor">
          {error}
        </span>
      )}
    </label>
  );
}
