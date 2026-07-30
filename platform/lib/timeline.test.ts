import { beforeEach, describe, expect, it, vi } from "vitest";
import { PHASE_DURATIONS_MS } from "./config";
import { advanceMemoryTimeline, manualPhaseClockPatch } from "./timeline";
import { getGameState, listEvents, listTeams, loadSeedIntoMemory, setGameState } from "./store";

beforeEach(() => {
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("NODE_ENV", "test");
  loadSeedIntoMemory();
});

describe("authoritative timeline", () => {
  it.each([
    [PHASE_DURATIONS_MS.TUTORIAL, "A"],
    [PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A, "B"],
    [PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B, "C"],
    [PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B + PHASE_DURATIONS_MS.C, "FROZEN"],
  ] as const)("advances durably at %i active milliseconds to %s", async (elapsed, phase) => {
    const now = new Date("2026-07-30T05:00:00.000Z");
    setGameState({
      phase: "TUTORIAL",
      clock_started_at: new Date(now.getTime() - elapsed).toISOString(),
      clock_paused_at: null,
      paused_ms_total: 0,
    });

    const result = await advanceMemoryTimeline(now);

    expect(getGameState().phase).toBe(phase);
    expect(result.phase).toBe(phase);
    const expectedTransitions = ["A", "B", "C", "FROZEN"].slice(0, ["A", "B", "C", "FROZEN"].indexOf(phase) + 1);
    expect(listEvents().filter((event) => event.kind === "PHASE_CHANGE").map((event) => event.meta?.phase)).toEqual(expectedTransitions);
    if (phase === "C" || phase === "FROZEN") {
      expect(listTeams().filter((team) => team.outage_scheduled_at !== null)).toHaveLength(10);
    }
  });

  it("does not advance while paused", async () => {
    const now = new Date("2026-07-30T05:20:00.000Z");
    setGameState({
      phase: "A",
      clock_started_at: new Date(now.getTime() - 30 * 60_000).toISOString(),
      clock_paused_at: new Date(now.getTime() - 60_000).toISOString(),
      paused_ms_total: 0,
    });

    const result = await advanceMemoryTimeline(now);

    expect(result).toEqual({ phase: "A", changed: false });
    expect(getGameState().phase).toBe("A");
  });

  it("anchors a manual phase selection at the beginning of that phase", () => {
    const now = new Date("2026-07-30T05:00:00.000Z");
    expect(manualPhaseClockPatch("C", now)).toEqual({
      phase: "C",
      clock_started_at: new Date(now.getTime() - (
        PHASE_DURATIONS_MS.TUTORIAL + PHASE_DURATIONS_MS.A + PHASE_DURATIONS_MS.B
      )).toISOString(),
      clock_paused_at: null,
      paused_ms_total: 0,
    });
  });
});
