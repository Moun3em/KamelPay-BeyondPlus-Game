"use client";

import { useEffect, useRef, useState } from "react";
import { formatClock } from "@/lib/engines/clock";
import { FiveCorners } from "@/components/five-corners";

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
  const [pulseKey, setPulseKey] = useState(0);
  const prevRecentSig = useRef("[]");

  const firePulseIfChanged = (next: unknown) => {
    const sig = JSON.stringify(next ?? []);
    if (sig !== prevRecentSig.current) {
      prevRecentSig.current = sig;
      setPulseKey((k) => k + 1);
    }
  };

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
            firePulseIfChanged(msg.recent);
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
        setRecent(data.recent ?? []);
        firePulseIfChanged(data.recent);
      });

    connect();
    return () => es?.close();
  }, []);

  const ranked = [...teams].sort((a, b) => b.display_aed - a.display_aed);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-[var(--kp-ink)] via-[#0A1B33] to-[#071321] px-12 py-10 text-white">
      {/* Ambient constellation — pulses once per scored scan */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <FiveCorners
          pulseKey={pulseKey}
          className="absolute left-1/2 top-1/2 h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2 opacity-35"
        />
      </div>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_10%,transparent_45%,rgba(7,19,33,0.85)_100%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-[calc(100dvh-5rem)] flex-col">
        <div
          className={`absolute right-8 top-8 flex items-center gap-2 ${
            reconnect ? "text-[var(--kp-warn)]" : "text-[var(--kp-success)]"
          }`}
        >
          <span
            className={`h-3 w-3 rounded-full ${
              reconnect ? "bg-[var(--kp-warn)]" : "bg-[var(--kp-success)] kp-live"
            }`}
            title={reconnect ? "Reconnecting" : "Live"}
            aria-label={reconnect ? "Reconnecting" : "Live"}
          />
          <span className="text-lg font-semibold tracking-wide">
            {reconnect ? "RECONNECTING" : "LIVE"}
          </span>
        </div>
        <header className="mb-10 flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold tracking-[0.18em] text-[var(--kp-heat-soft)]">
              FIVE-CORNER COMPLIANCE
            </p>
            <h1 className="mt-2 text-5xl font-bold tracking-tight">
              Live leaderboard
            </h1>
            <p className="mt-2 text-2xl text-white/70">
              Phase{" "}
              <span
                key={phase}
                className="kp-rise inline-block font-bold text-white"
              >
                {phase}
              </span>
            </p>
          </div>
          <p className="font-mono text-8xl font-bold tabular tracking-tight">
            {clock}
          </p>
        </header>

        {banner ? (
          <p className="mb-10 rounded-2xl border-2 border-[var(--kp-warn)] bg-[var(--kp-warn)]/10 px-6 py-4 text-2xl font-semibold text-white">
            <span aria-hidden className="mr-3">
              📢
            </span>
            {banner}
          </p>
        ) : null}

        <ol className="flex flex-col gap-3">
          {ranked.map((t, idx) => (
            <li
              key={t.table_no}
              className={`relative grid grid-cols-[80px_1fr_320px_1fr] items-center gap-4 rounded-2xl border px-6 py-4 text-2xl transition-colors hover:bg-white/10 ${
                idx < 3
                  ? "kp-shimmer-wrap border-white/15 bg-white/[0.07]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              {idx < 3 ? <span className="kp-shimmer" aria-hidden="true" /> : null}
              <span
                className={`font-bold tabular ${
                  idx < 3 ? "text-[var(--kp-heat-soft)]" : "text-white/80"
                }`}
              >
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
              <span className="truncate text-lg text-white/70">
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
                    r.delta_aed > 0
                      ? "text-[var(--kp-success)]"
                      : "text-[var(--kp-danger)]"
                  }
                >
                  {r.delta_aed > 0 ? "+" : ""}
                  {r.delta_aed.toLocaleString()} AED
                </span>
              ) : null}
            </span>
          ))}
        </footer>
      </div>
    </main>
  );
}
