import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConfig, PHASES, type Phase } from "@/lib/config";
import { CONSOLE_COOKIE } from "@/lib/session";
import {
  appendEvent,
  getTeam,
  listTeams,
  releaseDevice,
  releaseRole,
  setGameState,
  getGameState,
  updateTeam,
  derivedCapital,
} from "@/lib/store";
import { publishGlobal, publishTable } from "@/lib/sse";
import { scoreOutageResolved } from "@/lib/scoring";
import { isBadgeCode } from "@/lib/engines/badges";
import type { Role } from "@/lib/config";

export const runtime = "nodejs";

async function requireConsole() {
  const jar = await cookies();
  return jar.get(CONSOLE_COOKIE)?.value === "1";
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: string;
    pin?: string;
    tableNo?: number;
    amount?: number;
    reason?: string;
    badge?: string;
    role?: string;
    deviceId?: string;
    banner?: string;
    phase?: Phase;
  };

  if (body.action === "login") {
    const cfg = getConfig();
    if (body.pin !== cfg.facilitatorPin) {
      return NextResponse.json({ error: "Bad facilitator PIN" }, { status: 401 });
    }
    const jar = await cookies();
    jar.set(CONSOLE_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    return NextResponse.json({ ok: true });
  }

  if (!(await requireConsole())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gs = getGameState();

  switch (body.action) {
    case "set_phase": {
      if (!body.phase || !PHASES.includes(body.phase)) {
        return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
      }
      const patch: Parameters<typeof setGameState>[0] = { phase: body.phase };
      if (
        (body.phase === "TUTORIAL" || body.phase === "A") &&
        !gs.clock_started_at
      ) {
        patch.clock_started_at = new Date().toISOString();
      }
      if (body.phase === "FROZEN") {
        patch.clock_paused_at = new Date().toISOString();
      }
      setGameState(patch);
      appendEvent({
        table_no: 0,
        actor_role: "FACILITATOR",
        kind: "PHASE_CHANGE",
        delta_aed: 0,
        meta: { phase: body.phase },
      });
      await publishGlobal({ phase: body.phase });
      return NextResponse.json({ ok: true, game: getGameState() });
    }
    case "pause": {
      if (!gs.clock_paused_at) {
        setGameState({ clock_paused_at: new Date().toISOString() });
      }
      await publishGlobal();
      return NextResponse.json({ ok: true, paused: true });
    }
    case "resume": {
      if (gs.clock_paused_at) {
        const pausedAt = new Date(gs.clock_paused_at).getTime();
        const add = Date.now() - pausedAt;
        setGameState({
          clock_paused_at: null,
          paused_ms_total: (gs.paused_ms_total ?? 0) + add,
        });
      }
      await publishGlobal();
      return NextResponse.json({ ok: true, paused: false });
    }
    case "broadcast": {
      setGameState({ narrative_banner: body.banner ?? null });
      await publishGlobal({ banner: body.banner ?? null });
      return NextResponse.json({ ok: true });
    }
    case "adjust": {
      const tableNo = Number(body.tableNo);
      if (!getTeam(tableNo)) {
        return NextResponse.json({ error: "Unknown table" }, { status: 404 });
      }
      if (!body.reason?.trim()) {
        return NextResponse.json({ error: "Reason required" }, { status: 400 });
      }
      const amount = Number(body.amount ?? 0);
      appendEvent({
        table_no: tableNo,
        actor_role: "FACILITATOR",
        kind: "FACILITATOR_ADJUST",
        delta_aed: amount,
        meta: { reason: body.reason },
      });
      await publishTable(tableNo);
      return NextResponse.json({
        ok: true,
        capital_aed: derivedCapital(tableNo),
      });
    }
    case "force_resolve_outage": {
      const tableNo = Number(body.tableNo);
      const team = getTeam(tableNo);
      if (!team) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
      const scored = scoreOutageResolved();
      appendEvent({
        table_no: tableNo,
        actor_role: "FACILITATOR",
        kind: scored.kind,
        delta_aed: 0,
        meta: { via: "console", modal: scored.modal },
      });
      updateTeam(tableNo, {
        outage_active: false,
        green_unlocked: true,
      });
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "unlock_green": {
      const tableNo = Number(body.tableNo);
      updateTeam(tableNo, { green_unlocked: true });
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "award_badge": {
      const tableNo = Number(body.tableNo);
      const badge = body.badge ?? "";
      if (!isBadgeCode(badge)) {
        return NextResponse.json({ error: "Unknown badge" }, { status: 400 });
      }
      const team = getTeam(tableNo);
      if (!team) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
      if (!team.badges.includes(badge)) {
        updateTeam(tableNo, { badges: [...team.badges, badge] });
        appendEvent({
          table_no: tableNo,
          actor_role: "FACILITATOR",
          kind: "BADGE_AWARDED",
          delta_aed: 0,
          meta: { badge },
        });
      }
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "ensure_badges": {
      // Every table finishes with ≥1 badge
      for (const t of listTeams()) {
        if (t.badges.length === 0) {
          updateTeam(t.table_no, { badges: ["CLEAN_CLOSE"] });
          appendEvent({
            table_no: t.table_no,
            actor_role: "FACILITATOR",
            kind: "BADGE_AWARDED",
            delta_aed: 0,
            meta: { badge: "CLEAN_CLOSE", via: "ensure" },
          });
        }
      }
      await publishGlobal();
      return NextResponse.json({ ok: true });
    }
    case "release_role": {
      const tableNo = Number(body.tableNo);
      releaseRole(tableNo, body.role as Role);
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "reset_device": {
      if (body.deviceId) releaseDevice(body.deviceId);
      return NextResponse.json({ ok: true });
    }
    case "kill": {
      setGameState({ phase: "FROZEN", clock_paused_at: new Date().toISOString() });
      await publishGlobal({ phase: "FROZEN" });
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
