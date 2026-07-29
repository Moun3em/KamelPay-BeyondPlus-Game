"use client";

import { useState } from "react";

/**
 * Booking CTA — deliberately outside the game DB / no-PII boundary.
 * Submissions are POSTed to BOOKING_WEBHOOK_URL if set; otherwise shown as confirmation only.
 */
export default function BookPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, org }),
    });
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-10">
      <h1 className="text-3xl font-bold">Book an assessment</h1>
      <p>
        AP Compliance & Operational Risk Assessment — Kamel Pay.
      </p>
      <aside className="rounded-lg border-2 border-[var(--fg)] p-4 text-base">
        <p className="font-bold">Privacy notice</p>
        <p className="mt-2 text-[var(--muted)]">
          This booking form is separate from the simulation. The game database
          contains no personal data. By submitting, you consent to Kamel Pay
          contacting you about the assessment only.
        </p>
      </aside>
      {sent ? (
        <p className="text-xl font-semibold text-[var(--c3)]">
          <span aria-hidden>✓ </span>
          Request received. Thank you.
        </p>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
          <label className="font-semibold">
            Name
            <input
              required
              className="tap mt-1 w-full rounded border-2 border-[var(--fg)] bg-transparent px-3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="font-semibold">
            Work email
            <input
              required
              type="email"
              className="tap mt-1 w-full rounded border-2 border-[var(--fg)] bg-transparent px-3"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="font-semibold">
            Organisation
            <input
              className="tap mt-1 w-full rounded border-2 border-[var(--fg)] bg-transparent px-3"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className="tap rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-3 font-bold text-[var(--bg)]"
          >
            Request booking
          </button>
        </form>
      )}
    </main>
  );
}
