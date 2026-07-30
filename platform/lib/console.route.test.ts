import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getGameState, getTeam, listEvents, loadSeedIntoMemory, setGameState } from "./store";
import { POST } from "../app/api/console/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
  setGameState({ phase: "B" });
});

function request(body: unknown) {
  const cookie = `${CONSOLE_COOKIE}=${encodeURIComponent(consoleSessionCookieValue())}`;
  return new Request("http://localhost/api/console", {
    method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body),
  });
}

describe("memory facilitator operation replay", () => {
  it("replays the original action response", async () => {
    const command = { action: "set_phase", phase: "C", reason: "Begin outage play", idempotencyKey: "console:response" };
    const first = await POST(request(command));
    const original = await first.json();
    const replay = await POST(request(command));
    expect(await replay.json()).toEqual({ ...original, replay: true });
  });

  it("rejects unsafe phase rewinds", async () => {
    const response = await POST(request({
      action: "set_phase", phase: "A", reason: "Unsafe rewind", idempotencyKey: "console:rewind",
    }));
    expect(response.status).toBe(409);
  });

  it("atomically arms schedules relative to the Phase C transition", async () => {
    const now = new Date("2026-07-29T09:40:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const response = await POST(request({
      action: "set_phase", phase: "C", reason: "Begin outage phase", idempotencyKey: "console:phase-c",
    }));
    vi.useRealTimers();
    expect(response.status).toBe(200);
    expect(listEvents().filter((event) => event.kind === "OUTAGE_ARMED")).toHaveLength(10);
    expect(new Date(getTeam(1)!.outage_scheduled_at!).getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it("commits the exact-boundary freeze while rejecting a capital adjustment", async () => {
    setGameState({
      phase: "C",
      clock_started_at: new Date(Date.now() - 64 * 60_000).toISOString(),
      clock_paused_at: null,
      paused_ms_total: 0,
    });
    const before = getTeam(1)!.capital_aed;

    const adjust = await POST(request({
      action: "adjust", tableNo: 1, amount: 1234, reason: "Boundary adjustment", idempotencyKey: "console:boundary-adjust",
    }));

    expect(adjust.status).toBe(409);
    expect(getGameState().phase).toBe("FROZEN");
    expect(listEvents().filter((event) => event.kind === "PHASE_CHANGE").at(-1)?.meta?.phase).toBe("FROZEN");
    expect(getTeam(1)!.capital_aed).toBe(before);
  });

  it("locks facilitator capital adjustments after final freeze", async () => {
    const freeze = await POST(request({
      action: "set_phase", phase: "FROZEN", reason: "Clock expired", idempotencyKey: "console:freeze",
    }));
    expect(freeze.status).toBe(200);
    const before = getTeam(1)!.capital_aed;
    const adjust = await POST(request({
      action: "adjust", tableNo: 1, amount: 1234, reason: "Too late", idempotencyKey: "console:frozen-adjust",
    }));
    expect(adjust.status).toBe(409);
    expect(getTeam(1)!.capital_aed).toBe(before);
  });

  it("shifts outage schedules by the full pause duration", async () => {
    vi.useFakeTimers();
    const started = new Date("2026-07-29T09:40:00.000Z");
    vi.setSystemTime(started);
    await POST(request({ action: "set_phase", phase: "C", reason: "Begin C", idempotencyKey: "console:pause-phase" }));
    const scheduledBefore = new Date(getTeam(1)!.outage_scheduled_at!).getTime();

    vi.setSystemTime(new Date(started.getTime() + 5_000));
    await POST(request({ action: "pause", reason: "Venue interruption", idempotencyKey: "console:pause" }));
    vi.setSystemTime(new Date(started.getTime() + 65_000));
    await POST(request({ action: "resume", reason: "Venue restored", idempotencyKey: "console:resume" }));
    vi.useRealTimers();

    expect(new Date(getTeam(1)!.outage_scheduled_at!).getTime()).toBe(scheduledBefore + 60_000);
  });
});
