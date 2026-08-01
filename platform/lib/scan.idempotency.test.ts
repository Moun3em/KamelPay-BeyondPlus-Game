import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeMemoryScan } from "./scan";
import {
  claimDevice,
  derivedCapital,
  getCardById,
  getPosition,
  listEvents,
  loadSeedIntoMemory,
  setGameState,
} from "./store";

const deviceId = "9b122d59-b698-4ecf-862d-856f9b93ad97";
const session = { deviceId, tableNo: 1, role: "TAX" as const };

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  loadSeedIntoMemory();
  setGameState({ phase: "A", clock_started_at: new Date().toISOString() });
  expect(claimDevice(deviceId, 1, "TAX")).toEqual({ ok: true });
});

function firstRedCardForTable1() {
  return ["RED-T01-V1", "RED-T01-V2", "RED-T01-V3"]
    .map(getCardById)
    .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 1)!;
}

describe("scan — PRD §4.3 idempotency semantics", () => {
  it("returns 409 with the original modal payload when a card is re-scanned after filing", async () => {
    const target = firstRedCardForTable1();

    const first = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:refile-fresh",
    });
    expect(first.ok).toBe(true);

    const replay = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:refile-replay",
    });

    expect(replay).toMatchObject({ ok: false, status: 409 });
    expect(listEvents(1).filter((event) => event.card_id === target.card_id)).toHaveLength(1);
  });

  it("treats a different idempotency key for the same already-FILED card as a 409, not a replay", async () => {
    const target = firstRedCardForTable1();

    await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:original",
    });

    const second = await executeMemoryScan(session, {
      cardId: target.card_id, action: "QUARANTINE", idempotencyKey: "scan:different-key",
    });

    expect(second).toMatchObject({ ok: false, status: 409 });
    expect(listEvents(1).filter((event) => event.card_id === target.card_id)).toHaveLength(1);
    expect(getPosition(target.card_id)?.state).toBe("FILED");
  });

  it("preserves the original successful response for same-key retries, even after the card is filed", async () => {
    const target = firstRedCardForTable1();

    const first = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:idempotent-after-file",
    });
    expect(first.ok).toBe(true);

    const replay1 = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:idempotent-after-file",
    });
    const replay2 = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:idempotent-after-file",
    });

    expect(replay1).toMatchObject({ ok: true, replay: true });
    expect(replay2).toMatchObject({ ok: true, replay: true });
    const durableKey = `scan:${deviceId}:scan:idempotent-after-file`;
    const filedEvents = listEvents(1).filter(
      (event) => event.card_id === target.card_id && event.idempotency_key === durableKey,
    );
    expect(filedEvents).toHaveLength(1);
    expect(getPosition(target.card_id)?.state).toBe("FILED");
  });

  it("never invents a delta or scoring event when returning the 409 idempotent result", async () => {
    const target = firstRedCardForTable1();

    await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:no-double-delta",
    });
    const capitalAfterFirst = derivedCapital(1);

    const second = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:no-double-delta-2",
    });

    expect(second).toMatchObject({ ok: false, status: 409 });
    expect(derivedCapital(1)).toBe(capitalAfterFirst);
  });
});