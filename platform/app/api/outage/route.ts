import { NextResponse } from "next/server";
import { OUTAGE_ANSWER } from "@/lib/config";
import {
  appendEvent,
  getDevice,
  getGameState,
  getTeam,
  listTeams,
  updateTeam,
  derivedCapital,
} from "@/lib/store";
import { scoreOutageResolved, scoreOutageTick } from "@/lib/scoring";
import { outageOffsetSeconds } from "@/lib/engines/outage";
import { elapsedMs } from "@/lib/engines/clock";
import { PHASE_DURATIONS_MS } from "@/lib/config";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    action?: "tick" | "solve" | "arm";
    deviceId?: string;
    tableNo?: number;
    answer?: string;
  };

  if (body.action === "arm") {
    // Called when Phase C begins — schedule per-table outages
    const teams = listTeams()
      .map((t) => ({ ...t, capital: derivedCapital(t.table_no) }))
      .sort((a, b) => b.capital - a.capital);
    teams.forEach((t, idx) => {
      const { offsetSec, extraHint } = outageOffsetSeconds(idx + 1, teams.length);
      updateTeam(t.table_no, {
        // stash schedule in wrong_tries temporarily? use meta via event
      });
      appendEvent({
        table_no: t.table_no,
        actor_role: "SYSTEM",
        kind: "FACILITATOR_ADJUST",
        delta_aed: 0,
        meta: {
          system: "outage_schedule",
          offsetSec,
          extraHint,
          fires_at_phase_c_elapsed_sec: offsetSec,
        },
      });
    });
    return NextResponse.json({ ok: true, scheduled: teams.length });
  }

  if (body.action === "tick") {
    // Fire outages due + apply ticks for active outages
    const gs = getGameState();
    if (gs.phase !== "C") {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const e = elapsedMs(gs);
    const phaseCStart =
      PHASE_DURATIONS_MS.TUTORIAL +
      PHASE_DURATIONS_MS.A +
      PHASE_DURATIONS_MS.B;
    const intoC = Math.max(0, e - phaseCStart);

    const teams = listTeams()
      .map((t) => ({ ...t, capital: derivedCapital(t.table_no) }))
      .sort((a, b) => b.capital - a.capital);

    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      const { offsetSec } = outageOffsetSeconds(i + 1, teams.length);
      if (
        !t.outage_active &&
        !t.green_unlocked &&
        intoC >= offsetSec * 1000
      ) {
        updateTeam(t.table_no, { outage_active: true });
        await publishTable(t.table_no);
      }
      const live = getTeam(t.table_no)!;
      if (live.outage_active) {
        const tick = scoreOutageTick(live);
        if (tick) {
          appendEvent({
            table_no: t.table_no,
            actor_role: "SYSTEM",
            kind: tick.kind,
            delta_aed: tick.delta_aed,
            meta: { modal: tick.modal },
          });
          updateTeam(t.table_no, {
            outage_loss_aed: live.outage_loss_aed + tick.delta_aed,
          });
          await publishTable(t.table_no);
        }
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "solve") {
    const device = body.deviceId ? getDevice(body.deviceId) : null;
    const tableNo = device?.table_no ?? Number(body.tableNo);
    if (!tableNo) {
      return NextResponse.json({ error: "table required" }, { status: 400 });
    }
    const roleOk = !device || device.role === "CIO" || device.role === "ALL_ROLES";
    if (!roleOk) {
      return NextResponse.json(
        { error: "Only CIO can submit the outage sequence" },
        { status: 403 },
      );
    }
    const team = getTeam(tableNo);
    if (!team?.outage_active) {
      return NextResponse.json({ error: "No active outage" }, { status: 409 });
    }

    const normalized = String(body.answer ?? "")
      .trim()
      .replace(/\s+/g, "");
    if (normalized !== OUTAGE_ANSWER) {
      const tries = team.outage_wrong_tries + 1;
      updateTeam(tableNo, { outage_wrong_tries: tries });
      const hint =
        tries >= 3
          ? "Hint: supplier-issued invoice routing starts at Corner 1, then the supplier ASP."
          : null;
      const force =
        tries >= 5
          ? "Five wrong attempts — ask a facilitator to force-resolve from /console."
          : null;
      await publishTable(tableNo);
      return NextResponse.json({
        ok: false,
        wrong: true,
        tries,
        hint,
        force,
      });
    }

    const scored = scoreOutageResolved();
    const first =
      listTeams().filter((t) => t.badges.includes("CRISIS_MANAGER")).length === 0;
    appendEvent({
      table_no: tableNo,
      actor_role: device?.role ?? "CIO",
      kind: scored.kind,
      delta_aed: 0,
      meta: { modal: scored.modal },
    });
    const badges = [...team.badges];
    if (first) badges.push("CRISIS_MANAGER");
    updateTeam(tableNo, {
      outage_active: false,
      green_unlocked: true,
      badges,
    });
    if (first) {
      appendEvent({
        table_no: tableNo,
        actor_role: "SYSTEM",
        kind: "BADGE_AWARDED",
        delta_aed: 0,
        meta: { badge: "CRISIS_MANAGER" },
      });
    }
    await publishTable(tableNo);
    return NextResponse.json({
      ok: true,
      green_unlocked: true,
      badge: first ? "CRISIS_MANAGER" : null,
      modal: scored.modal,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
