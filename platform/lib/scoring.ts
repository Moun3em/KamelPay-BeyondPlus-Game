/**
 * Pure scoring service — PRD §4.2 / §4.3.
 * No I/O. No imports from db.ts.
 */

import { ECONOMY } from "./config";
import type {
  CardAction,
  CardRow,
  EventKind,
  ScoreResult,
  TeachingModal,
  TeamState,
} from "./types";
import { assertNever } from "./types";

function modal(
  partial: Omit<TeachingModal, "icon" | "word"> & {
    icon: TeachingModal["icon"];
    word: string;
  },
): TeachingModal {
  return partial;
}

function applyDampers(
  rawDelta: number,
  team: TeamState,
  kind: EventKind,
): number {
  if (rawDelta >= 0) return rawDelta;

  // GRN-01 immunity: no AED 5,000/month implementation penalty (X4 = 5000)
  if (
    team.impl_immunity &&
    kind === "FILE_INVALID" &&
    Math.abs(rawDelta) === 5_000
  ) {
    return 0;
  }

  // GRN-03 damper: cap every future penalty at 10_000
  if (team.penalty_cap_aed != null && rawDelta < 0) {
    return Math.max(rawDelta, -team.penalty_cap_aed);
  }

  return rawDelta;
}

function applyMultiplier(delta: number, team: TeamState, inFinalWindow: boolean): number {
  if (delta > 0 && team.final_multiplier && inFinalWindow) {
    return delta * 2;
  }
  return delta;
}

export interface ScoreContext {
  tableNo: number;
  action: CardAction;
  /** True when remaining clock in Phase C (or whole game) is ≤ 5 minutes */
  inFinalWindow?: boolean;
}

/** Score a RED / PRACTICE file-or-quarantine decision. */
export function scoreScan(
  card: CardRow,
  team: TeamState,
  ctx: ScoreContext,
): ScoreResult {
  const why =
    (typeof card.payload.why === "string" && card.payload.why) ||
    card.payload.body ||
    "No teaching text on this card.";

  if (card.deck === "PRACTICE") {
    return {
      kind: "PRACTICE_SCAN",
      delta_aed: 0,
      modal: modal({
        title: card.payload.title ?? "Practice scan",
        kind: "PRACTICE_SCAN",
        delta_aed: 0,
        why: String(why),
        icon: "info",
        word: "Practice",
        card_id: card.card_id,
      }),
    };
  }

  if (card.deck !== "RED") {
    throw new Error(`scoreScan only handles RED/PRACTICE; got ${card.deck}`);
  }

  const { action, tableNo } = ctx;
  const owned = card.owner_table === tableNo;
  const validity = card.validity;

  if (action === "FILE") {
    if (!owned) {
      return {
        kind: "FILE_FOREIGN",
        delta_aed: ECONOMY.file_foreign_rejected,
        modal: modal({
          title: "Not your TRN",
          kind: "FILE_FOREIGN",
          delta_aed: 0,
          why: "This TRN is not yours. Corner 3 refuses the document.",
          icon: "cross",
          word: "Rejected",
          card_id: card.card_id,
        }),
      };
    }

    if (validity === "VALID") {
      const raw = ECONOMY.file_valid_own;
      const delta = applyMultiplier(raw, team, Boolean(ctx.inFinalWindow));
      return {
        kind: "FILE_VALID_OWN",
        delta_aed: delta,
        flags: { ledger_close_candidate: true },
        modal: modal({
          title: card.payload.title ?? "Valid invoice filed",
          kind: "FILE_VALID_OWN",
          delta_aed: delta,
          why: String(why),
          icon: "check",
          word: "Filed",
          card_id: card.card_id,
        }),
      };
    }

    if (validity === "OUT_OF_SCOPE") {
      return {
        kind: "FILE_OUT_OF_SCOPE",
        delta_aed: 0,
        modal: modal({
          title: card.payload.title ?? "Out of scope",
          kind: "FILE_OUT_OF_SCOPE",
          delta_aed: 0,
          why: String(why),
          icon: "warn",
          word: "Wasted cycle",
          card_id: card.card_id,
        }),
      };
    }

    if (validity === "INVALID") {
      const penalty = -(card.penalty_aed || Number(card.payload.penalty) || 0);
      const kind: EventKind = "FILE_INVALID";
      let delta = applyDampers(penalty, team, kind);
      delta = applyMultiplier(delta, team, Boolean(ctx.inFinalWindow));
      return {
        kind,
        delta_aed: delta,
        modal: modal({
          title: card.payload.title ?? "Invalid invoice filed",
          kind,
          delta_aed: delta,
          why: String(why),
          icon: "cross",
          word: "Penalty",
          card_id: card.card_id,
        }),
      };
    }

    throw new Error(`Unknown validity: ${String(validity)}`);
  }

  if (action === "QUARANTINE") {
    const correct =
      card.correct_action === "QUARANTINE" ||
      validity === "INVALID" ||
      validity === "OUT_OF_SCOPE";

    if (correct) {
      const raw = ECONOMY.quarantine_invalid_correct;
      const delta = applyMultiplier(raw, team, Boolean(ctx.inFinalWindow));
      return {
        kind: "QUARANTINE_CORRECT",
        delta_aed: delta,
        modal: modal({
          title: card.payload.title ?? "Correctly quarantined",
          kind: "QUARANTINE_CORRECT",
          delta_aed: delta,
          why: String(why),
          icon: "check",
          word: "Quarantined",
          card_id: card.card_id,
        }),
      };
    }

    const raw = ECONOMY.quarantine_valid_incorrect;
    let delta = applyDampers(raw, team, "QUARANTINE_INCORRECT");
    delta = applyMultiplier(delta, team, Boolean(ctx.inFinalWindow));
    return {
      kind: "QUARANTINE_INCORRECT",
      delta_aed: delta,
      modal: modal({
        title: card.payload.title ?? "Valid invoice withheld",
        kind: "QUARANTINE_INCORRECT",
        delta_aed: delta,
        why: String(why),
        icon: "cross",
        word: "Revenue lost",
        card_id: card.card_id,
      }),
    };
  }

  return assertNever(action);
}

/** Score playing a GREEN control card (PRD §2.6 / seed effect text). */
export function scoreGreenPlay(
  card: CardRow,
  team: TeamState,
  ctx: { inFinalWindow?: boolean },
): ScoreResult {
  if (card.deck !== "GREEN") {
    throw new Error("scoreGreenPlay requires GREEN deck");
  }
  if (!team.green_unlocked) {
    throw new Error("Green deck is locked until outage is resolved");
  }

  const arch = card.archetype;
  const why = String(card.payload.teaches ?? card.payload.effect ?? "");

  switch (arch) {
    case "GRN-01": {
      const delta = applyMultiplier(
        ECONOMY.green["GRN-01"],
        team,
        Boolean(ctx.inFinalWindow),
      );
      return {
        kind: "GREEN_PLAYED",
        delta_aed: delta,
        flags: { set_impl_immunity: true },
        modal: modal({
          title: card.payload.title ?? "P.R.O. Card",
          kind: "GREEN_PLAYED",
          delta_aed: delta,
          why,
          icon: "check",
          word: "Immunity",
          card_id: card.card_id,
        }),
      };
    }
    case "GRN-02": {
      const delta = applyMultiplier(
        ECONOMY.green["GRN-02"],
        team,
        Boolean(ctx.inFinalWindow),
      );
      return {
        kind: "GREEN_PLAYED",
        delta_aed: delta,
        modal: modal({
          title: card.payload.title ?? "C-Suite Card",
          kind: "GREEN_PLAYED",
          delta_aed: delta,
          why,
          icon: "check",
          word: "Deployed",
          card_id: card.card_id,
        }),
      };
    }
    case "GRN-03": {
      const delta = applyMultiplier(
        ECONOMY.green["GRN-03"],
        team,
        Boolean(ctx.inFinalWindow),
      );
      return {
        kind: "GREEN_PLAYED",
        delta_aed: delta,
        flags: { set_penalty_cap: 10_000 },
        modal: modal({
          title: card.payload.title ?? "Daily limit",
          kind: "GREEN_PLAYED",
          delta_aed: delta,
          why,
          icon: "check",
          word: "Damper",
          card_id: card.card_id,
        }),
      };
    }
    case "GRN-04": {
      return {
        kind: "GREEN_PLAYED",
        delta_aed: 0,
        flags: { auto_resolve_held: true },
        modal: modal({
          title: card.payload.title ?? "AI-OCR Matching",
          kind: "GREEN_PLAYED",
          delta_aed: 0,
          why,
          icon: "check",
          word: "Automation",
          card_id: card.card_id,
        }),
      };
    }
    case "GRN-05": {
      const delta = applyMultiplier(
        ECONOMY.green["GRN-05"],
        team,
        Boolean(ctx.inFinalWindow),
      );
      return {
        kind: "GREEN_PLAYED",
        delta_aed: delta,
        modal: modal({
          title: card.payload.title ?? "Virtual IBANs",
          kind: "GREEN_PLAYED",
          delta_aed: delta,
          why,
          icon: "check",
          word: "Consolidate",
          card_id: card.card_id,
        }),
      };
    }
    case "GRN-06": {
      return {
        kind: "GREEN_PLAYED",
        delta_aed: 0,
        flags: { set_final_multiplier: true },
        modal: modal({
          title: card.payload.title ?? "Continuous close",
          kind: "GREEN_PLAYED",
          delta_aed: 0,
          why,
          icon: "check",
          word: "Multiplier",
          card_id: card.card_id,
        }),
      };
    }
    default:
      throw new Error(`Unknown green archetype: ${arch}`);
  }
}

export function scoreTradeValidated(
  team: TeamState,
  ctx: { cardId: string; doubled?: boolean; inFinalWindow?: boolean },
): ScoreResult {
  let raw = ECONOMY.trade_network_bonus;
  if (ctx.doubled) raw *= 2;
  const delta = applyMultiplier(raw, team, Boolean(ctx.inFinalWindow));
  return {
    kind: "TRADE_VALIDATED",
    delta_aed: delta,
    modal: modal({
      title: "Trade cleared",
      kind: "TRADE_VALIDATED",
      delta_aed: delta,
      why: "ASP station validated the counterparty exchange. Network bonus applied to both tables.",
      icon: "check",
      word: "Cleared",
      card_id: ctx.cardId,
    }),
  };
}

export function scoreOutageTick(
  team: TeamState,
): ScoreResult | null {
  if (!team.outage_active) return null;
  if (team.outage_loss_aed <= ECONOMY.outage_hard_floor) return null;

  let delta: number = ECONOMY.outage_tick_penalty;
  // capacity is negative headroom until hard floor (e.g. -10000 remaining)
  const capacity = ECONOMY.outage_hard_floor - team.outage_loss_aed;
  if (capacity >= 0) return null;
  delta = Math.max(delta, capacity);

  return {
    kind: "OUTAGE_TICK",
    delta_aed: delta,
    modal: modal({
      title: "Outage tick",
      kind: "OUTAGE_TICK",
      delta_aed: delta,
      why: "Systems offline. Every 10 seconds unrecovered costs AED 1,000 until the hard floor of AED 150,000.",
      icon: "warn",
      word: "Draining",
      card_id: "",
    }),
  };
}

export function scoreOutageResolved(): ScoreResult {
  return {
    kind: "OUTAGE_RESOLVED",
    delta_aed: 0,
    flags: { set_green_unlocked: true },
    modal: modal({
      title: "Outage resolved",
      kind: "OUTAGE_RESOLVED",
      delta_aed: 0,
      why: "Five-corner routing restored. Green AbsoluteCard deck unlocked for your table.",
      icon: "check",
      word: "Restored",
      card_id: "",
    }),
  };
}

export function scoreLedgerClose(
  team: TeamState,
  ctx: { inFinalWindow?: boolean },
): ScoreResult {
  const delta = applyMultiplier(
    ECONOMY.ledger_close_bonus,
    team,
    Boolean(ctx.inFinalWindow),
  );
  return {
    kind: "LEDGER_CLOSED",
    delta_aed: delta,
    modal: modal({
      title: "Ledger closed",
      kind: "LEDGER_CLOSED",
      delta_aed: delta,
      why: "All six own valid invoices filed. Ledger close bonus awarded once.",
      icon: "check",
      word: "Closed",
      card_id: "",
    }),
  };
}

/** Phase allows this deck? */
export function deckAllowedInPhase(
  deck: CardRow["deck"],
  phase: string,
  team: TeamState,
): { ok: boolean; hint: string } {
  if (phase === "FROZEN" || phase === "DEBRIEF") {
    return { ok: false, hint: "Game is frozen. Writes are closed." };
  }
  if (deck === "PRACTICE") {
    return phase === "LOBBY" || phase === "TUTORIAL" || phase === "A" || phase === "B" || phase === "C"
      ? { ok: true, hint: "" }
      : { ok: false, hint: "Practice scans are closed." };
  }
  if (deck === "RED") {
    if (phase === "A" || phase === "B" || phase === "C") return { ok: true, hint: "" };
    return { ok: false, hint: "Red deck unlocks in Phase A — Internal Audit." };
  }
  if (deck === "BLUE") {
    if (phase === "B" || phase === "C") return { ok: true, hint: "" };
    return { ok: false, hint: "Blue deck unlocks in Phase B — Five-Corner Trade." };
  }
  if (deck === "GREEN") {
    if (phase !== "C" && phase !== "B") {
      return { ok: false, hint: "Green deck unlocks in Phase C after your outage is resolved." };
    }
    if (!team.green_unlocked) {
      return {
        ok: false,
        hint: "Resolve your table outage first. Green AbsoluteCard controls unlock on restore.",
      };
    }
    if (phase === "C") return { ok: true, hint: "" };
    return { ok: false, hint: "Green deck unlocks in Phase C after your outage is resolved." };
  }
  return { ok: false, hint: "Unknown deck." };
}
