import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/trade/route";
import {
  CONSOLE_COOKIE,
  consoleSessionCookieValue,
} from "./session";
import {
  derivedCapital,
  getCardById,
  getGameState,
  getPosition,
  listEvents,
  listPositionsForTable,
  loadSeedIntoMemory,
  setGameState,
} from "./store";

function request(body: unknown) {
  const cookie = `${CONSOLE_COOKIE}=${encodeURIComponent(consoleSessionCookieValue())}`;
  return new Request("http://localhost/api/trade", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function validTradeInput() {
  for (let fromTable = 1; fromTable <= 10; fromTable++) {
    for (const position of listPositionsForTable(fromTable)) {
      const card = getCardById(position.card_id);
      if (card?.deck === "RED" && card.validity === "VALID" && card.owner_table !== fromTable) {
        return { cardId: card.card_id, fromTable, toTable: card.owner_table, doubled: false, reason: "Trade test" };
      }
    }
  }
  throw new Error("Seed has no valid trade");
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
  setGameState({ phase: "B", clock_started_at: new Date().toISOString() });
});

describe("memory trade — PRD §4.2 trade audit", () => {
  it("marks the card state as TRADED on the receiver so it cannot be re-traded", async () => {
    const trade = validTradeInput();
    const response = await POST(request({ ...trade, idempotencyKey: "trade:state-machine" }));
    expect(response.status).toBe(200);

    const pos = getPosition(trade.cardId);
    expect(pos?.state).toBe("TRADED");
    expect(pos?.held_by_table).toBe(trade.toTable);
  });

  it("credits TRADE_VALIDATED exactly once per table per trade", async () => {
    const trade = validTradeInput();
    const response = await POST(request({ ...trade, idempotencyKey: "trade:credits" }));
    expect(response.status).toBe(200);

    const tradeEvents = listEvents().filter((event) => event.kind === "TRADE_VALIDATED");
    expect(tradeEvents).toHaveLength(2);
    expect(tradeEvents.map((e) => e.table_no).sort()).toEqual([trade.fromTable, trade.toTable].sort());
    expect(derivedCapital(trade.fromTable)).toBeGreaterThan(1_000_000);
    expect(derivedCapital(trade.toTable)).toBeGreaterThan(1_000_000);
  });

  it("rejects a second trade of the same card from the receiver", async () => {
    const trade = validTradeInput();
    const first = await POST(request({ ...trade, idempotencyKey: "trade:first" }));
    expect(first.status).toBe(200);

    const second = await POST(request({
      ...trade,
      fromTable: trade.toTable,
      toTable: trade.fromTable,
      idempotencyKey: "trade:second-blocked",
    }));
    expect(second.status).toBe(409);
    const body = await second.json();
    expect(body.error.toLowerCase()).toContain("traded");
  });

  it("blocks trades after FROZEN even if the trade was previously valid", async () => {
    const trade = validTradeInput();
    await POST(request({ ...trade, idempotencyKey: "trade:before-freeze" }));
    setGameState({ phase: "FROZEN" });

    const blocked = await POST(request({ ...trade, fromTable: trade.toTable, toTable: trade.fromTable, idempotencyKey: "trade:after-freeze" }));
    expect(blocked.status).toBe(409);
    const body = await blocked.json();
    expect(body.error.toLowerCase()).toContain("freeze");
    expect(getGameState().phase).toBe("FROZEN");
  });

  it("blocks trades before Phase B (still in Phase A)", async () => {
    setGameState({ phase: "A", clock_started_at: new Date().toISOString() });
    const trade = validTradeInput();
    const response = await POST(request({ ...trade, idempotencyKey: "trade:too-early" }));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.toLowerCase()).toContain("phase");
  });
});