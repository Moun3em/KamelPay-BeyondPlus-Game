import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getTeam, listEvents, loadSeedIntoMemory, setGameState } from "./store";
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
    const command = { action: "set_phase", phase: "A", reason: "Begin scored play", idempotencyKey: "console:response" };
    const first = await POST(request(command));
    const original = await first.json();
    const replay = await POST(request(command));
    expect(await replay.json()).toEqual({ ...original, replay: true });
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
});
