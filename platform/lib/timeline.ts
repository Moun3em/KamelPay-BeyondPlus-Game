import { PHASE_DURATIONS_MS, type Phase } from "./config";
import { EVENT_PHASE_ANNOUNCEMENTS } from "./config";
import { elapsedMs, phaseFromElapsed } from "./engines/clock";
import { armMemoryOutagesUnlocked } from "./outage.store";
import {
  appendEvent,
  getGameState,
  setGameState,
  withMemoryTransaction,
} from "./store";
import type { GameStateRow } from "./types";
import { selectStoreKind } from "./store.interface";

const PHASE_ORDER: readonly Phase[] = ["LOBBY", "TUTORIAL", "A", "B", "C", "FROZEN", "DEBRIEF"];
const TIMED_PHASE_ORDER: readonly Phase[] = ["TUTORIAL", "A", "B", "C", "FROZEN"];

export function crossedTimedPhases(current: Phase, target: Phase): Phase[] {
  const currentIndex = TIMED_PHASE_ORDER.indexOf(current);
  const targetIndex = TIMED_PHASE_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex <= currentIndex) return [];
  return TIMED_PHASE_ORDER.slice(currentIndex + 1, targetIndex + 1);
}

export function isForwardPhaseTransition(current: Phase, next: Phase): boolean {
  return PHASE_ORDER.indexOf(next) > PHASE_ORDER.indexOf(current);
}

const PHASE_START_MS: Record<Phase, number> = {
  LOBBY: 0,
  TUTORIAL: 0,
  A: PHASE_DURATIONS_MS.TUTORIAL,
  B: PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A,
  C: PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B,
  FROZEN: PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B + PHASE_DURATIONS_MS.C,
  DEBRIEF: 0,
};

export function phaseStartElapsedMs(phase: Phase): number {
  return PHASE_START_MS[phase];
}

/** A manual phase selection starts that phase from its first active millisecond. */
export function manualPhaseClockPatch(phase: Phase, now = new Date()): Partial<GameStateRow> {
  if (phase === "LOBBY") {
    return {
      phase,
      clock_started_at: null,
      clock_paused_at: null,
      paused_ms_total: 0,
    };
  }
  if (phase === "DEBRIEF") return { phase };
  if (phase === "FROZEN") {
    return { phase, clock_paused_at: now.toISOString() };
  }
  return {
    phase,
    clock_started_at: new Date(now.getTime() - phaseStartElapsedMs(phase)).toISOString(),
    clock_paused_at: null,
    paused_ms_total: 0,
  };
}

export type TimelineResult = { phase: Phase; changed: boolean };

export async function advanceTimelineOnce(now = new Date()): Promise<TimelineResult> {
  if (selectStoreKind() === "memory") return advanceMemoryTimeline(now);
  const { advanceTimelinePg } = await import("./store.pg");
  return advanceTimelinePg(now);
}

/** Memory adapter timeline owner; reads and writes atomically. */
export async function advanceMemoryTimeline(now = new Date()): Promise<TimelineResult> {
  return withMemoryTransaction(() => advanceMemoryTimelineUnlocked(now));
}

/** Called only while the memory transaction mutex is already held. */
export async function advanceMemoryTimelineUnlocked(now = new Date()): Promise<TimelineResult> {
  const current = getGameState();
  if (!current.clock_started_at || current.clock_paused_at || current.phase === "LOBBY" || current.phase === "FROZEN" || current.phase === "DEBRIEF") {
    return { phase: current.phase, changed: false };
  }
  const target = phaseFromElapsed(current.phase, elapsedMs(current, now.getTime()));
  const transitions = crossedTimedPhases(current.phase, target);
  if (transitions.length === 0) return { phase: current.phase, changed: false };

  const generation = new Date(current.clock_started_at).getTime();
  for (const phase of transitions) {
    setGameState({
      phase,
      ...(phase === "FROZEN" ? { clock_paused_at: now.toISOString() } : {}),
    });
    appendEvent({
      table_no: 0,
      actor_role: "SYSTEM",
      kind: "PHASE_CHANGE",
      delta_aed: 0,
      idempotency_key: `timeline:${generation}:${phase}`,
      meta: { phase, via: "timeline" },
    });
    if (phase === "C") await armMemoryOutagesUnlocked(now);
  }
  const lastPhase = transitions.at(-1)!;
  // Event Mode: make the phase announcement the player-facing banner so
  // /api/state polls (not just SSE ticks) deliver it.
  if (getGameState().event_mode) {
    const msg = EVENT_PHASE_ANNOUNCEMENTS[lastPhase];
    if (msg) setGameState({ narrative_banner: msg });
  }
  return { phase: lastPhase, changed: true };
}
