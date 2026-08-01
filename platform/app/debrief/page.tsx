"use client";

import { useCallback, useEffect, useState } from "react";

type Debrief = {
  total_fines_aed: number;
  x3_wrongly_filed: number;
  fines_by_table: { table_no: number; fines_aed: number }[];
  grn04: {
    played: { tables: number[]; avg_close_min: number | null };
    not_played: { tables: number[]; avg_close_min: number | null };
  };
};

export default function DebriefPage() {
  const [data, setData] = useState<Debrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/debrief");
    if (res.status === 401) {
      setError("session");
      return;
    }
    if (!res.ok) {
      setError("Debrief unavailable");
      return;
    }
    setError(null);
    setData((await res.json()) as Debrief);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error === "session") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Debrief view</h1>
        <p className="text-lg text-[var(--kp-slate)]">Enter the facilitator PIN to unlock the debrief screen.</p>
        <input
          className="tap w-full rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg focus:border-[var(--kp-blue)] focus:outline-none"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Facilitator PIN"
          inputMode="numeric"
        />
        <button
          type="button"
          className="tap w-full rounded-xl bg-[var(--kp-ink)] px-6 py-3 text-lg font-bold text-white"
          onClick={async () => {
            const res = await fetch("/api/console", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "login", pin }),
            });
            if (res.ok) void load();
            else setError("Wrong PIN");
          }}
        >
          Unlock
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-5xl bg-[var(--kp-canvas)] px-8 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-base font-semibold uppercase tracking-[0.12em] text-[var(--kp-slate)]">
            Game debrief
          </p>
          <h1 className="text-4xl font-bold tracking-tight">The room, in numbers</h1>
        </div>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-line)] px-4 py-2 text-lg font-semibold text-[var(--kp-mute)]"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </header>

      {error ? <p className="rounded-2xl border border-[var(--kp-danger)] bg-[var(--kp-danger)]/10 p-4 text-lg font-bold">{error}</p> : null}
      {!data ? <p className="text-lg text-[var(--kp-slate)]">Loading…</p> : null}

      {data ? (
        <>
          <section className="mb-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--kp-line)] bg-white p-6">
              <p className="text-lg font-semibold text-[var(--kp-slate)]">Total fines levied</p>
              <p className="text-5xl font-bold tabular text-[var(--kp-danger)]">AED {data.total_fines_aed.toLocaleString()}</p>
              <p className="mt-2 text-base text-[var(--kp-mute)]">Non-compliance across the room</p>
            </div>
            <div className="rounded-2xl border border-[var(--kp-line)] bg-white p-6">
              <p className="text-lg font-semibold text-[var(--kp-slate)]">Direct-email (X3) invoices wrongly filed</p>
              <p className="text-5xl font-bold tabular text-[var(--kp-ink)]">{data.x3_wrongly_filed}</p>
              <p className="mt-2 text-base text-[var(--kp-mute)]">The #1 trap in the room</p>
            </div>
            <div className="rounded-2xl border border-[var(--kp-line)] bg-white p-6">
              <p className="text-lg font-semibold text-[var(--kp-slate)]">GRN-04 pattern (EPPA)</p>
              <p className="text-3xl font-bold tabular text-[var(--kp-ink)]">
                {data.grn04.played.avg_close_min == null ? "—" : `${data.grn04.played.avg_close_min.toFixed(1)} min`}
                <span className="text-xl font-semibold text-[var(--kp-slate)]"> vs {data.grn04.not_played.avg_close_min == null ? "—" : `${data.grn04.not_played.avg_close_min.toFixed(1)} min`}</span>
              </p>
              <p className="mt-2 text-base text-[var(--kp-mute)]">
                Avg close time — {data.grn04.played.tables.length} table(s) played GRN-04 vs {data.grn04.not_played.tables.length} that did not
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--kp-line)] bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Fines by table</h2>
            <div className="flex flex-wrap gap-3">
              {data.fines_by_table.map((f) => (
                <div key={f.table_no} className="rounded-xl border border-[var(--kp-line)] px-4 py-3">
                  <p className="text-lg font-bold tabular">T-{String(f.table_no).padStart(2, "0")}</p>
                  <p className="text-base tabular text-[var(--kp-danger)]">AED {f.fines_aed.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
