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

  return (
    <main className="relative min-h-dvh bg-[#121212] px-10 py-8 text-white">
      <div
        className={`absolute right-6 top-6 h-3 w-3 rounded-full ${
          reconnect ? "bg-[#f76b15]" : "bg-[#30a46c]"
        }`}
        title={reconnect ? "Reconnecting" : "Live"}
        aria-label={reconnect ? "Reconnecting" : "Live"}
      />
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-lg text-[#30a46c]">Five-Corner Compliance</p>
          <h1 className="text-4xl font-bold">Live leaderboard</h1>
          <p className="mt-2 text-xl">Phase {phase}</p>
        </div>
        <p className="text-7xl font-bold tabular">{clock}</p>
      </header>

      {banner ? (
        <p className="mb-8 border-2 border-[#f76b15] px-4 py-3 text-2xl font-semibold">
          {banner}
        </p>
      ) : null}

      <ol className="space-y-3">
        {teams.map((t, idx) => (
          <li
            key={t.table_no}
            className="grid grid-cols-[80px_1fr_240px_1fr] items-center gap-4 border-b border-white/20 py-3 text-2xl"
          >
            <span className="font-bold tabular">#{idx + 1}</span>
            <span className="font-bold">
              TABLE {String(t.table_no).padStart(2, "0")}
            </span>
            <span className="text-right font-bold tabular">
              {t.under_review
                ? "under FTA review"
                : `AED ${t.display_aed.toLocaleString()}`}
            </span>
            <span className="text-base text-white/80">
              {(t.badges ?? []).join(" · ") || "—"}
            </span>
          </li>
        ))}
      </ol>

      <footer className="mt-10 text-lg text-white/70">
        {recent.map((r, i) => (
          <span key={i} className="mr-6">
            T-{String(r.table_no).padStart(2, "0")} {r.kind.toLowerCase()}{" "}
            {r.delta_aed
              ? `${r.delta_aed > 0 ? "+" : ""}${r.delta_aed.toLocaleString()} AED`
              : ""}
          </span>
        ))}
      </footer>
    </main>
  );
}
