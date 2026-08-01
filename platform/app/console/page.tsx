"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatClock } from "@/lib/engines/clock";
import { usePlayerState } from "@/components/ui";
import { ACTIVE_TABLES, PHASES } from "@/lib/config";
import { guidanceFor } from "@/lib/console-guide";

export default function ConsolePage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!authed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
        <div>
          <p className="text-base font-semibold tracking-[0.18em] text-[var(--c3)]">
            FACILITATOR CONSOLE
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-tight tracking-tight">
            Enter PIN
          </h1>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 text-2xl font-semibold tracking-widest focus:border-[var(--kp-blue)] focus:outline-none"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          aria-label="Facilitator PIN"
        />
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-blue)] py-4 text-xl font-bold text-white transition-colors hover:bg-[var(--kp-blue-deep)]"
          onClick={async () => {
            const res = await fetch("/api/console", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "login", pin }),
            });
            if (!res.ok) {
              const j = await res.json();
              setError(j.error ?? "Auth failed");
              return;
            }
            setAuthed(true);
            setError(null);
          }}
        >
          Unlock
        </button>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border-2 border-[var(--kp-danger)] bg-[var(--kp-danger)]/10 p-4 text-lg"
          >
            <span className="font-bold">Error — </span>
            {error}
          </p>
        ) : null}
      </main>
    );
  }

  return <ConsoleAuthed />;
}

function ConsoleAuthed() {
  const router = useRouter();
  const { data, refresh } = usePlayerState(2000);
  const phase = String(data?.phase ?? "—");
  const remaining = Number(data?.remaining_ms ?? 0);
  const paused = Boolean(data?.paused);
  const eventMode = Boolean(data?.eventMode);
  const teams = (data?.teams as Array<{
    table_no: number;
    device_count: number;
    devices: string[];
    capital_aed: number;
    filed: number;
    outage_active: boolean;
    green_unlocked: boolean;
    last_activity?: string;
    badges: string[];
  }>) ?? [];
  const [selected, setSelected] = useState<number>(teams[0]?.table_no ?? 1);
  const [reason, setReason] = useState("");
  const [banner, setBanner] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [tradeCard, setTradeCard] = useState("");
  const [tradeFrom, setTradeFrom] = useState("");
  const [tradeTo, setTradeTo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tradeResult, setTradeResult] = useState<{ compliance?: { verdict: string; reason: string; checks: { label: string; passed: boolean }[] } } | null>(null);
  const [showManualPhase, setShowManualPhase] = useState(false);
  const [rescueCard, setRescueCard] = useState("");
  const [activeTablesDraft, setActiveTablesDraft] = useState<number>(Number(data?.activeTables ?? ACTIVE_TABLES.default));

  useEffect(() => {
    setActiveTablesDraft((prev) => {
      const current = Number(data?.activeTables ?? ACTIVE_TABLES.default);
      return prev === Number(data?.activeTables ?? ACTIVE_TABLES.default) ? current : prev;
    });
  }, [data?.activeTables]);

  useEffect(() => {
    if (!teams.find((t) => t.table_no === selected) && teams.length > 0) {
      setSelected(teams[0].table_no);
    }
  }, [teams, selected]);

  const act = useCallback(
    async (action: string, extra: Record<string, unknown> = {}) => {
      setError(null);
      if (!reason.trim() && action !== "login") {
        setError("Audit reason is required for every action.");
        return;
      }
      const res = await fetch("/api/console", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason, idempotencyKey: crypto.randomUUID(), ...extra }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Action failed");
        return;
      }
      setError(null);
      await refresh();
    },
    [reason, refresh],
  );

  const flags = teams.filter(
    (t) =>
      t.device_count < 3 ||
      (t.last_activity &&
        Date.now() - new Date(t.last_activity).getTime() > 3 * 60_000),
  );

  return (
    <main className="mx-auto min-h-dvh max-w-6xl px-5 py-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-[0.18em] text-[var(--c3)]">
            FACILITATOR CONSOLE
          </p>
          <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight">
            Game ops
          </h1>
          <p className="mt-2 text-lg tabular text-[var(--kp-slate)]">
            Phase <span className="font-bold text-[var(--kp-ink)]">{phase}</span>{" "}
            · {formatClock(remaining)} ·{" "}
            <span
              className={`font-bold ${paused ? "text-[var(--kp-warn)]" : "text-[var(--kp-success)]"}`}
            >
              {paused ? "PAUSED" : "RUNNING"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="tap rounded-xl border-2 border-[var(--kp-warn)] px-4 py-2 text-lg font-bold text-[var(--kp-warn)] transition-colors hover:bg-[var(--kp-warn)]/10"
            onClick={() => void act("pause")}
          >
            PAUSE ALL
          </button>
          <button
            type="button"
            className="tap rounded-xl border-2 border-[var(--kp-success)] px-4 py-2 text-lg font-bold text-[var(--kp-success)] transition-colors hover:bg-[var(--kp-success)]/10"
            onClick={() => void act("resume")}
          >
            Resume
          </button>
          <button
            type="button"
            className="tap rounded-xl bg-[var(--kp-danger)] px-4 py-2 text-lg font-bold text-white transition-colors hover:opacity-90"
            onClick={() => void act("kill")}
          >
            Kill switch
          </button>
          <button
            type="button"
            className="tap rounded-xl border-2 border-[var(--kp-danger)] px-4 py-2 text-lg font-bold text-[var(--kp-danger)] transition-colors hover:bg-[var(--kp-danger)]/10"
            onClick={() => void act("reset_game")}
          >
            Reset game (wipe all progress)
          </button>
          <button
            type="button"
            className={`tap rounded-xl border-2 px-4 py-2 text-lg font-bold transition-colors ${
              eventMode
                ? "border-[var(--kp-success)] bg-[var(--kp-success)] text-white"
                : "border-[var(--kp-line)] bg-white text-[var(--kp-ink)] hover:border-[var(--kp-ink)]"
            }`}
            onClick={() => void act("set_event_mode", { eventMode: !eventMode })}
          >
            {eventMode ? "EVENT MODE: ON" : "EVENT MODE: OFF"}
          </button>
          <button
            type="button"
            className="tap rounded-xl border-2 border-[var(--kp-line)] px-4 py-2 text-lg font-semibold text-[var(--kp-mute)] transition-colors hover:border-[var(--kp-ink)]"
            onClick={() => router.push("/debrief")}
          >
            Debrief screen
          </button>
          <button
            type="button"
            className="tap rounded-xl border-2 border-[var(--kp-line)] px-4 py-2 text-lg font-semibold text-[var(--kp-mute)] transition-colors hover:border-[var(--kp-ink)]"
            onClick={() => router.push("/")}
          >
            Exit
          </button>
        </div>
      </header>

      {(() => {
        const guide = guidanceFor(phase as Parameters<typeof guidanceFor>[0], eventMode, paused);
        return (
          <section className="mb-6 rounded-2xl border-2 border-[var(--kp-blue)] bg-[var(--kp-blue)]/10 p-5">
            <h2 className="text-xl font-bold text-[var(--kp-ink)]">🎯 {guide.title}</h2>
            <ol className="mt-2 grid gap-1 text-lg text-[var(--kp-ink)]">
              {guide.steps.map((s, i) => (
                <li key={s} className="flex gap-2">
                  <span className="font-bold tabular text-[var(--kp-blue)]">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </section>
        );
      })()}

      <section className="mb-6 rounded-2xl border border-[var(--kp-line)] bg-white p-4">
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">
            Audit reason
            <span className="ml-2 text-base font-normal text-[var(--kp-mute)]">
              (required for every action)
            </span>
          </span>
          <input
            className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg focus:border-[var(--kp-blue)] focus:outline-none"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this intervention required?"
          />
        </label>
      </section>

      <section className="mb-6">
        <h2 className="mb-1 text-lg font-bold">
          Phase control
          <span className="ml-2 text-base font-normal text-[var(--kp-mute)]">
            {eventMode ? "AUTO — the platform advances phases on the clock. Use manual override only to skip ahead." : "The platform can run phases automatically — turn EVENT MODE on. Manual buttons jump to a phase."}
          </span>
        </h2>
        {eventMode && !showManualPhase ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-[var(--kp-success)] bg-[var(--kp-success)]/10 p-4">
            <span className="text-lg font-bold text-[var(--kp-success)]">⏱ AUTO — next phase on the clock</span>
            <button
              type="button"
              className="tap rounded-xl border-2 border-[var(--kp-line)] px-4 py-2 text-lg font-semibold text-[var(--kp-ink)]"
              onClick={() => setShowManualPhase(true)}
            >
              Manual override
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                className={`tap rounded-xl border-2 px-5 py-3 text-lg font-bold transition-colors ${
                  phase === p
                    ? "border-[var(--kp-blue)] bg-[var(--kp-blue)] text-white"
                    : "border-[var(--kp-line)] bg-white text-[var(--kp-ink)] hover:border-[var(--kp-ink)]"
                }`}
                onClick={() => void act("set_phase", { phase: p })}
              >
                {p}
              </button>
            ))}
            {eventMode ? (
              <button
                type="button"
                className="tap rounded-xl border-2 border-[var(--kp-line)] px-4 py-2 text-lg font-semibold text-[var(--kp-mute)]"
                onClick={() => setShowManualPhase(false)}
              >
                Back to AUTO
              </button>
            ) : null}
          </div>
        )}
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border-2 border-[var(--kp-line)] bg-white p-3">
        <span className="text-lg font-bold text-[var(--kp-ink)]">Active tables</span>
        <select
          aria-label="Active tables count"
          className="tap rounded-lg border-2 border-[var(--kp-line)] bg-white px-3 py-2 text-lg font-bold text-[var(--kp-ink)] focus:border-[var(--kp-blue)] focus:outline-none"
          value={String(activeTablesDraft)}
          onChange={(e) => setActiveTablesDraft(Number(e.target.value))}
        >
          {Array.from({ length: ACTIVE_TABLES.max - ACTIVE_TABLES.min + 1 }, (_, i) => ACTIVE_TABLES.min + i).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-blue)] px-5 py-2 text-lg font-bold text-white transition-colors hover:opacity-90"
          onClick={() => void act("set_active_tables", { activeTables: activeTablesDraft })}
        >
          Set
        </button>
        <span className="text-lg text-[var(--kp-slate)]">
          T-01…T-{String(activeTablesDraft).padStart(2, "0")} in play
          {activeTablesDraft !== Number(data?.activeTables ?? 10) ? " — not yet applied" : ""}
        </span>
      </section>

      <section className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          className="tap flex-1 rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg focus:border-[var(--kp-blue)] focus:outline-none"
          value={banner}
          onChange={(e) => setBanner(e.target.value)}
          placeholder="Narrative banner to broadcast to all tables"
        />
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-ink)] px-6 py-3 text-lg font-bold text-white transition-colors hover:opacity-90"
          onClick={() => void act("broadcast", { banner })}
        >
          Broadcast
        </button>
      </section>

      {flags.length ? (
        <p
          role="status"
          className="mb-6 rounded-2xl border-2 border-[var(--kp-warn)] bg-[var(--kp-warn)]/10 p-4 text-lg"
        >
          <span aria-hidden className="mr-2">⚠</span>
          <span className="font-bold">Red flags: </span>
          {flags
            .map((t) => `T-${String(t.table_no).padStart(2, "0")}`)
            .join(", ")}
        </p>
      ) : null}

      <section className="mb-6 overflow-x-auto rounded-2xl border border-[var(--kp-line)] bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left text-lg">
          <thead>
            <tr className="border-b border-[var(--kp-line)] bg-[var(--kp-canvas-soft)]">
              <th className="p-3 font-bold">Table</th>
              <th className="p-3 font-bold">Devices</th>
              <th className="p-3 font-bold">Capital</th>
              <th className="p-3 font-bold">Filed</th>
              <th className="p-3 font-bold">Outage</th>
              <th className="p-3 font-bold">Badges</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr
                key={t.table_no}
                className={`cursor-pointer border-b border-[var(--kp-line)]/50 transition-colors hover:bg-[var(--kp-canvas-soft)] ${
                  selected === t.table_no ? "bg-[var(--kp-tinted)]" : ""
                }`}
                onClick={() => setSelected(t.table_no)}
              >
                <td className="p-3 font-bold tabular">
                  T-{String(t.table_no).padStart(2, "0")}
                </td>
                <td className="p-3 text-[var(--kp-slate)]">
                  {t.device_count} ({t.devices.join(", ") || "none"})
                </td>
                <td className="p-3 tabular font-bold">
                  {t.capital_aed.toLocaleString()}
                </td>
                <td className="p-3 tabular">{t.filed}/6</td>
                <td className="p-3">
                  {t.outage_active ? (
                    <span className="font-bold text-[var(--kp-danger)]">ACTIVE</span>
                  ) : t.green_unlocked ? (
                    <span className="text-[var(--kp-success)]">resolved</span>
                  ) : (
                    <span className="text-[var(--kp-mute)]">—</span>
                  )}
                </td>
                <td className="p-3 text-base text-[var(--kp-slate)]">
                  {t.badges.join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mb-6 grid gap-4 rounded-2xl border border-[var(--kp-line)] bg-white p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-xl font-bold">
          Table {String(selected).padStart(2, "0")} actions
        </h2>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-lg font-bold">Adjust capital (AED)</span>
          <input
            className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg tabular focus:border-[var(--kp-blue)] focus:outline-none"
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            placeholder="50000 or -50000"
          />
        </label>
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-indigo)] px-4 py-3 text-lg font-bold text-white transition-colors hover:opacity-90"
          onClick={() =>
            void act("adjust", {
              tableNo: selected,
              amount: Number(adjustAmount),
            })
          }
        >
          Grant / deduct
        </button>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-blue)] px-4 py-3 text-lg font-bold text-[var(--kp-blue)] transition-colors hover:bg-[var(--kp-blue)]/10"
          onClick={() =>
            void act("force_resolve_outage", { tableNo: selected })
          }
        >
          Force-resolve outage
        </button>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-success)] px-4 py-3 text-lg font-bold text-[var(--kp-success)] transition-colors hover:bg-[var(--kp-success)]/10"
          onClick={() => void act("unlock_green", { tableNo: selected })}
        >
          Unlock green deck
        </button>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-warn)] px-4 py-3 text-lg font-bold text-[var(--kp-warn)] transition-colors hover:bg-[var(--kp-warn)]/10"
          onClick={() =>
            void act("award_badge", {
              tableNo: selected,
              badge: "CLEAN_CLOSE",
            })
          }
        >
          Award CLEAN_CLOSE
        </button>
        <label className="flex flex-col gap-2 md:col-span-2">
          <span className="text-lg font-bold">
            Scan a card for this table (no phone needed)
            <span className="ml-2 text-base font-normal text-[var(--kp-mute)]">
              Rescue a table with zero devices: type the card ID and press FILE or QUARANTINE.
            </span>
          </span>
          <input
            className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg tabular focus:border-[var(--kp-blue)] focus:outline-none"
            value={rescueCard}
            onChange={(e) => setRescueCard(e.target.value)}
            placeholder="e.g. RED-T01-V1"
          />
        </label>
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-indigo)] px-4 py-3 text-lg font-bold text-white transition-colors hover:opacity-90"
          onClick={() => {
            void act("console_scan", { tableNo: selected, cardId: rescueCard, scanAction: "FILE" });
            setRescueCard("");
          }}
        >
          FILE for this table
        </button>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-indigo)] px-4 py-3 text-lg font-bold text-[var(--kp-indigo)] transition-colors hover:bg-[var(--kp-indigo)]/10"
          onClick={() => {
            void act("console_scan", { tableNo: selected, cardId: rescueCard, scanAction: "QUARANTINE" });
            setRescueCard("");
          }}
        >
          QUARANTINE for this table
        </button>
        <button
          type="button"
          className="tap rounded-xl border-2 border-[var(--kp-line)] bg-[var(--kp-canvas-soft)] px-4 py-3 text-lg font-bold text-[var(--kp-ink)] transition-colors hover:border-[var(--kp-ink)] md:col-span-2"
          onClick={() => void act("ensure_badges")}
        >
          Ensure every table has ≥1 badge
        </button>
      </section>

      <section className="mb-6 grid gap-3 rounded-2xl border border-[var(--kp-line)] bg-white p-5 md:grid-cols-4">
        <div className="md:col-span-4">
          <h2 className="text-xl font-bold">ASP trade validation</h2>
          <p className="mt-1 text-base text-[var(--kp-slate)]">
            1. Take the card the buyer hands you · 2. Type its ID (under the QR) · 3. From = the table handing it in ·
            To = the company named on the invoice (its owner) · 4. Validate. Both tables gain +AED 5,000.
          </p>
        </div>
        <input
          className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg focus:border-[var(--kp-blue)] focus:outline-none"
          placeholder="1. Card ID"
          value={tradeCard}
          onChange={(e) => setTradeCard(e.target.value)}
        />
        <input
          className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg tabular focus:border-[var(--kp-blue)] focus:outline-none"
          placeholder="2. From table"
          value={tradeFrom}
          onChange={(e) => setTradeFrom(e.target.value)}
        />
        <input
          className="tap rounded-xl border-2 border-[var(--kp-line)] bg-white px-4 py-3 text-lg tabular focus:border-[var(--kp-blue)] focus:outline-none"
          placeholder="3. To table (owner)"
          value={tradeTo}
          onChange={(e) => setTradeTo(e.target.value)}
        />
        <button
          type="button"
          className="tap rounded-xl bg-[var(--kp-blue)] px-4 py-3 text-lg font-bold text-white transition-colors hover:bg-[var(--kp-blue-deep)]"
          onClick={async () => {
            const res = await fetch("/api/trade", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cardId: tradeCard,
                fromTable: Number(tradeFrom),
                toTable: Number(tradeTo),
                doubled: false,
                reason,
                idempotencyKey: crypto.randomUUID(),
              }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(j.error ?? "Trade failed");
              setTradeResult(null);
            } else {
              setError(null);
              setTradeResult(j as { compliance?: { verdict: string; reason: string; checks: { label: string; passed: boolean }[] } });
              await refresh();
            }
          }}
        >
          Validate trade
        </button>
        {tradeResult?.compliance ? (
          <div className="md:col-span-4 rounded-xl border-2 border-[var(--kp-success)] bg-[var(--kp-success)]/10 p-4">
            <p className="text-lg font-bold text-[var(--kp-success)]">✅ {tradeResult.compliance.verdict}</p>
            <p className="text-base text-[var(--kp-ink)]">{tradeResult.compliance.reason}</p>
            <ul className="mt-2 grid gap-1 text-base">
              {tradeResult.compliance.checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <span aria-hidden>{c.passed ? "✓" : "✗"}</span>
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-2xl border-2 border-[var(--kp-danger)] bg-[var(--kp-danger)]/10 p-4 text-lg"
        >
          <span className="font-bold">Error — </span>
          {error}
        </p>
      ) : null}
    </main>
  );
}