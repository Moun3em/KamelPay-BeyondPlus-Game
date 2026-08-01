import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendEvent,
  getTeam,
  loadSeedIntoMemory,
  setGameState,
  updateTeam,
} from "./store";
import { computeBadges, ensureEveryTableHasABadge } from "./badges";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  loadSeedIntoMemory();
  setGameState({ phase: "FROZEN" });
});

describe("badges — PRD §4.5 leaderboard-reveal guarantee", () => {
  it("awards ALLIANCE_BUILDER to the table with the most TRADE_VALIDATED events", async () => {
    for (let i = 0; i < 5; i++) {
      appendEvent({
        table_no: 1, actor_role: "FACILITATOR", kind: "TRADE_VALIDATED",
        delta_aed: 5_000, idempotency_key: `badge:trade:1:${i}`,
      });
    }
    for (let i = 0; i < 2; i++) {
      appendEvent({
        table_no: 2, actor_role: "FACILITATOR", kind: "TRADE_VALIDATED",
        delta_aed: 5_000, idempotency_key: `badge:trade:2:${i}`,
      });
    }
    const badges = computeBadges();
    expect(badges.get(1)).toContain("ALLIANCE_BUILDER");
    expect(badges.get(2) ?? []).not.toContain("ALLIANCE_BUILDER");
  });

  it("ties on trade count do not award ALLIANCE_BUILDER to anyone", () => {
    for (const t of [1, 2]) {
      appendEvent({
        table_no: t, actor_role: "FACILITATOR", kind: "TRADE_VALIDATED",
        delta_aed: 5_000, idempotency_key: `badge:trade:ties:${t}`,
      });
    }
    const badges = computeBadges();
    for (const t of [1, 2]) {
      expect(badges.get(t) ?? []).not.toContain("ALLIANCE_BUILDER");
    }
  });

  it("awards ZERO_PENALTY_PIONEER to a table whose first 30 minutes contain no negative deltas", () => {
    appendEvent({
      table_no: 1, actor_role: "TAX", kind: "FILE_VALID_OWN",
      delta_aed: 50_000, idempotency_key: "badge:zero:1",
    });
    appendEvent({
      table_no: 2, actor_role: "TAX", kind: "FILE_INVALID",
      delta_aed: -100, idempotency_key: "badge:zero:2:penalty",
    });
    const badges = computeBadges();
    expect(badges.get(1) ?? []).toContain("ZERO_PENALTY_PIONEER");
    expect(badges.get(2) ?? []).not.toContain("ZERO_PENALTY_PIONEER");
  });

  it("awards CLEAN_CLOSE to a table whose ledger closed with zero penalties", () => {
    appendEvent({
      table_no: 1, actor_role: "TAX", kind: "LEDGER_CLOSED",
      delta_aed: 75_000, idempotency_key: "badge:clean:1",
    });
    appendEvent({
      table_no: 2, actor_role: "TAX", kind: "FILE_INVALID",
      delta_aed: -5_000, idempotency_key: "badge:clean:2:penalty",
    });
    appendEvent({
      table_no: 2, actor_role: "TAX", kind: "LEDGER_CLOSED",
      delta_aed: 75_000, idempotency_key: "badge:clean:2:close",
    });
    const badges = computeBadges();
    expect(badges.get(1) ?? []).toContain("CLEAN_CLOSE");
    expect(badges.get(2) ?? []).not.toContain("CLEAN_CLOSE");
  });

  it("awards THE_SCEPTIC to a table that correctly quarantined the B2C X6 card", () => {
    appendEvent({
      table_no: 1, actor_role: "TAX", kind: "QUARANTINE_CORRECT",
      delta_aed: 10_000, card_id: "X6",
      idempotency_key: "badge:sceptic:1",
    });
    const badges = computeBadges();
    expect(badges.get(1) ?? []).toContain("THE_SCEPTIC");
  });

  it("ensures every table has at least one badge before leaderboard reveal", () => {
    updateTeam(3, { badges: ["CRISIS_MANAGER"] });
    const result = ensureEveryTableHasABadge();
    expect(result.everyTableHasABadge).toBe(true);
    for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const team = getTeam(t);
      expect(team?.badges.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it("falls back to a synthetic PARTICIPANT badge on tables that earned nothing", () => {
    ensureEveryTableHasABadge();
    for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      const team = getTeam(t);
      expect(team?.badges.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });
});