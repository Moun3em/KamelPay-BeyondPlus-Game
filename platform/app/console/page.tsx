"use client";

import { useCallback, useEffect, useState } from "react";
import { PHASES, type Phase } from "@/lib/config";
import { formatClock } from "@/lib/engines/clock";

type ConsoleTeam = {
  table_no: number;
  capital_aed: number;
  devices: string[];
  device_count: number;
  filed: number;
  outage_active: boolean;
  green_unlocked: boolean;
  ledger_closed: boolean;
  badges: string[];
  last_activity: string | null;
};

export default function ConsolePage() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [teams, setTeams] = useState<ConsoleTeam[]>([]);
  const [phase, setPhase] = useState<string>("LOBBY");
  const [paused, setPaused] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState(1);
  const [adjustAmount, setAdjustAmount] = useState("0");
  const [reason, setReason] = useState("");
  const [tradeCard, setTradeCard] = useState("");
  const [tradeFrom, setTradeFrom] = useState("1");
  const [tradeTo, setTradeTo] = useState("2");
  const [setup, setSetup] = useState(true);
  const [tableCount, setTableCount] = useState(6);

  useEffect(() => {
    if (!authed) return;

    const refresh = async () => {
      try {
        const res = await fetch("/api/state?scope=console");
        if (res.status === 401) {
          setAuthed(false);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        setTeams(data.teams ?? []);
        setPhase(data.phase ?? "LOBBY");
        setPaused(data.paused ?? false);
        setRemaining(data.remaining_ms ?? 0);
        setBanner(data.banner ?? "");
      } catch (e) {
        console.error("Refresh failed:", e);
      }
    };

    void refresh();
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [authed]);

  async function login() {
    const res = await fetch("/api/console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", pin }),
    });
    if (!res.ok) {
      setError("Incorrect facilitator PIN");
      return;
    }
    setAuthed(true);
    setError(null);
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/console", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Action failed");
      return;
    }
    setError(null);
    await refresh();
  }

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
        <h1 className="text-2xl font-bold">Facilitator console</h1>
        <input
          className="tap rounded-lg border-2 border-[var(--fg)] bg-transparent px-3"
          type="password"
          placeholder="Facilitator PIN"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <button
          type="button"
          className="tap rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-3 font-bold text-[var(--bg)]"
          onClick={() => void login()}
        >
          Unlock
        </button>
        {error ? <p role="alert">{error}</p> : null}
      </main>
    );
  }

  if (setup && phase === "LOBBY") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
        <div>
          <h1 className="text-3xl font-bold">Event Setup</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">Choose how many tables will participate in this event.</p>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Number of tables</span>
            <input
              type="number"
              min="4"
              max="12"
              value={tableCount}
              onChange={(e) => setTableCount(Math.max(4, Math.min(12, parseInt(e.target.value) || 4)))}
              className="tap w-full rounded-lg border-2 border-[var(--fg)] bg-transparent px-3 py-2 text-center text-xl font-bold"
            />
          </label>
          <p className="rounded-lg bg-[var(--fg)]/5 p-3 text-xs text-[var(--muted)]">
            Tables will be seeded from T-01 through T-{String(tableCount).padStart(2, "0")}. Each table gets 5 roles: CFO, Tax, CIO, Procurement, Operations.
          </p>
        </div>
        <button
          type="button"
          className="tap rounded-lg border-2 border-[var(--fg)] bg-[var(--fg)] py-3 font-bold text-[var(--bg)]"
          onClick={() => setSetup(false)}
        >
          Start LOBBY
        </button>
      </main>
    );
  }

  const activeTeams = teams.filter((t) => t.table_no <= tableCount);
  const flags = activeTeams.filter(
    (t) =>
      t.device_count < 3 ||
      (t.last_activity &&
        Date.now() - new Date(t.last_activity).getTime() > 3 * 60_000),
  );

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Facilitator console</h1>
          <p className="tabular">
            Phase {phase} · {formatClock(remaining)} ·{" "}
            {paused ? "PAUSED" : "RUNNING"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="tap rounded border-2 border-[var(--c1)] px-3 font-bold"
            onClick={() => void act("pause")}
          >
            PAUSE ALL
          </button>
          <button
            type="button"
            className="tap rounded border-2 border-[var(--fg)] px-3 font-bold"
            onClick={() => void act("resume")}
          >
            Resume
          </button>
          <button
            type="button"
            className="tap rounded border-2 border-[var(--c1)] bg-[var(--c1)] px-3 font-bold text-white"
            onClick={() => void act("kill")}
          >
            Kill switch
          </button>
        </div>
      </header>

      <section className="mb-4 flex flex-wrap gap-2">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            className={`tap rounded border-2 px-3 font-semibold ${
              phase === p
                ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
                : "border-[var(--fg)]"
            }`}
            onClick={() => void act("set_phase", { phase: p as Phase })}
          >
            {p}
          </button>
        ))}
      </section>

      <section className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="tap flex-1 rounded border-2 border-[var(--fg)] bg-transparent px-3"
          value={banner}
          onChange={(e) => setBanner(e.target.value)}
          placeholder="Narrative banner"
        />
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] px-4 font-semibold"
          onClick={() => void act("broadcast", { banner })}
        >
          Broadcast
        </button>
      </section>

      {flags.length ? (
        <p className="mb-4 rounded border-2 border-[var(--c1)] p-3 font-semibold">
          <span aria-hidden>⚠ </span>
          Red flags:{" "}
          {flags
            .map((t) => `T-${String(t.table_no).padStart(2, "0")}`)
            .join(", ")}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-base">
          <thead>
            <tr className="border-b-2 border-[var(--fg)]">
              <th className="p-2">Table</th>
              <th className="p-2">Devices</th>
              <th className="p-2">Capital</th>
              <th className="p-2">Filed</th>
              <th className="p-2">Outage</th>
              <th className="p-2">Badges</th>
            </tr>
          </thead>
          <tbody>
            {activeTeams.map((t) => (
              <tr
                key={t.table_no}
                className={`border-b border-[var(--fg)]/30 ${
                  selected === t.table_no ? "bg-[var(--fg)]/5" : ""
                }`}
                onClick={() => setSelected(t.table_no)}
              >
                <td className="p-2 font-bold">
                  T-{String(t.table_no).padStart(2, "0")}
                </td>
                <td className="p-2">
                  {t.device_count} ({t.devices.join(", ") || "none"})
                </td>
                <td className="p-2 tabular">
                  {t.capital_aed.toLocaleString()}
                </td>
                <td className="p-2 tabular">{t.filed}/6</td>
                <td className="p-2">
                  {t.outage_active
                    ? "ACTIVE"
                    : t.green_unlocked
                      ? "resolved"
                      : "—"}
                </td>
                <td className="p-2 text-sm">{t.badges.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-6 grid gap-4 rounded border-2 border-[var(--fg)] p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-xl font-bold">
          Table {String(selected).padStart(2, "0")} actions
        </h2>
        <label className="font-semibold">
          Adjust capital (AED)
          <input
            className="tap mt-1 w-full rounded border-2 border-[var(--fg)] bg-transparent px-3"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
          />
        </label>
        <label className="font-semibold">
          Reason (required)
          <input
            className="tap mt-1 w-full rounded border-2 border-[var(--fg)] bg-transparent px-3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] font-semibold"
          onClick={() =>
            void act("adjust", {
              tableNo: selected,
              amount: Number(adjustAmount),
              reason,
            })
          }
        >
          Grant / deduct
        </button>
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] font-semibold"
          onClick={() => void act("force_resolve_outage", { tableNo: selected })}
        >
          Force-resolve outage
        </button>
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] font-semibold"
          onClick={() => void act("unlock_green", { tableNo: selected })}
        >
          Unlock green deck
        </button>
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] font-semibold"
          onClick={() =>
            void act("award_badge", {
              tableNo: selected,
              badge: "CLEAN_CLOSE",
            })
          }
        >
          Award CLEAN_CLOSE badge
        </button>
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] font-semibold md:col-span-2"
          onClick={() => void act("ensure_badges")}
        >
          Ensure every table has ≥1 badge
        </button>
      </section>

      <section className="mt-6 grid gap-3 rounded border-2 border-[var(--fg)] p-4 md:grid-cols-4">
        <h2 className="md:col-span-4 text-xl font-bold">ASP trade validation</h2>
        <input
          className="tap rounded border-2 border-[var(--fg)] bg-transparent px-3"
          placeholder="Card ID"
          value={tradeCard}
          onChange={(e) => setTradeCard(e.target.value)}
        />
        <input
          className="tap rounded border-2 border-[var(--fg)] bg-transparent px-3"
          placeholder="From table"
          value={tradeFrom}
          onChange={(e) => setTradeFrom(e.target.value)}
        />
        <input
          className="tap rounded border-2 border-[var(--fg)] bg-transparent px-3"
          placeholder="To table (owner)"
          value={tradeTo}
          onChange={(e) => setTradeTo(e.target.value)}
        />
        <button
          type="button"
          className="tap rounded border-2 border-[var(--fg)] bg-[var(--fg)] font-bold text-[var(--bg)]"
          onClick={async () => {
            const res = await fetch("/api/trade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cardId: tradeCard,
                fromTable: Number(tradeFrom),
                toTable: Number(tradeTo),
              }),
            });
            if (!res.ok) {
              const j = await res.json();
              setError(j.error ?? "Trade failed");
            } else {
              setError(null);
              await refresh();
            }
          }}
        >
          Validate trade
        </button>
      </section>

      {error ? (
        <p role="alert" className="mt-4 rounded border-2 border-[var(--c1)] p-3">
          <strong>Error — </strong>
          {error}
        </p>
      ) : null}
    </main>
  );
}
