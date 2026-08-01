import { beforeEach, describe, expect, it, vi } from "vitest";
import { appendEvent, getGameState, loadSeedIntoMemory, setGameState } from "./store";
import { computeDebrief } from "./debrief";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
});

function ev(tableNo: number, kind: string, delta: number, cardId: string | null, at: string) {
  const row = appendEvent({ table_no: tableNo, actor_role: "SYSTEM", kind, delta_aed: delta, card_id: cardId, idempotency_key: `${kind}:${tableNo}:${cardId ?? at}`, meta: {} });
  row.at = at;
}

describe("computeDebrief", () => {
  it("sums fines, counts X3 wrongly-filed, and compares GRN-04 close times", () => {
    setGameState({ phase: "FROZEN", clock_started_at: "2026-08-01T09:00:00.000Z" });
    // fines: 2 wrong quarantines (-25k), 1 wrongly-filed X3 (-40k?), outage ticks (-3k)
    ev(1, "QUARANTINE_INCORRECT", -25_000, "RED-T01-V1", "2026-08-01T09:10:00.000Z");
    ev(2, "QUARANTINE_INCORRECT", -25_000, "RED-T02-V1", "2026-08-01T09:11:00.000Z");
    ev(3, "FILE_INVALID", -40_000, "RED-T03-X3", "2026-08-01T09:12:00.000Z");
    ev(3, "OUTAGE_TICK", -1_000, null, "2026-08-01T09:13:00.000Z");
    ev(3, "OUTAGE_TICK", -1_000, null, "2026-08-01T09:14:00.000Z");
    // revenue events (ignored by fines)
    ev(1, "FILE_VALID_OWN", 50_000, "RED-T01-V2", "2026-08-01T09:10:30.000Z");
    // GRN-04: table 1 played it and closed at 09:30 (30 min); table 2 played, closed 09:35 (35 min); table 3 did not
    ev(1, "GREEN_PLAYED", 0, "GRN-T01-04", "2026-08-01T09:20:00.000Z");
    ev(1, "LEDGER_CLOSED", 0, null, "2026-08-01T09:30:00.000Z");
    ev(2, "GREEN_PLAYED", 0, "GRN-T02-04", "2026-08-01T09:21:00.000Z");
    ev(2, "LEDGER_CLOSED", 0, null, "2026-08-01T09:35:00.000Z");
    ev(3, "LEDGER_CLOSED", 0, null, "2026-08-01T09:40:00.000Z");

    const d = computeDebrief({ clockStartedAt: getGameState().clock_started_at! });
    expect(d.total_fines_aed).toBe(92_000); // 25k + 25k + 40k + 1k + 1k
    expect(d.x3_wrongly_filed).toBe(1);
    expect(d.grn04.played.tables).toEqual([1, 2]);
    expect(d.grn04.played.avg_close_min).toBe(32.5); // (30 + 35) / 2
    expect(d.grn04.not_played.tables).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(d.grn04.not_played.avg_close_min).toBe(40); // only table 3 closed its ledger
  });

  it("handles an empty game gracefully", () => {
    const d = computeDebrief({ clockStartedAt: null });
    expect(d.total_fines_aed).toBe(0);
    expect(d.x3_wrongly_filed).toBe(0);
    expect(d.grn04.played.tables).toEqual([]);
    // no table has closed a ledger, so no averages
    expect(d.grn04.played.avg_close_min).toBeNull();
    expect(d.grn04.not_played.avg_close_min).toBeNull();
  });
});
