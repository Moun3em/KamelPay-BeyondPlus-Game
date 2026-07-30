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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-lg font-semibold text-[var(--c3)]">Join</p>
        <h1 className="text-3xl font-bold">
          TABLE {String(tableNo).padStart(2, "0")}
        </h1>
      </header>

      {step === "pin" ? (
        <section className="flex flex-col gap-4">
          <label className="text-base font-semibold">
            Table number
            <input
              className="tap mt-2 w-full rounded-lg border-2 border-[var(--fg)] bg-transparent px-3 text-center text-2xl tabular"
              type="number"
              min={1}
              max={12}
              value={tableNo}
              onChange={(e) => setTableNo(Number(e.target.value))}
            />
          </label>
          <p className="text-center text-3xl font-bold tracking-[0.35em] tabular">
            {pin.padEnd(6, "·")}
          </p>
          <div className="grid grid-cols-6 gap-2">
            {keypad.map((ch) => (
              <button
                key={ch}
                type="button"
                className="tap rounded-lg border-2 border-[var(--fg)] font-semibold"
                onClick={() => setPin((p) => (p.length < 6 ? p + ch : p))}
              >
                {ch}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="tap flex-1 rounded-lg border-2 border-[var(--fg)] font-semibold"
              onClick={() => setPin((p) => p.slice(0, -1))}
            >
              Delete
            </button>
            <button
              type="button"
              className="tap flex-1 rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] font-semibold text-[var(--bg)]"
              onClick={() => void submitPin()}
            >
              Continue
            </button>
          </div>
        </section>
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Claim your role</h2>
          <p className="text-[var(--muted)]">
            CFO, Tax and CIO are required. One dead phone? Claim All roles.
          </p>
          {ROLES.map((role) => {
            const isTaken = taken.includes(role);
            return (
              <button
                key={role}
                type="button"
                disabled={isTaken || busy}
                onClick={() => void claim(role)}
                className="tap flex min-h-16 items-center justify-between rounded-lg border-2 border-[var(--fg)] px-4 text-left font-semibold disabled:opacity-40"
              >
                <span className="flex items-center gap-3">
                  <span aria-hidden>{isTaken ? "○" : "●"}</span>
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-lg">
                  {isTaken ? "taken by another device" : "claim"}
                </span>
              </button>
            );
          })}
        </section>
      )}

      {error ? (
        <p role="alert" className="rounded-lg border-2 border-[var(--c1)] p-3">
          <span className="font-bold">Error — </span>
          {error}
        </p>
      ) : null}
    </main>
  );
}
