import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeMemoryScan } from "./scan";
import {
  appendEvent,
  claimDevice,
  derivedCapital,
  getCardById,
  getPosition,
  getTeam,
  listEvents,
  loadSeedIntoMemory,
  setGameState,
  withMemoryTransaction,
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

describe("atomic memory adapter contract", () => {
  it("rejects a globally reused scan key from another authenticated table", async () => {
    const firstCard = ["RED-T01-V1", "RED-T01-V2", "RED-T01-V3"]
      .map(getCardById)
      .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 1)!;
    const otherDeviceId = "fe68138b-a36f-4f5c-a53b-f66f2e17dc2c";
    expect(claimDevice(otherDeviceId, 2, "TAX")).toEqual({ ok: true });
    const otherCard = ["RED-T02-V1", "RED-T02-V2", "RED-T02-V3"]
      .map(getCardById)
      .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 2)!;

    const first = await executeMemoryScan(session, {
      cardId: firstCard.card_id, action: "FILE", idempotencyKey: "scan:global-collision",
    });
    const altered = await executeMemoryScan(
      { deviceId: otherDeviceId, tableNo: 2, role: "TAX" },
      { cardId: otherCard.card_id, action: "QUARANTINE", idempotencyKey: "scan:global-collision" },
    );

    expect(first.ok).toBe(true);
    expect(altered).toMatchObject({ ok: false, status: 409 });
    expect(listEvents(2).filter((event) => event.idempotency_key === "scan:global-collision")).toHaveLength(0);
  });

  it("rejects an altered scan action while replaying the original matching response", async () => {
    const target = ["RED-T01-V1", "RED-T01-V2", "RED-T01-V3"]
      .map(getCardById)
      .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 1)!;
    const original = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:fingerprint",
    });
    const replay = await executeMemoryScan(session, {
      cardId: target.card_id, action: "FILE", idempotencyKey: "scan:fingerprint",
    });
    const altered = await executeMemoryScan(session, {
      cardId: target.card_id, action: "QUARANTINE", idempotencyKey: "scan:fingerprint",
    });

    expect(replay).toEqual({ ...original, replay: true });
    expect(altered).toMatchObject({ ok: false, status: 409 });
  });
  it("serializes concurrent different-key dispositions and scores the card once", async () => {
    const target = ["RED-T01-V1", "RED-T01-V2", "RED-T01-V3"]
      .map(getCardById)
      .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 1)!;

    const [first, second] = await Promise.all([
      executeMemoryScan(session, {
        cardId: target.card_id,
        action: "FILE",
        idempotencyKey: "scan:concurrent:a",
      }),
      executeMemoryScan(session, {
        cardId: target.card_id,
        action: "FILE",
        idempotencyKey: "scan:concurrent:b",
      }),
    ]);

    expect([first, second].filter((result) => result.ok && !result.replay)).toHaveLength(1);
    expect(listEvents(1).filter((event) => event.card_id === target.card_id)).toHaveLength(1);
    expect(getTeam(1)?.capital_aed).toBe(derivedCapital(1));
  });

  it("replays concurrent same-key scans with one durable event", async () => {
    const target = ["RED-T01-V1", "RED-T01-V2", "RED-T01-V3"]
      .map(getCardById)
      .find((candidate) => candidate && getPosition(candidate.card_id)?.held_by_table === 1)!;
    const request = {
      cardId: target.card_id,
      action: "FILE" as const,
      idempotencyKey: "scan:concurrent:same",
    };

    const results = await Promise.all([
      executeMemoryScan(session, request),
      executeMemoryScan(session, request),
    ]);

    expect(results.every((result) => result.ok)).toBe(true);
    const durableKey = `scan:${deviceId}:${request.idempotencyKey}`;
    expect(listEvents(1).filter((event) => event.idempotency_key === durableKey)).toHaveLength(1);
    expect(getTeam(1)?.capital_aed).toBe(derivedCapital(1));
  });

  it("rolls back every mutation when a transaction fails", async () => {
    const beforeEvents = listEvents(1).length;
    const beforeCapital = getTeam(1)!.capital_aed;

    await expect(
      withMemoryTransaction(async () => {
        appendEvent({
          table_no: 1,
          actor_role: "SYSTEM",
          kind: "FACILITATOR_ADJUST",
          delta_aed: 123,
          idempotency_key: "injected-failure",
        });
        throw new Error("injected failure");
      }),
    ).rejects.toThrow("injected failure");

    expect(listEvents(1)).toHaveLength(beforeEvents);
    expect(getTeam(1)?.capital_aed).toBe(beforeCapital);
  });
});
