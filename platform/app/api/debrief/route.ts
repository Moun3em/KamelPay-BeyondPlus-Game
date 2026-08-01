import { NextResponse } from "next/server";
import { consoleTokenFromRequest, requireConsoleToken, AuthError } from "@/lib/auth";
import { friendlyError } from "@/lib/error-response";
import { getGameState } from "@/lib/store";
import { sql } from "@/lib/db";
import { selectStoreKind } from "@/lib/store.interface";
import { computeDebrief } from "@/lib/debrief";
import type { EventRow } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Debrief data view (PRD §10): fines, X3 wrongly-filed, GRN-04 comparison. */
export async function GET(req: Request) {
  try {
    requireConsoleToken(consoleTokenFromRequest(req));
    const storeKind = selectStoreKind();

    if (storeKind === "postgres") {
      const [gameRows, eventRows, teamRows] = await Promise.all([
        sql.query("SELECT clock_started_at FROM game_state WHERE id = 1"),
        sql.query("SELECT table_no, kind, card_id, delta_aed, at FROM events ORDER BY id"),
        sql.query("SELECT table_no FROM teams ORDER BY table_no"),
      ]);
      const events: EventRow[] = eventRows.rows.map((r) => ({
        id: 0,
        at: new Date(String(r.at)).toISOString(),
        table_no: Number(r.table_no),
        actor_role: null,
        kind: String(r.kind),
        card_id: r.card_id == null ? null : String(r.card_id),
        delta_aed: Number(r.delta_aed),
        meta: null,
        idempotency_key: null,
      }));
      const debrief = computeDebrief({
        clockStartedAt: gameRows.rows[0]?.clock_started_at == null ? null : new Date(String(gameRows.rows[0].clock_started_at)).toISOString(),
        events,
        tableNos: teamRows.rows.map((r) => Number(r.table_no)),
      });
      return NextResponse.json({ store: storeKind, ...debrief });
    }

    const debrief = computeDebrief({ clockStartedAt: getGameState().clock_started_at });
    return NextResponse.json({ store: storeKind, ...debrief });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return friendlyError("[api/debrief]", error, "Debrief failed");
  }
}
