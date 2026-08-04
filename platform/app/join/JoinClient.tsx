"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ROLE_LABELS } from "@/lib/config";

const ROLES = ["CFO", "TAX", "CIO", "PROCUREMENT", "OPS", "ALL_ROLES"] as const;

export default function JoinPage() {
  const params = useSearchParams();
  const router = useRouter();
  const initialTable = Number(params.get("t") ?? "");
  const [tableNo, setTableNo] = useState(
    Number.isFinite(initialTable) && initialTable > 0 ? initialTable : 1,
  );
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"pin" | "role">("pin");
  const [taken, setTaken] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshTaken = useCallback(async () => {
    const res = await fetch(`/api/join?t=${tableNo}`);
    if (res.ok) {
      const data = (await res.json()) as { taken_roles: string[] };
      setTaken(data.taken_roles);
    }
  }, [tableNo]);

  useEffect(() => {
    if (step === "role") void refreshTaken();
  }, [step, refreshTaken]);

  const pinValid = pin.length === 6;

  async function submitPin() {
    setError(null);
    if (!pinValid) {
      setError("Enter the 6-character table PIN from your card.");
      return;
    }
    const res = await fetch(`/api/join?t=${tableNo}`);
    if (!res.ok) {
      setError("Unknown table number.");
      return;
    }
    setStep("role");
  }

  async function claim(role: (typeof ROLES)[number]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNo, pin, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Join failed");
        await refreshTaken();
        return;
      }
      const pathRole = role === "TAX" ? "tax" : role.toLowerCase();
      router.push(`/play/${pathRole}`);
    } finally {
      setBusy(false);
    }
  }

  const keypad = useMemo(() => "ACDEFGHJKLMNPQRTUVWXY34679".split(""), []);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-5 py-10">
      <header className="flex items-baseline justify-between">
        <p className="text-lg font-semibold tracking-[0.18em] text-[var(--c3)]">
          JOIN
        </p>
        <button
          type="button"
          className="tap text-lg font-semibold text-[var(--kp-mute)]"
          onClick={() => router.push("/")}
        >
          Cancel
        </button>
      </header>

      <h1 className="text-5xl font-bold leading-none tracking-tight tabular">
        TABLE {String(tableNo).padStart(2, "0")}
      </h1>

      {step === "pin" ? (
        <section className="flex flex-col gap-6">
          <label className="flex flex-col gap-2">
            <span className="text-lg font-semibold">Table number</span>
            <input
              className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-4 text-center text-2xl font-semibold tabular focus:border-[var(--kp-blue)] focus:outline-none"
              type="number"
              min={1}
              max={12}
              value={tableNo}
              onChange={(e) => setTableNo(Number(e.target.value))}
            />
          </label>

          <p
            aria-label={`PIN entry: ${pin.length} of 6 characters`}
            className="text-center text-4xl font-bold tracking-[0.4em] tabular text-[var(--kp-ink)]"
          >
            {pin.padEnd(6, "·")}
          </p>

          <div className="grid grid-cols-6 gap-2">
            {keypad.map((ch) => (
              <button
                key={ch}
                type="button"
                className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white text-xl font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)] active:bg-[var(--kp-tinted)]"
                onClick={() => setPin((p) => (p.length < 6 ? p + ch : p))}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="tap flex-1 rounded-xl border-2 border-[var(--kp-line)] bg-white text-lg font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)]"
              onClick={() => setPin((p) => p.slice(0, -1))}
            >
              Delete
            </button>
            <button
              type="button"
              className="tap flex-1 rounded-xl bg-[var(--kp-blue)] text-lg font-semibold text-white transition-colors hover:bg-[var(--kp-blue-deep)] disabled:opacity-40"
              onClick={() => void submitPin()}
              disabled={!pinValid}
            >
              Continue
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-2xl font-bold">Claim your role</h2>
          <p className="text-lg text-[var(--kp-slate)]">
            Players 1, 2 and 3 are required. One dead phone? Claim All roles.
          </p>
          <div className="flex flex-col gap-3">
            {ROLES.map((role) => {
              const isTaken = taken.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  disabled={isTaken || busy}
                  onClick={() => void claim(role)}
                  className="tap flex min-h-16 items-center justify-between rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 text-left text-lg font-semibold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)] disabled:opacity-40"
                >
                  <span className="flex items-center gap-3">
                    <span aria-hidden className="text-2xl leading-none">
                      {isTaken ? "○" : "●"}
                    </span>
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-base text-[var(--kp-mute)]">
                    {isTaken ? "taken by another device" : "claim"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-xl border-2 border-[var(--c5)] bg-[var(--c5)]/10 p-4 text-lg text-[var(--kp-ink)]"
        >
          <span className="font-bold">Error — </span>
          {error}
        </p>
      ) : null}
    </main>
  );
}