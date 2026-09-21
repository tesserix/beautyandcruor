"use client";

import { useState } from "react";

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
 */

const ENDPOINT = process.env.NEXT_PUBLIC_ENQUIRY_ENDPOINT ?? "";

type State = { status: "idle" | "sending" | "sent" | "error"; message?: string };

export function EnquiryForm() {
  const [state, setState] = useState<State>({ status: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    // Honeypot: bots fill hidden fields, people don't.
    if (data.company) return;

    if (!ENDPOINT) {
      setState({
        status: "error",
        message:
          "This form isn't connected yet. Please email or call instead — we're sorry for the detour.",
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
        message: "That didn't send. Please try again, or email instead.",
      });
    }
  }

  if (state.status === "sent") {
    return (
      <div role="status" className="border border-leaf/40 bg-ink-2 p-5">
        <p className="font-display text-[20px]">Enquiry sent.</p>
        <p className="mt-2 text-ash">
          You'll get a reply to the address you gave. If it's urgent, call.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[440px] gap-3" noValidate={false}>
      <Field id="name" name="name" label="Name" autoComplete="name" required />
      <Field id="email" name="email" label="Email" type="email" autoComplete="email" required />

      <label className="grid gap-1.5">
        <span className="lab">Enquiry</span>
        <select
          id="enquiry"
          name="enquiry"
          defaultValue="Prosthetics — feature film"
          className="min-h-[46px] w-full rounded-sm border border-hair bg-ink-2 px-3 py-3 text-[14px] text-chalk"
        >
          <option>Prosthetics — feature film</option>
          <option>Television series</option>
          <option>Commercial</option>
          <option>Editorial shoot</option>
          <option>Workshop or teaching</option>
          <option>Other</option>
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="lab">Details</span>
        <textarea
          id="details"
          name="details"
          rows={4}
          required
          placeholder="Dates, location, and what you need."
          className="w-full rounded-sm border border-hair bg-ink-2 px-3 py-3 text-[14px] leading-relaxed text-chalk"
        />
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
        className="mt-1 min-h-[48px] rounded-sm bg-chalk px-4 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-ink disabled:opacity-60"
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
  autoComplete,
  required,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="lab">{label}</span>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="min-h-[46px] w-full rounded-sm border border-hair bg-ink-2 px-3 py-3 text-[14px] text-chalk"
      />
    </label>
  );
}
