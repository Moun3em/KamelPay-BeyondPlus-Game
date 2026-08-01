import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import {
  claimDevice,
  getGameState,
  listDevices,
  listEvents,
  listTeams,
  loadSeedIntoMemory,
  setGameState,
} from "./store";
import { POST as consolePOST } from "../app/api/console/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
});

const req = (body: unknown) =>
  new Request("http://localhost/api/console", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${CONSOLE_COOKIE}=${encodeURIComponent(consoleSessionCookieValue())}`,
    },
    body: JSON.stringify(body),
  });

describe("reset_game facilitator action", () => {
  it("wipes progress and returns a clean LOBBY from FROZEN", async () => {
    setGameState({ phase: "A" });
    claimDevice("11111111-1111-4111-8111-111111111111", 2, "CFO");
    setGameState({ phase: "FROZEN" });
    expect(listDevices(2)).toHaveLength(1);

    const res = await consolePOST(req({ action: "reset_game", reason: "dry-run reset", idempotencyKey: "reset:1" }));
    expect(res.status).toBe(200);
    const gs = getGameState();
    expect(gs.phase).toBe("LOBBY");
    expect(gs.activeTables).toBe(10);
    expect(listTeams()).toHaveLength(10);
    expect(listDevices()).toHaveLength(0);
    expect(listEvents()).toHaveLength(1); // only the reset audit event
  });

  it("blocks reset while a game is live", async () => {
    setGameState({ phase: "A" });
    const res = await consolePOST(req({ action: "reset_game", reason: "oops", idempotencyKey: "reset:2" }));
    expect(res.status).toBe(409);
  });

  it("audits the reset and replays idempotently", async () => {
    setGameState({ phase: "FROZEN" });
    const cmd = { action: "reset_game", reason: "between runs", idempotencyKey: "reset:3" };
    expect((await consolePOST(req(cmd))).status).toBe(200);
    const replay = await consolePOST(req(cmd));
    expect(replay.status).toBe(200);
    expect((await replay.json()).replay).toBe(true);

    const audits = listEvents(0).filter(
      (e) => e.kind === "FACILITATOR_ACTION" && (e.meta as { action?: string })?.action === "reset_game",
    );
    expect(audits).toHaveLength(1);
    expect((audits[0].meta as { reason?: string }).reason).toBe("between runs");
  });
});
