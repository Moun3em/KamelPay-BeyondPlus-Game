import { NextResponse } from "next/server";
import {
  derivedCapital,
  getTeam,
  listEvents,
  sumDeltas,
} from "@/lib/store";
import { ECONOMY } from "@/lib/config";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ table: string }> },
) {
  const { table } = await ctx.params;
  const tableNo = Number(table);
  const team = getTeam(tableNo);
  if (!team) {
    return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }

  const events = listEvents(tableNo);
  const sum = sumDeltas(tableNo);
  const derived = derivedCapital(tableNo);
  const cache = team.capital_aed;

  return NextResponse.json({
    table_no: tableNo,
    starting_capital: ECONOMY.starting_capital,
    sum_delta_aed: sum,
    derived_capital_aed: derived,
    cache_capital_aed: cache,
    reconciled: derived === cache,
    badges: team.badges,
    events: events.map((e) => ({
      id: e.id,
      at: e.at,
      kind: e.kind,
      delta_aed: e.delta_aed,
      card_id: e.card_id,
      actor_role: e.actor_role,
      meta: e.meta,
    })),
  });
}
