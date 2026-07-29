import { NextResponse } from "next/server";
import { ECONOMY } from "@/lib/config";
import { derivedCapital, getTeam, listEvents, sumDeltas } from "@/lib/store";
import { auditTablePg } from "@/lib/store.pg";
import { selectStoreKind } from "@/lib/store.interface";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ table: string }> }) {
  const tableNo = Number((await ctx.params).table);
  if (!Number.isInteger(tableNo)) return NextResponse.json({ error: "Invalid table" }, { status: 400 });

  if (selectStoreKind() === "postgres") {
    const audit = await auditTablePg(tableNo);
    if (!audit) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
    return NextResponse.json({
      table_no: tableNo,
      starting_capital: ECONOMY.starting_capital,
      sum_delta_aed: audit.sum_delta_aed,
      derived_capital_aed: audit.derived_capital_aed,
      cache_capital_aed: audit.team.capital_aed,
      reconciled: audit.derived_capital_aed === audit.team.capital_aed,
      badges: audit.team.badges,
      events: audit.events,
    });
  }

  const team = getTeam(tableNo);
  if (!team) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const events = listEvents(tableNo);
  const sum = sumDeltas(tableNo);
  const derived = derivedCapital(tableNo);
  return NextResponse.json({
    table_no: tableNo, starting_capital: ECONOMY.starting_capital,
    sum_delta_aed: sum, derived_capital_aed: derived, cache_capital_aed: team.capital_aed,
    reconciled: derived === team.capital_aed, badges: team.badges,
    events: events.map(({ id, at, kind, delta_aed, card_id, actor_role, meta }) => ({ id, at, kind, delta_aed, card_id, actor_role, meta })),
  });
}
