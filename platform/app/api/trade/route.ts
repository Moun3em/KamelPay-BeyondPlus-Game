import { NextResponse } from "next/server";
import {
  appendEvent,
  getCardById,
  getPosition,
  getTeam,
  setPosition,
  listEvents,
  getGameState,
} from "@/lib/store";
import { scoreTradeValidated } from "@/lib/scoring";
import { inFinalFiveMinutes } from "@/lib/engines/clock";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

/**
 * ASP station trade validation.
 * Body: { cardId, fromTable, toTable, doubled? }
 * Moves ownership of a foreign valid invoice to its owner and awards network bonus both sides.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    cardId?: string;
    fromTable?: number;
    toTable?: number;
    doubled?: boolean;
    idempotencyKey?: string;
  };

  const gs = getGameState();
  if (gs.phase === "FROZEN" || gs.phase === "DEBRIEF" || gs.phase === "LOBBY") {
    return NextResponse.json({ error: "Frozen or not in trade phase" }, { status: 409 });
  }
  if (gs.phase !== "B" && gs.phase !== "C") {
    return NextResponse.json(
      { error: "Trades only in Phase B or C" },
      { status: 409 },
    );
  }

  const cardId = String(body.cardId ?? "").toUpperCase();
  const fromTable = Number(body.fromTable);
  const toTable = Number(body.toTable);
  const card = getCardById(cardId);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const pos = getPosition(cardId);
  if (!pos || pos.held_by_table !== fromTable) {
    return NextResponse.json(
      { error: "From-table does not hold this card" },
      { status: 409 },
    );
  }
  if (card.owner_table !== toTable) {
    return NextResponse.json(
      { error: "To-table is not the owner of this invoice" },
      { status: 409 },
    );
  }
  if (card.validity !== "VALID" || card.deck !== "RED") {
    return NextResponse.json({ error: "Only valid red invoices trade" }, { status: 400 });
  }

  const key = body.idempotencyKey ?? `trade:${cardId}:${fromTable}:${toTable}`;
  const prior = listEvents(fromTable).find((e) => e.idempotency_key === key);
  if (prior) {
    return NextResponse.json({ ok: true, replay: true });
  }

  // Transfer hold to owner
  setPosition(cardId, { held_by_table: toTable, state: "PENDING" });

  const finalWindow = inFinalFiveMinutes(gs);
  for (const tableNo of [fromTable, toTable]) {
    const team = getTeam(tableNo)!;
    const scored = scoreTradeValidated(team, {
      cardId,
      doubled: Boolean(body.doubled),
      inFinalWindow: finalWindow,
    });
    appendEvent({
      table_no: tableNo,
      actor_role: "ASP",
      kind: scored.kind,
      card_id: cardId,
      delta_aed: scored.delta_aed,
      idempotency_key: `${key}:${tableNo}`,
      meta: { modal: scored.modal, counterparty: tableNo === fromTable ? toTable : fromTable },
    });
    await publishTable(tableNo);
  }

  return NextResponse.json({
    ok: true,
    card_id: cardId,
    now_held_by: toTable,
  });
}
