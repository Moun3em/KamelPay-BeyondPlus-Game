import { NextResponse } from "next/server";
import { authenticateDeviceToken, consoleTokenFromRequest, deviceTokenFromRequest, requireConsoleToken, AuthError } from "@/lib/auth";
import { elapsedMs, formatClock, remainingInPhaseMs } from "@/lib/engines/clock";
import { ECONOMY } from "@/lib/config";
import { selfTickOutageOnce } from "@/lib/db";
import { getTick } from "@/lib/sse";
import { ensureEveryTableHasABadge } from "@/lib/badges";
import {
  derivedCapital, foreignHeldForOthers, getDevice, getGameState, getTeam, listDevices,
  listEvents, listTeams, missingOwnValid, ownValidFiledCount,
} from "@/lib/store";
import { getDevicePg, stateSnapshotPg } from "@/lib/store.pg";
import { selectStoreKind } from "@/lib/store.interface";


export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    // Opportunistic self-tick (Vercel Hobby caps minutely cron): drive the
    // timeline/outage tick from the request hot path. Throttled to once per
    // ~5s per instance and idempotent (SELECT FOR UPDATE); never awaited.
    // Middleware is deliberately NOT used — a Node-runtime middleware bundle
    // cannot resolve the DB stack on Vercel (MIDDLEWARE_INVOCATION_FAILED).
    selfTickOutageOnce().catch(() => undefined);

    const scope = new URL(req.url).searchParams.get("scope") ?? "session";
    const storeKind = selectStoreKind();
    const pg = storeKind === "postgres" ? await stateSnapshotPg() : null;
    const gs = pg?.game ?? getGameState();
    const tick = await getTick();
    const elapsed = elapsedMs(gs);
    const remaining = remainingInPhaseMs(gs);

    if (scope === "projection" || scope === "leaderboard") {
      const source = pg ? pg.teams : listTeams().map((team) => ({ ...team, capital_aed: derivedCapital(team.table_no) }));
      if (!pg) ensureEveryTableHasABadge();
      const teams = source.map((team) => ({
        table_no: team.table_no, capital_aed: team.capital_aed,
        display_aed: Math.max(ECONOMY.display_floor, team.capital_aed),
        under_review: team.capital_aed < ECONOMY.display_floor,
        badges: team.badges, ledger_closed: team.ledger_closed,
        outage_active: team.outage_active, green_unlocked: team.green_unlocked,
      })).sort((a, b) => b.capital_aed - a.capital_aed);
      return NextResponse.json({ phase: gs.phase, banner: gs.narrative_banner,
        clock: formatClock(remaining || elapsed), remaining_ms: remaining, elapsed_ms: elapsed,
        paused: Boolean(gs.clock_paused_at), teams, tick, store: storeKind, activeTables: gs.activeTables });
    }

    if (scope === "console") {
      requireConsoleToken(consoleTokenFromRequest(req));
      const teams = pg ? pg.teams.map((team) => ({
        table_no: team.table_no, capital_aed: team.capital_aed,
        devices: team.devices.map((device) => device.role), device_count: team.devices.length,
        filed: team.filed, outage_active: team.outage_active, green_unlocked: team.green_unlocked,
        ledger_closed: team.ledger_closed, badges: team.badges,
        last_activity: team.events.at(-1)?.at ?? null,
      })) : listTeams().map((team) => {
        const devices = listDevices(team.table_no);
        const events = listEvents(team.table_no);
        return { table_no: team.table_no, capital_aed: derivedCapital(team.table_no),
          devices: devices.map((device) => device.role), device_count: devices.length,
          filed: ownValidFiledCount(team.table_no), outage_active: team.outage_active,
          green_unlocked: team.green_unlocked, ledger_closed: team.ledger_closed,
          badges: team.badges, last_activity: events.at(-1)?.at ?? null };
      });
      return NextResponse.json({ phase: gs.phase, banner: gs.narrative_banner,
        clock_started_at: gs.clock_started_at, paused: Boolean(gs.clock_paused_at), remaining_ms: remaining, teams,
        activeTables: gs.activeTables });
    }

    const session = await authenticateDeviceToken(
      deviceTokenFromRequest(req), storeKind === "postgres" ? getDevicePg : async (id) => getDevice(id),
    );
    const selected = pg?.teams.find((team) => team.table_no === session.tableNo);
    const team = selected ?? getTeam(session.tableNo);
    if (!team) return NextResponse.json({ error: "Table missing" }, { status: 404 });
    const events = selected?.events ?? listEvents(session.tableNo);
    const devices = selected?.devices ?? listDevices(session.tableNo);
    const positions = selected?.positions ?? [];
    const missing = selected ? positions.filter((position) => position.deck === "RED" && Number(position.owner_table) === session.tableNo && position.validity === "VALID" && position.state === "PENDING")
      .map((position) => ({ archetype: String(position.archetype), held_by_table: Number(position.held_by_table), card_id: String(position.card_id) })) : missingOwnValid(session.tableNo);
    const holding = selected ? positions.filter((position) => position.deck === "RED" && position.validity === "VALID" && Number(position.owner_table) !== session.tableNo && position.state === "PENDING")
      .map((position) => ({ card_id: String(position.card_id), archetype: String(position.archetype), owner_table: Number(position.owner_table) })) : foreignHeldForOthers(session.tableNo);
    return NextResponse.json({ session, phase: gs.phase, banner: gs.narrative_banner,
      remaining_ms: remaining, elapsed_ms: elapsed, paused: Boolean(gs.clock_paused_at),
      capital_aed: team.capital_aed,
      cache_capital_aed: selected?.cache_capital_aed ?? getTeam(session.tableNo)?.capital_aed ?? team.capital_aed,
      ledger: { filed: selected?.filed ?? ownValidFiledCount(session.tableNo), of: 6, closed: team.ledger_closed, missing, holding_for: holding },
      outage: { active: team.outage_active, green_unlocked: team.green_unlocked, wrong_tries: team.outage_wrong_tries,
        loss_aed: team.outage_loss_aed, extra_hint: team.outage_extra_hint, scheduled_at: team.outage_scheduled_at },
      badges: team.badges, events: events.slice(-20).reverse().map((event) => ({ at: event.at, kind: event.kind, delta_aed: event.delta_aed, card_id: event.card_id })),
      devices, tick });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    // Don't leak internal stack traces or driver messages to clients.
    // Log full detail to stderr for the facilitator / operator, and
    // return a friendly, non-revealing message.
    console.error("[api/state] unhandled error:", error);
    return NextResponse.json(
      { error: "Game state unavailable" },
      { status: 503 },
    );
  }
}
