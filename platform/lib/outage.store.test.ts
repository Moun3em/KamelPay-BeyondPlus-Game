import { beforeEach, describe, expect, it, vi } from "vitest";
import { armMemoryOutages, solveMemoryOutage, tickMemoryOutages } from "./outage.store";
import {
  claimDevice,
  derivedCapital,
  getTeam,
  listEvents,
  loadSeedIntoMemory,
  setGameState,
  updateTeam,
} from "./store";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  loadSeedIntoMemory();
  setGameState({ phase: "C" });
});

describe("durable outage memory contract", () => {
  it.each(["LOBBY", "TUTORIAL", "A", "B"] as const)(
    "cannot arm before Phase C from %s",
    async (phase) => {
      setGameState({ phase });
      expect(await armMemoryOutages(new Date("2026-07-29T09:40:00.000Z"))).toBe(0);
      expect(listEvents().filter((event) => event.kind === "OUTAGE_ARMED")).toHaveLength(0);
      expect(getTeam(1)?.outage_scheduled_at).toBeNull();
    },
  );

  it("persists stable schedules when arm is retried", async () => {
    const now = new Date("2026-07-29T09:40:00.000Z");
    await armMemoryOutages(now);
    const first = listEvents().filter((event) => event.kind === "OUTAGE_ARMED")
      .map((event) => [event.table_no, event.meta?.scheduledAt]);

    await armMemoryOutages(new Date(now.getTime() + 60_000));
    const second = listEvents().filter((event) => event.kind === "OUTAGE_ARMED")
      .map((event) => [event.table_no, event.meta?.scheduledAt]);

    expect(second).toEqual(first);
    expect(first).toHaveLength(10);
  });

  it("ticks independently of SSE and concurrent invocations are idempotent", async () => {
    const armedAt = new Date("2026-07-29T09:40:00.000Z");
    await armMemoryOutages(armedAt);
    const schedule = listEvents(1).find((event) => event.kind === "OUTAGE_ARMED")!;
    const due = new Date(String(schedule.meta?.scheduledAt));
    due.setSeconds(due.getSeconds() + 20);

    await Promise.all([tickMemoryOutages(due), tickMemoryOutages(due), tickMemoryOutages(due)]);

    const ticks = listEvents(1).filter((event) => event.kind === "OUTAGE_TICK");
    expect(ticks.map((event) => event.idempotency_key)).toEqual([
      "outage:tick:1:1", "outage:tick:1:2",
    ]);
    expect(getTeam(1)?.capital_aed).toBe(derivedCapital(1));
  });

  it.each([[0, 0], [9_999, 0], [10_000, 1], [20_000, 2]])(
    "charges only after complete ten-second intervals at %ims",
    async (elapsed, expected) => {
      const armedAt = new Date("2026-07-29T09:40:00.000Z");
      await armMemoryOutages(armedAt);
      const schedule = listEvents(1).find((event) => event.kind === "OUTAGE_ARMED")!;
      const due = new Date(new Date(String(schedule.meta?.scheduledAt)).getTime() + elapsed);
      await tickMemoryOutages(due);
      expect(listEvents(1).filter((event) => event.kind === "OUTAGE_TICK")).toHaveLength(expected);
    },
  );

  it("never charges more than AED 150,000 even under concurrent delayed ticks", async () => {
    claimDevice("9b122d59-b698-4ecf-862d-856f9b93ad97", 1, "CIO");
    const armedAt = new Date("2026-07-29T09:40:00.000Z");
    await armMemoryOutages(armedAt);
    const schedule = listEvents(1).find((event) => event.kind === "OUTAGE_ARMED")!;
    const muchLater = new Date(new Date(String(schedule.meta?.scheduledAt)).getTime() + 60 * 60_000);

    await Promise.all([tickMemoryOutages(muchLater), tickMemoryOutages(muchLater)]);

    const ticks = listEvents(1).filter((event) => event.kind === "OUTAGE_TICK");
    expect(ticks).toHaveLength(150);
    expect(ticks.reduce((sum, event) => sum + event.delta_aed, 0)).toBe(-150_000);
    expect(getTeam(1)?.outage_loss_aed).toBe(-150_000);
    expect(getTeam(1)?.capital_aed).toBe(derivedCapital(1));
  });

  it("replays a successful solve after the outage closes and rejects an altered answer", async () => {
    claimDevice("9b122d59-b698-4ecf-862d-856f9b93ad97", 1, "CIO");
    updateTeam(1, { outage_active: true });
    const input = { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 1, role: "CIO" as const };
    const first = await solveMemoryOutage(input, "1-2-3-4-5", true, "solve:success");
    const replay = await solveMemoryOutage(input, "1-2-3-4-5", true, "solve:success");
    expect(replay).toEqual({ ...first, replay: true });
    await expect(solveMemoryOutage(input, "5-4-3-2-1", false, "solve:success")).rejects.toThrow(/different request/);
  });

  it("does not increment wrong tries twice and scopes solve keys to the session/table", async () => {
    claimDevice("9b122d59-b698-4ecf-862d-856f9b93ad97", 1, "CIO");
    updateTeam(1, { outage_active: true });
    const input = { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 1, role: "CIO" as const };
    const first = await solveMemoryOutage(input, "wrong", false, "solve:wrong");
    const replay = await solveMemoryOutage(input, "wrong", false, "solve:wrong");
    expect(replay).toEqual({ ...first, replay: true });
    expect(getTeam(1)?.outage_wrong_tries).toBe(1);
  });
});
