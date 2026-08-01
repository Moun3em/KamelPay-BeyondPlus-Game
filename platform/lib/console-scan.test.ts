import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getTeam, listEvents, loadSeedIntoMemory, setGameState } from "./store";
import { POST as consolePOST } from "../app/api/console/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
  setGameState({ phase: "A" });
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

describe("console_scan (0-device rescue)", () => {
  it("files a card on behalf of a table with no phones", async () => {
    const res = await consolePOST(req({
      action: "console_scan", tableNo: 1, cardId: "RED-T01-V1", scanAction: "FILE",
      reason: "table has no phones", idempotencyKey: "cs:1",
    }));
    expect(res.status).toBe(200);
    expect(getTeam(1)!.capital_aed).toBe(1_050_000);
  });

  it("rejects an invalid card and emits the scan audit trail", async () => {
    const res = await consolePOST(req({
      action: "console_scan", tableNo: 1, cardId: "NOPE-123", scanAction: "FILE",
      reason: "rescue", idempotencyKey: "cs:2",
    }));
    expect(res.status).toBe(409);
    // the failed scan itself is rejected; a valid rescue emits scan events
    const ok = await consolePOST(req({
      action: "console_scan", tableNo: 1, cardId: "RED-T01-X1", scanAction: "QUARANTINE",
      reason: "rescue", idempotencyKey: "cs:2b",
    }));
    expect(ok.status).toBe(200);
    expect(listEvents(1).some((e) => e.kind === "QUARANTINE_CORRECT")).toBe(true);
  });

  it("is idempotent on replay", async () => {
    const cmd = {
      action: "console_scan", tableNo: 1, cardId: "RED-T01-V2", scanAction: "FILE",
      reason: "x", idempotencyKey: "cs:3",
    };
    expect((await consolePOST(req(cmd))).status).toBe(200);
    const replay = await consolePOST(req(cmd));
    expect(replay.status).toBe(200);
    expect((await replay.json()).replay).toBe(true);
  });
});
