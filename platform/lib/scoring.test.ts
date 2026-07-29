import { describe, expect, it } from "vitest";
import {
  deckAllowedInPhase,
  scoreGreenPlay,
  scoreLedgerClose,
  scoreOutageResolved,
  scoreOutageTick,
  scoreScan,
  scoreTradeValidated,
} from "./scoring";
import type { CardRow, TeamState } from "./types";

const baseTeam = (): TeamState => ({
  table_no: 1,
  capital_aed: 1_000_000,
  ledger_closed: false,
  outage_active: false,
  green_unlocked: false,
  badges: [],
  penalty_cap_aed: null,
  impl_immunity: false,
  final_multiplier: false,
  outage_loss_aed: 0,
  outage_wrong_tries: 0,
});

function red(partial: Partial<CardRow> & Pick<CardRow, "card_id" | "validity" | "owner_table">): CardRow {
  return {
    qr: "KP5C-TEST",
    deck: "RED",
    archetype: partial.archetype ?? "V1",
    correct_action: partial.correct_action ?? (partial.validity === "VALID" ? "FILE" : "QUARANTINE"),
    penalty_aed: partial.penalty_aed ?? 0,
    locked_until_phase: null,
    payload: {
      title: "Test",
      why: "Regulatory why text.",
      ...(partial.payload ?? {}),
    },
    ...partial,
  };
}

describe("scoreScan FILE", () => {
  it("FILE_VALID_OWN awards +50000", () => {
    const r = scoreScan(
      red({ card_id: "RED-T01-V1", owner_table: 1, validity: "VALID" }),
      baseTeam(),
      { tableNo: 1, action: "FILE" },
    );
    expect(r.kind).toBe("FILE_VALID_OWN");
    expect(r.delta_aed).toBe(50_000);
    expect(r.modal.why).toContain("Regulatory");
    expect(r.flags?.ledger_close_candidate).toBe(true);
  });

  it("FILE_FOREIGN awards 0", () => {
    const r = scoreScan(
      red({ card_id: "RED-T02-V1", owner_table: 2, validity: "VALID" }),
      baseTeam(),
      { tableNo: 1, action: "FILE" },
    );
    expect(r.kind).toBe("FILE_FOREIGN");
    expect(r.delta_aed).toBe(0);
  });

  it("FILE_INVALID applies card penalty", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-X1",
        owner_table: 1,
        validity: "INVALID",
        penalty_aed: 100,
        archetype: "X1",
      }),
      baseTeam(),
      { tableNo: 1, action: "FILE" },
    );
    expect(r.kind).toBe("FILE_INVALID");
    expect(r.delta_aed).toBe(-100);
  });

  it("FILE_INVALID X4 is -5000", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-X4",
        owner_table: 1,
        validity: "INVALID",
        penalty_aed: 5000,
        archetype: "X4",
      }),
      baseTeam(),
      { tableNo: 1, action: "FILE" },
    );
    expect(r.delta_aed).toBe(-5000);
  });

  it("FILE_OUT_OF_SCOPE awards 0", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-X6",
        owner_table: 1,
        validity: "OUT_OF_SCOPE",
        archetype: "X6",
      }),
      baseTeam(),
      { tableNo: 1, action: "FILE" },
    );
    expect(r.kind).toBe("FILE_OUT_OF_SCOPE");
    expect(r.delta_aed).toBe(0);
  });

  it("GRN-01 immunity zeroes X4 implementation penalty", () => {
    const team = { ...baseTeam(), impl_immunity: true };
    const r = scoreScan(
      red({
        card_id: "RED-T01-X4",
        owner_table: 1,
        validity: "INVALID",
        penalty_aed: 5000,
        archetype: "X4",
      }),
      team,
      { tableNo: 1, action: "FILE" },
    );
    expect(r.delta_aed).toBe(0);
  });

  it("GRN-03 damper caps penalties at 10000", () => {
    const team = { ...baseTeam(), penalty_cap_aed: 10_000 };
    const r = scoreScan(
      red({
        card_id: "RED-T01-X4",
        owner_table: 1,
        validity: "INVALID",
        penalty_aed: 5000,
      }),
      team,
      { tableNo: 1, action: "FILE" },
    );
    expect(r.delta_aed).toBe(-5000);

    const big = scoreScan(
      red({
        card_id: "RED-T01-X9",
        owner_table: 1,
        validity: "INVALID",
        penalty_aed: 50_000,
      }),
      team,
      { tableNo: 1, action: "FILE" },
    );
    expect(big.delta_aed).toBe(-10_000);
  });
});

describe("scoreScan QUARANTINE", () => {
  it("QUARANTINE_CORRECT awards +10000", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-X1",
        owner_table: 1,
        validity: "INVALID",
        correct_action: "QUARANTINE",
        penalty_aed: 100,
      }),
      baseTeam(),
      { tableNo: 1, action: "QUARANTINE" },
    );
    expect(r.kind).toBe("QUARANTINE_CORRECT");
    expect(r.delta_aed).toBe(10_000);
  });

  it("QUARANTINE of X6 is correct", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-X6",
        owner_table: 1,
        validity: "OUT_OF_SCOPE",
        correct_action: "QUARANTINE",
      }),
      baseTeam(),
      { tableNo: 1, action: "QUARANTINE" },
    );
    expect(r.kind).toBe("QUARANTINE_CORRECT");
  });

  it("QUARANTINE_INCORRECT awards -25000", () => {
    const r = scoreScan(
      red({
        card_id: "RED-T01-V1",
        owner_table: 1,
        validity: "VALID",
        correct_action: "FILE",
      }),
      baseTeam(),
      { tableNo: 1, action: "QUARANTINE" },
    );
    expect(r.kind).toBe("QUARANTINE_INCORRECT");
    expect(r.delta_aed).toBe(-25_000);
  });

  it("damper caps quarantine incorrect", () => {
    const team = { ...baseTeam(), penalty_cap_aed: 10_000 };
    const r = scoreScan(
      red({
        card_id: "RED-T01-V1",
        owner_table: 1,
        validity: "VALID",
        correct_action: "FILE",
      }),
      team,
      { tableNo: 1, action: "QUARANTINE" },
    );
    expect(r.delta_aed).toBe(-10_000);
  });
});

describe("practice + green + trade + outage + ledger", () => {
  it("PRACTICE_SCAN is zero", () => {
    const card: CardRow = {
      card_id: "PRACTICE-T01",
      qr: "x",
      deck: "PRACTICE",
      archetype: "TUTORIAL",
      owner_table: 1,
      validity: null,
      correct_action: null,
      penalty_aed: 0,
      locked_until_phase: null,
      payload: { title: "Practice", body: "Camera check." },
    };
    const r = scoreScan(card, baseTeam(), { tableNo: 1, action: "FILE" });
    expect(r.kind).toBe("PRACTICE_SCAN");
    expect(r.delta_aed).toBe(0);
  });

  it("green requires unlock", () => {
    const card: CardRow = {
      card_id: "GRN-T01-01",
      qr: "x",
      deck: "GREEN",
      archetype: "GRN-01",
      owner_table: 1,
      validity: null,
      correct_action: null,
      penalty_aed: 0,
      locked_until_phase: "C",
      payload: { teaches: "t", title: "PRO" },
    };
    expect(() => scoreGreenPlay(card, baseTeam(), {})).toThrow(/locked/i);
  });

  it("GRN-01 sets immunity flag and +25000", () => {
    const team = { ...baseTeam(), green_unlocked: true };
    const card: CardRow = {
      card_id: "GRN-T01-01",
      qr: "x",
      deck: "GREEN",
      archetype: "GRN-01",
      owner_table: 1,
      validity: null,
      correct_action: null,
      penalty_aed: 0,
      locked_until_phase: "C",
      payload: { teaches: "t", title: "PRO" },
    };
    const r = scoreGreenPlay(card, team, {});
    expect(r.delta_aed).toBe(25_000);
    expect(r.flags?.set_impl_immunity).toBe(true);
  });

  it("GRN-03 sets penalty cap", () => {
    const team = { ...baseTeam(), green_unlocked: true };
    const r = scoreGreenPlay(
      {
        card_id: "GRN-T01-03",
        qr: "x",
        deck: "GREEN",
        archetype: "GRN-03",
        owner_table: 1,
        validity: null,
        correct_action: null,
        penalty_aed: 0,
        locked_until_phase: "C",
        payload: { teaches: "t" },
      },
      team,
      {},
    );
    expect(r.flags?.set_penalty_cap).toBe(10_000);
    expect(r.delta_aed).toBe(15_000);
  });

  it("GRN-04 triggers auto_resolve", () => {
    const team = { ...baseTeam(), green_unlocked: true };
    const r = scoreGreenPlay(
      {
        card_id: "GRN-T01-04",
        qr: "x",
        deck: "GREEN",
        archetype: "GRN-04",
        owner_table: 1,
        validity: null,
        correct_action: null,
        penalty_aed: 0,
        locked_until_phase: "C",
        payload: { teaches: "t" },
      },
      team,
      {},
    );
    expect(r.flags?.auto_resolve_held).toBe(true);
  });

  it("GRN-06 sets final multiplier", () => {
    const team = { ...baseTeam(), green_unlocked: true };
    const r = scoreGreenPlay(
      {
        card_id: "GRN-T01-06",
        qr: "x",
        deck: "GREEN",
        archetype: "GRN-06",
        owner_table: 1,
        validity: null,
        correct_action: null,
        penalty_aed: 0,
        locked_until_phase: "C",
        payload: { teaches: "t" },
      },
      team,
      {},
    );
    expect(r.flags?.set_final_multiplier).toBe(true);
  });

  it("final multiplier doubles positive deltas", () => {
    const team = { ...baseTeam(), final_multiplier: true };
    const r = scoreScan(
      red({ card_id: "RED-T01-V1", owner_table: 1, validity: "VALID" }),
      team,
      { tableNo: 1, action: "FILE", inFinalWindow: true },
    );
    expect(r.delta_aed).toBe(100_000);
  });

  it("trade validated +5000, doubled +10000", () => {
    expect(scoreTradeValidated(baseTeam(), { cardId: "c" }).delta_aed).toBe(5_000);
    expect(
      scoreTradeValidated(baseTeam(), { cardId: "c", doubled: true }).delta_aed,
    ).toBe(10_000);
  });

  it("outage tick respects hard floor", () => {
    const team = {
      ...baseTeam(),
      outage_active: true,
      outage_loss_aed: -149_500,
    };
    const r = scoreOutageTick(team);
    expect(r?.delta_aed).toBe(-500);
    const floored = {
      ...team,
      outage_loss_aed: -150_000,
    };
    expect(scoreOutageTick(floored)).toBeNull();
  });

  it("outage resolved unlocks green", () => {
    const r = scoreOutageResolved();
    expect(r.flags?.set_green_unlocked).toBe(true);
    expect(r.delta_aed).toBe(0);
  });

  it("ledger close +75000", () => {
    expect(scoreLedgerClose(baseTeam(), {}).delta_aed).toBe(75_000);
  });
});

describe("deckAllowedInPhase", () => {
  it("locks red until A", () => {
    expect(deckAllowedInPhase("RED", "LOBBY", baseTeam()).ok).toBe(false);
    expect(deckAllowedInPhase("RED", "A", baseTeam()).ok).toBe(true);
  });

  it("locks blue until B", () => {
    expect(deckAllowedInPhase("BLUE", "A", baseTeam()).ok).toBe(false);
    expect(deckAllowedInPhase("BLUE", "B", baseTeam()).ok).toBe(true);
  });

  it("locks green until unlock in C", () => {
    expect(deckAllowedInPhase("GREEN", "C", baseTeam()).ok).toBe(false);
    expect(
      deckAllowedInPhase("GREEN", "C", { ...baseTeam(), green_unlocked: true }).ok,
    ).toBe(true);
  });

  it("frozen rejects writes", () => {
    expect(deckAllowedInPhase("RED", "FROZEN", baseTeam()).ok).toBe(false);
  });
});
