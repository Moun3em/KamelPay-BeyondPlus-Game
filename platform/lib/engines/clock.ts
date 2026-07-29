import { PHASE_DURATIONS_MS, type Phase } from "../config";
import type { GameStateRow } from "../types";

export function elapsedMs(gs: GameStateRow, now = Date.now()): number {
  if (!gs.clock_started_at) return 0;
  const start = new Date(gs.clock_started_at).getTime();
  let paused = gs.paused_ms_total ?? 0;
  if (gs.clock_paused_at) {
    paused += now - new Date(gs.clock_paused_at).getTime();
  }
  return Math.max(0, now - start - paused);
}

export function isPaused(gs: GameStateRow): boolean {
  return Boolean(gs.clock_paused_at);
}

export function inFinalFiveMinutes(gs: GameStateRow, now = Date.now()): boolean {
  // Final 5 minutes of Phase C (total A+B+C = 60 min active play after tutorial)
  const e = elapsedMs(gs, now);
  const tutorial = PHASE_DURATIONS_MS.TUTORIAL;
  const playMs =
    PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B + PHASE_DURATIONS_MS.C;
  const end = tutorial + playMs;
  return e >= end - 5 * 60_000 && e < end;
}

/** Auto phase from elapsed time once clock has started (LOBBY→TUTORIAL is manual). */
export function phaseFromElapsed(
  current: Phase,
  elapsed: number,
): Phase {
  if (current === "LOBBY" || current === "FROZEN" || current === "DEBRIEF") {
    return current;
  }
  if (current === "TUTORIAL") {
    if (elapsed < PHASE_DURATIONS_MS.TUTORIAL) return "TUTORIAL";
    // After tutorial, A starts — elapsed continues from clock_started_at
  }
  const t = PHASE_DURATIONS_MS.TUTORIAL;
  const a = t + PHASE_DURATIONS_MS.A;
  const b = a + PHASE_DURATIONS_MS.B;
  const c = b + PHASE_DURATIONS_MS.C;
  if (elapsed < t) return "TUTORIAL";
  if (elapsed < a) return "A";
  if (elapsed < b) return "B";
  if (elapsed < c) return "C";
  return "FROZEN";
}

export function remainingInPhaseMs(gs: GameStateRow, now = Date.now()): number {
  const e = elapsedMs(gs, now);
  const phase = gs.phase;
  const t = PHASE_DURATIONS_MS.TUTORIAL;
  const aEnd = t + PHASE_DURATIONS_MS.A;
  const bEnd = aEnd + PHASE_DURATIONS_MS.B;
  const cEnd = bEnd + PHASE_DURATIONS_MS.C;
  switch (phase) {
    case "TUTORIAL":
      return Math.max(0, t - e);
    case "A":
      return Math.max(0, aEnd - e);
    case "B":
      return Math.max(0, bEnd - e);
    case "C":
      return Math.max(0, cEnd - e);
    default:
      return 0;
  }
}

export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
