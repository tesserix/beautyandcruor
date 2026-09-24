"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "./Select";

/**
 * Enquiry form for a fully static site.
 *
 * IMPORTANT — Resend cannot be called from the browser. Its API key is a
 * secret; putting it in client code publishes it. So the form posts to
 * /api/enquiry, which nginx proxies to the enquiry sidecar in this pod — see
 * enquiry/main.go. Same origin, so no CORS; loopback only, so the service has
 * no public address; and the key is mounted into the pod, never shipped.
 *
 * The earlier plan named `notification-service` as the destination on the
 * grounds that it was already deployed. It is not — it appears nowhere in
 * tesserix-k8s — and its send endpoint requires auth a static site cannot
 * hold. Resend is the platform's provider and the sidecar calls it directly.
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

/**
 * Same-origin by default. The env var stays as an override for a preview
 * deployment pointing at another environment's endpoint.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_ENQUIRY_ENDPOINT ?? "/api/enquiry";

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
  /**
   * When this form appeared, posted alongside it.
   *
   * The sidecar discards anything completed implausibly fast, and anything
   * from a page old enough to be a replayed capture. Set after mount rather
   * than during render: the markup is prerendered at build time, so a value
   * baked into it would be the build's clock, not the visitor's.
   */
  const startedRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (startedRef.current) startedRef.current.value = String(Date.now());
  }, []);

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

    setState({ status: "sending" });
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        // The sidecar answers a refusal in the site's own voice — too many
        // from one address, or a field it could not use — so show that rather
        // than a generic failure.
        const said = (await res.text()).trim();
        throw new Error(said || `Server responded ${res.status}`);
      }
      setState({ status: "sent" });
      form.reset();
      if (startedRef.current) startedRef.current.value = String(Date.now());
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof Error && err.message && err.message.length < 200
            ? err.message
            : "That didn’t send. Please try again, or email instead.",
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
      <input ref={startedRef} type="hidden" name="started" defaultValue="" />

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
