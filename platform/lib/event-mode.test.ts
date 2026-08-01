import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getGameState, listEvents, loadSeedIntoMemory, setGameState } from "./store";
import { POST as consolePOST } from "../app/api/console/route";
import { EVENT_PHASE_ANNOUNCEMENTS, PHASES } from "./config";

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

describe("event_mode facilitator action", () => {
  it("toggles event mode on and off with an audit trail", async () => {
    expect(getGameState().event_mode).toBe(false);

    const on = await consolePOST(req({ action: "set_event_mode", eventMode: true, reason: "event starting", idempotencyKey: "em:1" }));
    expect(on.status).toBe(200);
    expect(getGameState().event_mode).toBe(true);

    const off = await consolePOST(req({ action: "set_event_mode", eventMode: false, reason: "rehearsal", idempotencyKey: "em:2" }));
    expect(off.status).toBe(200);
    expect(getGameState().event_mode).toBe(false);

    const audits = listEvents(0).filter(
      (e) => e.kind === "FACILITATOR_ACTION" && (e.meta as { action?: string })?.action === "set_event_mode",
    );
    expect(audits).toHaveLength(2);
  });

  it("rejects non-boolean eventMode", async () => {
    const res = await consolePOST(req({ action: "set_event_mode", eventMode: "yes", reason: "x", idempotencyKey: "em:3" }));
    expect(res.status).toBe(400);
  });

  it("replays idempotently", async () => {
    const cmd = { action: "set_event_mode", eventMode: true, reason: "x", idempotencyKey: "em:4" };
    expect((await consolePOST(req(cmd))).status).toBe(200);
    const replay = await consolePOST(req(cmd));
    expect(replay.status).toBe(200);
    expect((await replay.json()).replay).toBe(true);
  });
});

describe("phase announcements", () => {
  it("every playable phase has a factual announcement", () => {
    for (const p of ["TUTORIAL", "A", "B", "C", "FROZEN"]) {
      expect(EVENT_PHASE_ANNOUNCEMENTS[p as keyof typeof EVENT_PHASE_ANNOUNCEMENTS], `missing announcement for ${p}`).toBeTruthy();
    }
    expect(Object.keys(EVENT_PHASE_ANNOUNCEMENTS).every((p) => PHASES.includes(p as never))).toBe(true);
  });
});
