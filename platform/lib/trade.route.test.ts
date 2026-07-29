import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getCardById, listPositionsForTable, loadSeedIntoMemory, setGameState } from "./store";
import { POST } from "../app/api/trade/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
  setGameState({ phase: "B", clock_started_at: new Date().toISOString() });
});

function request(body: unknown) {
  const cookie = `${CONSOLE_COOKIE}=${encodeURIComponent(consoleSessionCookieValue())}`;
  return new Request("http://localhost/api/trade", {
    method: "POST", headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body),
  });
}

function validTrade() {
  for (let fromTable = 1; fromTable <= 10; fromTable++) {
    for (const position of listPositionsForTable(fromTable)) {
      const card = getCardById(position.card_id);
      if (card?.deck === "RED" && card.validity === "VALID" && card.owner_table !== fromTable) {
        return { cardId: card.card_id, fromTable, toTable: card.owner_table };
      }
    }
  }
  throw new Error("Seed has no valid trade");
}

describe("memory trade idempotency", () => {
  it("replays the original response for a matching request", async () => {
    const body = { ...validTrade(), doubled: false, reason: "Validated by facilitator", idempotencyKey: "trade:replay" };
    const first = await POST(request(body));
    const firstJson = await first.json();
    const replay = await POST(request(body));
    expect(first.status).toBe(200);
    expect(await replay.json()).toEqual({ ...firstJson, replay: true });
  });

  it("rejects malformed or coerced command fields", async () => {
    const base = { ...validTrade(), doubled: false, reason: "Validated by facilitator", idempotencyKey: "trade:strict" };
    expect((await POST(request({ ...base, doubled: "false" }))).status).toBe(400);
    expect((await POST(request({ ...base, fromTable: String(base.fromTable) }))).status).toBe(400);
    expect((await POST(request({ ...base, toTable: 11 }))).status).toBe(400);
    expect((await POST(request({ ...base, reason: 123 }))).status).toBe(400);
    expect((await POST(request({ ...base, unexpected: true }))).status).toBe(400);
  });

  it("rejects changed doubled or reason fields with the same key", async () => {
    const body = { ...validTrade(), doubled: false, reason: "Validated by facilitator", idempotencyKey: "trade:altered" };
    expect((await POST(request(body))).status).toBe(200);
    expect((await POST(request({ ...body, doubled: true }))).status).toBe(409);
    expect((await POST(request({ ...body, reason: "Different audit reason" }))).status).toBe(409);
  });
});
