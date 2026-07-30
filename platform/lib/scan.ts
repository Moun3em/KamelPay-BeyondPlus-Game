import {
  deckAllowedInPhase,
  scoreGreenPlay,
  scoreLedgerClose,
  scoreScan,
} from "./scoring";
import { inFinalFiveMinutes } from "./engines/clock";
import { advanceMemoryTimelineUnlocked } from "./timeline";
import { publishTable } from "./sse";
import {
  appendEvent,
  beginMemoryOperation,
  cancelMemoryOperation,
  completeMemoryOperation,
  getCardById,
  getCardByQr,
  getDevice,
  getGameState,
  getPosition,
  getTeam,
  listEvents,
  ownValidFiledCount,
  setPosition,
  updateTeam,
  withMemoryTransaction,
} from "./store";
import type { CardAction, DeviceSession, TeachingModal } from "./types";

export type ScanBody = {
  qr?: string;
  cardId?: string;
  deviceId: string;
  action: CardAction;
  idempotencyKey: string;
};

export type ScanResponse =
  | {
      ok: true;
      replay: boolean;
      delta_aed: number;
      kind: string;
      capital_aed: number;
      modal: TeachingModal;
    }
  | { ok: false; status: number; error: string; hint?: string };

export async function executeScan(body: ScanBody): Promise<ScanResponse> {
  return withMemoryTransaction(async () => {
    const device = getDevice(body.deviceId);
    if (!device) return executeScanUnlocked(body);
    const eventKey = `scan:${body.deviceId}:${body.idempotencyKey}`;
    const operation = beginMemoryOperation<Extract<ScanResponse, { ok: true }>>(
      body.idempotencyKey,
      `scan:${body.deviceId}:${device.table_no}`,
      { qr: body.qr ?? null, cardId: body.cardId?.toUpperCase() ?? null, action: body.action },
    );
    if (operation.kind === "conflict") {
      return { ok: false, status: 409, error: "Idempotency key was already used for a different request" };
    }
    if (operation.kind === "replay") return { ...operation.response, replay: true };
    await advanceMemoryTimelineUnlocked(new Date());
    const response = await executeScanUnlocked(body, eventKey);
    if (response.ok) completeMemoryOperation(body.idempotencyKey, response);
    else cancelMemoryOperation(body.idempotencyKey);
    return response;
  });
}

export async function executeMemoryScan(
  session: DeviceSession,
  body: Omit<ScanBody, "deviceId">,
): Promise<ScanResponse> {
  return executeScan({ ...body, deviceId: session.deviceId });
}

async function executeScanUnlocked(body: ScanBody, eventKey = body.idempotencyKey): Promise<ScanResponse> {
  const device = getDevice(body.deviceId);
  if (!device) {
    return { ok: false, status: 401, error: "Device not joined. Re-enter table PIN." };
  }

  const roleOk =
    device.role === "TAX" || device.role === "ALL_ROLES";
  if (!roleOk) {
    return {
      ok: false,
      status: 403,
      error: "Only the Tax & Compliance Director can file or quarantine.",
    };
  }

  const card = body.qr
    ? getCardByQr(body.qr)
    : body.cardId
      ? getCardById(body.cardId.toUpperCase())
      : null;
  if (!card) {
    return { ok: false, status: 404, error: "Card not recognised" };
  }

  const team = getTeam(device.table_no);
  if (!team) {
    return { ok: false, status: 404, error: "Table not found" };
  }

  const gs = getGameState();
  if (gs.phase === "FROZEN") {
    return { ok: false, status: 409, error: "Game frozen. Writes rejected." };
  }

  const allow = deckAllowedInPhase(card.deck, gs.phase, team);
  if (!allow.ok) {
    return {
      ok: false,
      status: 409,
      error: "Deck locked for this phase",
      hint: allow.hint,
    };
  }

  const pos = getPosition(card.card_id);
  if (!pos) {
    return { ok: false, status: 404, error: "Card position missing" };
  }

  if (pos.held_by_table !== device.table_no) {
    return {
      ok: false,
      status: 409,
      error: `Table ${String(pos.held_by_table).padStart(2, "0")} holds this card`,
    };
  }

  if (
    pos.state === "FILED" ||
    pos.state === "QUARANTINED" ||
    pos.state === "PLAYED" ||
    pos.state === "TRADED"
  ) {
    const prior = listEvents(device.table_no).find((e) => e.card_id === card.card_id);
    const modal = (prior?.meta?.modal as TeachingModal) ?? {
      title: "Already resolved",
      kind: "FILE_VALID_OWN" as const,
      delta_aed: 0,
      why: card.payload.why ? String(card.payload.why) : "Already processed.",
      icon: "info" as const,
      word: "Done",
      card_id: card.card_id,
    };
    return {
      ok: false,
      status: 409,
      error: `Card already ${pos.state.toLowerCase()}.`,
      hint: prior?.kind ?? pos.state,
      modal,
      replay: true,
      delta_aed: prior?.delta_aed ?? 0,
      capital_aed: team.capital_aed,
      kind: prior?.kind ?? pos.state,
    } as unknown as ScanResponse;
  }

  const finalWindow = inFinalFiveMinutes(gs);

  if (card.deck === "GREEN") {
    const scored = scoreGreenPlay(card, team, { inFinalWindow: finalWindow });
    const event = appendEvent({
      table_no: device.table_no,
      actor_role: device.role,
      kind: scored.kind,
      card_id: card.card_id,
      delta_aed: scored.delta_aed,
      idempotency_key: eventKey,
      meta: { modal: scored.modal, flags: scored.flags },
    });
    setPosition(card.card_id, { state: "PLAYED" });
    if (scored.flags?.set_impl_immunity) {
      updateTeam(device.table_no, { impl_immunity: true });
    }
    if (scored.flags?.set_penalty_cap != null) {
      updateTeam(device.table_no, { penalty_cap_aed: scored.flags.set_penalty_cap });
    }
    if (scored.flags?.set_final_multiplier) {
      updateTeam(device.table_no, { final_multiplier: true });
    }
    if (scored.flags?.auto_resolve_held) {
      await autoResolveHeld(device.table_no, device.role, finalWindow);
    }
    await publishTable(device.table_no);
    const refreshed = getTeam(device.table_no)!;
    return {
      ok: true,
      replay: event.idempotency_key !== eventKey,
      delta_aed: scored.delta_aed,
      kind: scored.kind,
      capital_aed: refreshed.capital_aed,
      modal: scored.modal,
    };
  }

  const scored = scoreScan(card, team, {
    tableNo: device.table_no,
    action: body.action,
    inFinalWindow: finalWindow,
  });

  // Foreign file does not change position — rejected
  if (scored.kind === "FILE_FOREIGN") {
    const event = appendEvent({
      table_no: device.table_no,
      actor_role: device.role,
      kind: scored.kind,
      card_id: card.card_id,
      delta_aed: scored.delta_aed,
      idempotency_key: eventKey,
      meta: { modal: scored.modal },
    });
    await publishTable(device.table_no);
    return {
      ok: true,
      replay: false,
      delta_aed: event.delta_aed,
      kind: scored.kind,
      capital_aed: getTeam(device.table_no)!.capital_aed,
      modal: scored.modal,
    };
  }

  const newState =
    body.action === "FILE" ? ("FILED" as const) : ("QUARANTINED" as const);

  // Only mark filed/quarantined when it's a real disposition (not foreign reject)
  if (
    scored.kind !== "PRACTICE_SCAN" ||
    card.deck === "PRACTICE"
  ) {
    if (card.deck === "PRACTICE") {
      setPosition(card.card_id, { state: "PLAYED" });
    } else if (
      scored.kind === "FILE_VALID_OWN" ||
      scored.kind === "FILE_INVALID" ||
      scored.kind === "FILE_OUT_OF_SCOPE" ||
      scored.kind === "QUARANTINE_CORRECT" ||
      scored.kind === "QUARANTINE_INCORRECT"
    ) {
      setPosition(card.card_id, { state: newState });
    }
  }

  appendEvent({
    table_no: device.table_no,
    actor_role: device.role,
    kind: scored.kind,
    card_id: card.card_id,
    delta_aed: scored.delta_aed,
    idempotency_key: eventKey,
    meta: { modal: scored.modal },
  });

  if (scored.flags?.ledger_close_candidate) {
    const teamNow = getTeam(device.table_no)!;
    if (!teamNow.ledger_closed && ownValidFiledCount(device.table_no) >= 6) {
      const close = scoreLedgerClose(teamNow, { inFinalWindow: finalWindow });
      appendEvent({
        table_no: device.table_no,
        actor_role: device.role,
        kind: close.kind,
        delta_aed: close.delta_aed,
        idempotency_key: `${eventKey}:ledger`,
        meta: { modal: close.modal },
      });
      updateTeam(device.table_no, { ledger_closed: true });
    }
  }

  await publishTable(device.table_no);
  const refreshed = getTeam(device.table_no)!;
  return {
    ok: true,
    replay: false,
    delta_aed: scored.delta_aed,
    kind: scored.kind,
    capital_aed: refreshed.capital_aed,
    modal: scored.modal,
  };
}

async function autoResolveHeld(
  tableNo: number,
  role: string,
  inFinalWindow: boolean,
) {
  const { listPositionsForTable } = await import("./store");
  const positions = listPositionsForTable(tableNo).filter(
    (p) => p.state === "PENDING",
  );
  for (const pos of positions) {
    const card = getCardById(pos.card_id);
    if (!card || card.deck !== "RED") continue;
    const team = getTeam(tableNo)!;
    if (card.validity === "VALID" && card.owner_table === tableNo) {
      const scored = scoreScan(card, team, {
        tableNo,
        action: "FILE",
        inFinalWindow,
      });
      appendEvent({
        table_no: tableNo,
        actor_role: role,
        kind: scored.kind,
        card_id: card.card_id,
        delta_aed: scored.delta_aed,
        meta: { modal: scored.modal, via: "GRN-04" },
      });
      setPosition(card.card_id, { state: "FILED" });
    } else if (
      card.validity === "INVALID" ||
      card.validity === "OUT_OF_SCOPE"
    ) {
      // Quarantine at zero penalty (automation) — use QUARANTINE_CORRECT kind with 0 delta override
      appendEvent({
        table_no: tableNo,
        actor_role: role,
        kind: "QUARANTINE_CORRECT",
        card_id: card.card_id,
        delta_aed: 0,
        meta: {
          via: "GRN-04",
          modal: {
            title: card.payload.title ?? "Auto-quarantined",
            kind: "QUARANTINE_CORRECT",
            delta_aed: 0,
            why: String(card.payload.why ?? ""),
            icon: "check",
            word: "Auto",
            card_id: card.card_id,
          },
        },
      });
      setPosition(card.card_id, { state: "QUARANTINED" });
    }
  }
  const teamNow = getTeam(tableNo)!;
  if (!teamNow.ledger_closed && ownValidFiledCount(tableNo) >= 6) {
    const close = scoreLedgerClose(teamNow, { inFinalWindow });
    appendEvent({
      table_no: tableNo,
      actor_role: role,
      kind: close.kind,
      delta_aed: close.delta_aed,
      meta: { modal: close.modal, via: "GRN-04" },
    });
    updateTeam(tableNo, { ledger_closed: true });
  }
}
