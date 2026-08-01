import { NextResponse } from "next/server";
import { consoleTokenFromRequest, requireConsoleToken, AuthError } from "@/lib/auth";
import { friendlyError } from "@/lib/error-response";
import {
  appendEvent,
  beginMemoryOperation,
  cancelMemoryOperation,
  completeMemoryOperation,
  getCardById,
  getGameState,
  getPosition,
  getTeam,
  setPosition,
  withMemoryTransaction,
} from "@/lib/store";
import { scoreTradeValidated } from "@/lib/scoring";
import { inFinalFiveMinutes } from "@/lib/engines/clock";
import { advanceMemoryTimelineUnlocked } from "@/lib/timeline";
import { selectStoreKind } from "@/lib/store.interface";
import { executeTradePg, MutationError } from "@/lib/store.pg";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    requireConsoleToken(consoleTokenFromRequest(req));
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid trade command" }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const allowed = new Set(["cardId", "fromTable", "toTable", "doubled", "idempotencyKey", "reason"]);
    if (Object.keys(body).some((key) => !allowed.has(key)) ||
        typeof body.cardId !== "string" || !/^[A-Z0-9-]{1,64}$/i.test(body.cardId) ||
        typeof body.fromTable !== "number" || !Number.isInteger(body.fromTable) || body.fromTable < 1 || body.fromTable > 10 ||
        typeof body.toTable !== "number" || !Number.isInteger(body.toTable) || body.toTable < 1 || body.toTable > 10 ||
        body.fromTable === body.toTable || typeof body.doubled !== "boolean" ||
        typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 1 || body.idempotencyKey.length > 200 ||
        typeof body.reason !== "string" || body.reason.trim().length < 1 || body.reason.trim().length > 500) {
      return NextResponse.json(
        { error: "cardId, distinct valid tables, boolean doubled, reason, and idempotencyKey required" },
        { status: 400 },
      );
    }
    const cardId = body.cardId.toUpperCase();
    const fromTable = body.fromTable;
    const toTable = body.toTable;
    const doubled = body.doubled;
    const key = body.idempotencyKey;
    const reason = body.reason.trim();

    const kind = selectStoreKind();
    const result = kind === "postgres"
      ? await executeTradePg({ cardId, fromTable, toTable, doubled, idempotencyKey: key, reason })
      : await withMemoryTransaction(async () => {
          type TradeResult = { ok: true; replay: boolean; card_id: string; now_held_by: number };
          const operation = beginMemoryOperation<TradeResult>(key, "console:trade", {
            cardId, fromTable, toTable, doubled, reason,
          });
          if (operation.kind === "conflict") {
            throw new MutationError("Idempotency key was already used for a different request", 409);
          }
          if (operation.kind === "replay") return { ...operation.response, replay: true };
          await advanceMemoryTimelineUnlocked(new Date());
          const gs = getGameState();
          if (gs.phase === "FROZEN" || gs.phase === "DEBRIEF") {
            cancelMemoryOperation(key);
            return { committedFailure: true as const, error: "Leaderboard is locked after final freeze", status: 409 };
          }
          if (gs.phase !== "B" && gs.phase !== "C") {
            cancelMemoryOperation(key);
            return { committedFailure: true as const, error: `Trades only in Phase B or C (current: ${gs.phase})`, status: 409 };
          }
          const card = getCardById(cardId);
          const position = getPosition(cardId);
          if (!card) throw new MutationError("Card not found", 404);
          if (!position) throw new MutationError("Card position missing", 404);
          if (position.held_by_table !== fromTable) throw new MutationError("From-table does not hold this card", 409);
          if (position.state === "TRADED" || position.state === "FILED" || position.state === "QUARANTINED") {
            cancelMemoryOperation(key);
            return { committedFailure: true as const, error: `Card already ${position.state.toLowerCase()} — cannot be re-traded`, status: 409 };
          }
          if (card.owner_table !== toTable || card.validity !== "VALID" || card.deck !== "RED") {
            throw new MutationError("Invalid trade", 409);
          }
          const from = getTeam(fromTable);
          const to = getTeam(toTable);
          if (!from || !to) throw new MutationError("Unknown trade table", 404);
          setPosition(cardId, { held_by_table: toTable, state: "TRADED" });
          for (const [tableNo, state] of [[fromTable, from], [toTable, to]] as const) {
            const scored = scoreTradeValidated(state, {
              cardId,
              doubled,
              inFinalWindow: inFinalFiveMinutes(gs),
            });
            appendEvent({
              table_no: tableNo,
              actor_role: "FACILITATOR",
              kind: scored.kind,
              card_id: cardId,
              delta_aed: scored.delta_aed,
              idempotency_key: `${key}:${tableNo}`,
              meta: { modal: scored.modal, counterparty: tableNo === fromTable ? toTable : fromTable, reason },
            });
          }
          const response = { ok: true as const, replay: false, card_id: cardId, now_held_by: toTable };
          completeMemoryOperation(key, response);
          return response;
        });
    if ("committedFailure" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    await Promise.all([publishTable(fromTable), publishTable(toTable)]);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError || error instanceof MutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return friendlyError("[api/trade]", error, "Trade failed");
  }
}
