"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/engines/clock";

type TeamRow = {
  table_no: number;
  display_aed: number;
  under_review: boolean;
  badges: string[];
};

export default function ProjectionPage() {
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [phase, setPhase] = useState("LOBBY");
  const [clock, setClock] = useState("00:00");
  const [banner, setBanner] = useState<string | null>(null);
  const [recent, setRecent] = useState<
    { table_no: number; kind: string; delta_aed: number }[]
  >([]);
  const [reconnect, setReconnect] = useState(false);

  useEffect(() => {
    let es: EventSource | null = null;
    let backoff = 1000;

    const connect = () => {
      setReconnect(false);
      es = new EventSource("/api/stream");
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === "tick") {
            setPhase(msg.phase);
            setClock(msg.clock ?? formatClock(msg.remaining_ms ?? 0));
            setBanner(msg.banner);
            setTeams(msg.teams ?? []);
            setRecent(msg.recent ?? []);
            backoff = 1000;
          }
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        setReconnect(true);
        es?.close();
        setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 15000);
      };
    };

    void fetch("/api/state?scope=projection")
      .then((r) => r.json())
      .then((data) => {
        setPhase(data.phase);
        setClock(data.clock);
        setBanner(data.banner);
        setTeams(data.teams ?? []);
      });

    connect();
    return () => es?.close();
  }, []);

  const ranked = [...teams].sort((a, b) => b.display_aed - a.display_aed);

  return (
    <main className="relative min-h-dvh bg-gradient-to-br from-[var(--kp-ink)] to-[#071321] px-12 py-10 text-white">
      <div
        className={`absolute right-8 top-8 flex items-center gap-2 ${
          reconnect ? "text-[var(--kp-warn)]" : "text-[var(--kp-success)]"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full ${
            reconnect ? "bg-[var(--kp-warn)]" : "bg-[var(--kp-success)]"
          }`}
          title={reconnect ? "Reconnecting" : "Live"}
          aria-label={reconnect ? "Reconnecting" : "Live"}
        />
        <span className="text-base font-semibold tracking-wide">
          {reconnect ? "RECONNECTING" : "LIVE"}
        </span>
      </div>
      <header className="mb-10 flex items-start justify-between">
        <div>
          <p className="text-lg font-semibold tracking-[0.18em] text-[var(--c3)]">
            FIVE-CORNER COMPLIANCE
          </p>
          <h1 className="mt-2 text-5xl font-bold tracking-tight">
            Live leaderboard
          </h1>
          <p className="mt-2 text-2xl text-white/70">
            Phase <span className="font-bold text-white">{phase}</span>
          </p>
        </div>
        <p className="font-mono text-8xl font-bold tabular tracking-tight">
          {clock}
        </p>
      </header>

      {banner ? (
        <p className="mb-10 rounded-2xl border-2 border-[var(--kp-warn)] bg-[var(--kp-warn)]/10 px-6 py-4 text-2xl font-semibold text-white">
          <span aria-hidden className="mr-3">📢</span>
          {banner}
        </p>
      ) : null}

      <ol className="flex flex-col gap-3">
        {ranked.map((t, idx) => (
          <li
            key={t.table_no}
            className="grid grid-cols-[80px_1fr_320px_1fr] items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-2xl transition-colors hover:bg-white/10"
          >
            <span className="font-bold tabular text-[var(--c3)]">
              #{idx + 1}
            </span>
            <span className="font-bold tracking-wide">
              TABLE {String(t.table_no).padStart(2, "0")}
            </span>
            <span className="text-right font-bold tabular text-white">
              {t.under_review
                ? "under FTA review"
                : `AED ${t.display_aed.toLocaleString()}`}
            </span>
            <span className="truncate text-base text-white/70">
              {(t.badges ?? []).join(" · ") || "—"}
            </span>
          </li>
        ))}
      </ol>

      <footer className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-lg text-white/70">
        {recent.slice(0, 6).map((r, i) => (
          <span key={i} className="tabular">
            <span className="font-bold text-white">
              T-{String(r.table_no).padStart(2, "0")}
            </span>{" "}
            {r.kind.toLowerCase().replaceAll("_", " ")}{" "}
            {r.delta_aed ? (
              <span
                className={
                  r.delta_aed > 0 ? "text-[var(--kp-success)]" : "text-[var(--kp-danger)]"
                }
              >
                {r.delta_aed > 0 ? "+" : ""}
                {r.delta_aed.toLocaleString()} AED
              </span>
            ) : null}
          </span>
        ))}
      </footer>
    </main>
  );
}