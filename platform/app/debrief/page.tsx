"use client";

import { useEffect, useState } from "react";

export default function DebriefPage() {
  const [data, setData] = useState<{
    teams: {
      table_no: number;
      capital_aed: number;
      badges: string[];
    }[];
    fines?: number;
    x3_wrong?: number;
  } | null>(null);

  useEffect(() => {
    void (async () => {
      const leaderboard = await fetch("/api/state?scope=leaderboard").then((r) =>
        r.json(),
      );
      let fines = 0;
      let x3 = 0;
      for (const t of leaderboard.teams as { table_no: number }[]) {
        const audit = await fetch(`/api/audit/${t.table_no}`).then((r) =>
          r.json(),
        );
        for (const e of audit.events as {
          kind: string;
          delta_aed: number;
          card_id: string | null;
        }[]) {
          if (e.delta_aed < 0) fines += -e.delta_aed;
          if (e.kind === "FILE_INVALID" && e.card_id?.includes("-X3")) x3 += 1;
        }
      }
      setData({
        teams: leaderboard.teams,
        fines,
        x3_wrong: x3,
      });
    })();
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">Debrief</h1>
      <p className="mt-2 text-[var(--muted)]">
        Room totals for the EPPA Patterns section.
      </p>
      {data ? (
        <section className="mt-8 space-y-4">
          <p className="text-xl">
            Total fines levied:{" "}
            <strong className="tabular">
              AED {(data.fines ?? 0).toLocaleString()}
            </strong>
          </p>
          <p className="text-xl">
            X3 (direct-email) wrongly filed:{" "}
            <strong className="tabular">{data.x3_wrong ?? 0}</strong>
          </p>
          <ol className="mt-6 space-y-2">
            {data.teams.map((t, i) => (
              <li key={t.table_no} className="flex justify-between border-b py-2">
                <span>
                  #{i + 1} TABLE {String(t.table_no).padStart(2, "0")}
                </span>
                <span className="tabular">
                  AED {t.capital_aed.toLocaleString()}
                </span>
                <span className="text-sm">{t.badges.join(", ")}</span>
              </li>
            ))}
          </ol>
          <a
            href="/book"
            className="tap mt-8 inline-flex rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] px-4 py-3 font-bold text-[var(--bg)]"
          >
            Book an assessment
          </a>
        </section>
      ) : (
        <p>Loading…</p>
      )}
    </main>
  );
}
