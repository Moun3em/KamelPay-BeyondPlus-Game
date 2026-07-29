import { NextResponse } from "next/server";
import { readSession } from "@/lib/session";
import {
  derivedCapital,
  foreignHeldForOthers,
  getGameState,
  getTeam,
  listDevices,
  listEvents,
  listTeams,
  missingOwnValid,
  ownValidFiledCount,
  usingMemoryStore,
} from "@/lib/store";
import { elapsedMs, formatClock, remainingInPhaseMs } from "@/lib/engines/clock";
import { ECONOMY } from "@/lib/config";
import { getTick } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") ?? "session";

  const gs = getGameState();
  const tick = await getTick();
  const elapsed = elapsedMs(gs);
  const remaining = remainingInPhaseMs(gs);

  if (scope === "projection" || scope === "leaderboard") {
    const teams = listTeams().map((t) => {
      const truth = derivedCapital(t.table_no);
      const display = Math.max(ECONOMY.display_floor, truth);
      return {
        table_no: t.table_no,
        capital_aed: truth,
        display_aed: display,
        under_review: truth < ECONOMY.display_floor,
        badges: t.badges,
        ledger_closed: t.ledger_closed,
        outage_active: t.outage_active,
        green_unlocked: t.green_unlocked,
      };
    });
    teams.sort((a, b) => b.capital_aed - a.capital_aed);
    return NextResponse.json({
      phase: gs.phase,
      banner: gs.narrative_banner,
      clock: formatClock(remaining || elapsed),
      remaining_ms: remaining,
      elapsed_ms: elapsed,
      paused: Boolean(gs.clock_paused_at),
      teams,
      tick,
      store: usingMemoryStore() ? "memory" : "postgres",
    });
  }

  if (scope === "console") {
    const teams = listTeams().map((t) => {
      const devices = listDevices(t.table_no);
      const events = listEvents(t.table_no);
      const last = events[events.length - 1];
      return {
        table_no: t.table_no,
        capital_aed: derivedCapital(t.table_no),
        devices: devices.map((d) => d.role),
        device_count: devices.length,
        filed: ownValidFiledCount(t.table_no),
        outage_active: t.outage_active,
        green_unlocked: t.green_unlocked,
        ledger_closed: t.ledger_closed,
        badges: t.badges,
        last_activity: last?.at ?? null,
      };
    });
    return NextResponse.json({
      phase: gs.phase,
      banner: gs.narrative_banner,
      clock_started_at: gs.clock_started_at,
      paused: Boolean(gs.clock_paused_at),
      remaining_ms: remaining,
      teams,
    });
  }

  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: "Not joined" }, { status: 401 });
  }
  const team = getTeam(session.tableNo);
  if (!team) {
    return NextResponse.json({ error: "Table missing" }, { status: 404 });
  }
  const events = listEvents(session.tableNo).slice(-20).reverse();
  return NextResponse.json({
    session,
    phase: gs.phase,
    banner: gs.narrative_banner,
    remaining_ms: remaining,
    elapsed_ms: elapsed,
    paused: Boolean(gs.clock_paused_at),
    capital_aed: derivedCapital(session.tableNo),
    cache_capital_aed: team.capital_aed,
    ledger: {
      filed: ownValidFiledCount(session.tableNo),
      of: 6,
      closed: team.ledger_closed,
      missing: missingOwnValid(session.tableNo),
      holding_for: foreignHeldForOthers(session.tableNo),
    },
    outage: {
      active: team.outage_active,
      green_unlocked: team.green_unlocked,
      wrong_tries: team.outage_wrong_tries,
      loss_aed: team.outage_loss_aed,
    },
    badges: team.badges,
    events: events.map((e) => ({
      at: e.at,
      kind: e.kind,
      delta_aed: e.delta_aed,
      card_id: e.card_id,
    })),
    devices: listDevices(session.tableNo),
    tick,
  });
}
