"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatAed, PhaseBanner, usePlayerState } from "@/components/ui";
import { formatClock } from "@/lib/engines/clock";

export default function CfoPage() {
  const router = useRouter();
  const { data, error } = usePlayerState(2000);

  useEffect(() => {
    if (error === "session") router.replace("/join");
  }, [error, router]);

  const session = data?.session as { tableNo: number } | undefined;
  const ledger = data?.ledger as {
    filed: number;
    of: number;
    closed: boolean;
    missing: { archetype: string; held_by_table: number }[];
  } | undefined;
  const events = (data?.events as { kind: string; delta_aed: number }[]) ?? [];
  const capital = Number(data?.capital_aed ?? 0);
  const remaining = Number(data?.remaining_ms ?? 0);

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-5 py-6">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold tracking-[0.12em] text-[var(--c3)]">
            CHIEF FINANCIAL OFFICER
          </p>
          <h1 className="mt-1 text-4xl font-bold leading-none tabular">
            T-{String(session?.tableNo ?? "—").padStart(2, "0")}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold tracking-[0.12em] text-[var(--kp-mute)]">
            TIME LEFT
          </p>
          <p className="mt-1 text-3xl font-bold tabular" aria-label="Clock">
            {formatClock(remaining)}
          </p>
        </div>
      </header>

      <section className="rounded-2xl bg-gradient-to-br from-[var(--kp-ink)] to-[var(--kp-blue-deep)] p-6 text-white shadow-lg">
        <p className="text-base font-semibold tracking-[0.18em] text-white/70">
          CORPORATE VALUATION
        </p>
        <p className="mt-2 text-5xl font-bold tabular">{formatAed(capital)}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold tracking-wide">Recent events</h2>
        <div className="flex flex-col gap-2">
          {events.slice(0, 3).map((e, i) => (
            <p
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[var(--kp-line)] bg-white px-4 py-3 text-lg"
            >
              <span
                aria-hidden
                className={`text-xl ${e.delta_aed >= 0 ? "text-[var(--kp-success)]" : "text-[var(--kp-danger)]"}`}
              >
                {e.delta_aed >= 0 ? "▲" : "▼"}
              </span>
              <span className="font-bold tabular">
                {e.delta_aed >= 0 ? "+" : ""}
                {e.delta_aed.toLocaleString()}
              </span>
              <span className="text-[var(--kp-slate)]">
                {e.kind.replaceAll("_", " ").toLowerCase()}
              </span>
            </p>
          ))}
          {events.length === 0 ? (
            <p className="text-lg text-[var(--kp-mute)]">No events yet.</p>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--kp-line)] bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-lg font-bold tracking-wide">LEDGER</p>
          <p className="tabular text-2xl font-bold">
            {ledger?.filed ?? 0}
            <span className="text-[var(--kp-mute)]">/{ledger?.of ?? 6}</span>
          </p>
        </div>
        <div
          className="mt-4 h-3 w-full overflow-hidden rounded-full bg-[var(--kp-tinted)]"
          role="progressbar"
          aria-valuenow={ledger?.filed ?? 0}
          aria-valuemax={6}
        >
          <div
            className="h-full bg-[var(--kp-blue)] transition-[width]"
            style={{ width: `${((ledger?.filed ?? 0) / 6) * 100}%` }}
          />
        </div>
        <p className="mt-4 text-lg text-[var(--kp-slate)]">
          <span className="font-semibold">Missing:</span>{" "}
          {(ledger?.missing ?? [])
            .map(
              (m) =>
                `${m.archetype} (T-${String(m.held_by_table).padStart(2, "0")})`,
            )
            .join(" · ") || "none"}
        </p>
        {ledger?.closed ? (
          <p className="mt-4 rounded-xl bg-[var(--kp-success)]/10 px-4 py-3 text-lg font-bold text-[var(--kp-success)]">
            ✓ Ledger closed
          </p>
        ) : null}
      </section>

      {data?.banner ? <PhaseBanner text={String(data.banner)} /> : null}
    </main>
  );
}