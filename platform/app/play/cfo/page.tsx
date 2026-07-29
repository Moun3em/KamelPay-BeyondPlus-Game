"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatAed, usePlayerState } from "@/components/ui";
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
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-6">
      <header className="flex items-start justify-between">
        <h1 className="text-2xl font-bold">
          T-{String(session?.tableNo ?? "—").padStart(2, "0")}
        </h1>
        <p className="text-4xl font-bold tabular" aria-label="Clock">
          <span aria-hidden>⏱ </span>
          {formatClock(remaining)}
        </p>
      </header>

      <section className="text-center">
        <p className="text-5xl font-bold tabular">{formatAed(capital)}</p>
        <p className="mt-2 font-semibold tracking-wide">CORPORATE VALUATION</p>
      </section>

      <section className="flex flex-col gap-2">
        {events.slice(0, 3).map((e, i) => (
          <p key={i} className="flex items-center gap-2 text-lg">
            <span aria-hidden>{e.delta_aed >= 0 ? "▲" : "▼"}</span>
            <span className="font-bold tabular">
              {e.delta_aed >= 0 ? "+" : ""}
              {e.delta_aed.toLocaleString()}
            </span>
            <span>{e.kind.replaceAll("_", " ").toLowerCase()}</span>
          </p>
        ))}
        {events.length === 0 ? (
          <p className="text-[var(--muted)]">No events yet.</p>
        ) : null}
      </section>

      <section className="rounded-lg border-2 border-[var(--fg)] p-4">
        <p className="font-bold">
          LEDGER{" "}
          <span className="tabular">
            {ledger?.filed ?? 0} of {ledger?.of ?? 6}
          </span>
          {ledger?.closed ? " — CLOSED" : ""}
        </p>
        <div
          className="mt-3 h-4 w-full border-2 border-[var(--fg)]"
          role="progressbar"
          aria-valuenow={ledger?.filed ?? 0}
          aria-valuemax={6}
        >
          <div
            className="h-full bg-[var(--fg)]"
            style={{ width: `${((ledger?.filed ?? 0) / 6) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-[var(--muted)]">
          Missing:{" "}
          {(ledger?.missing ?? [])
            .map(
              (m) =>
                `${m.archetype} (T-${String(m.held_by_table).padStart(2, "0")})`,
            )
            .join(" · ") || "none"}
        </p>
      </section>

      {data?.banner ? (
        <p className="rounded-lg border-2 border-[var(--c4)] p-3 font-semibold">
          <span aria-hidden>📢 </span>
          {String(data.banner)}
        </p>
      ) : null}
    </main>
  );
}
