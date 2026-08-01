import { NextResponse } from "next/server";
import { friendlyError } from "@/lib/error-response";

import { getConfig, type Phase } from "@/lib/config";
import { CONSOLE_COOKIE, consoleSessionCookieValue, sessionCookieOptions } from "@/lib/session";
import { consoleTokenFromRequest, requireConsoleToken, AuthError } from "@/lib/auth";
import { validateFacilitatorCommand } from "@/lib/facilitator";
import { armMemoryOutagesUnlocked, shiftMemoryOutageTimes } from "@/lib/outage.store";
import { advanceMemoryTimelineUnlocked, isForwardPhaseTransition, manualPhaseClockPatch } from "@/lib/timeline";
import { selectStoreKind } from "@/lib/store.interface";
import { executeFacilitatorPg, MutationError } from "@/lib/store.pg";
import {
  appendEvent,
  beginMemoryOperation,
  cancelMemoryOperation,
  completeMemoryOperation,
  getTeam,
  listTeams,
  releaseDevice,
  releaseRole,
  setGameState,
  getGameState,
  loadSeedIntoMemory,
  updateTeam,
  derivedCapital,
  withMemoryTransaction,
} from "@/lib/store";
import { publishGlobal, publishTable } from "@/lib/sse";
import { scoreOutageResolved } from "@/lib/scoring";
import { isBadgeCode } from "@/lib/engines/badges";
import type { Role } from "@/lib/config";

export const runtime = "nodejs";

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
    idempotencyKey?: string;
  };

  if (body.action === "login") {
    const cfg = getConfig();
    if (body.pin !== cfg.facilitatorPin) {
      return NextResponse.json({ error: "Bad facilitator PIN" }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CONSOLE_COOKIE, consoleSessionCookieValue(), sessionCookieOptions());
    return response;
  }

  try {
    requireConsoleToken(consoleTokenFromRequest(req));
    const command = validateFacilitatorCommand(body);
    if (selectStoreKind() === "postgres") {
      const result = await executeFacilitatorPg(command);
      await publishGlobal();
      return NextResponse.json(result);
    }

    return await withMemoryTransaction(async () => {
      const operationKey = `console:${command.idempotencyKey}`;
      const operation = beginMemoryOperation<Record<string, unknown>>(
        operationKey, "console:facilitator", command,
      );
      if (operation.kind === "conflict") {
        return NextResponse.json(
          { error: "Idempotency key was already used for a different request" },
          { status: 409 },
        );
      }
      if (operation.kind === "replay") {
        return NextResponse.json({ ...operation.response, replay: true });
      }
      await advanceMemoryTimelineUnlocked(new Date());
      const reconciledGame = getGameState();
      if (command.action === "adjust" && (reconciledGame.phase === "FROZEN" || reconciledGame.phase === "DEBRIEF")) {
        cancelMemoryOperation(operationKey);
        return NextResponse.json({ error: "Leaderboard is locked after final freeze" }, { status: 409 });
      }
      appendEvent({
        table_no: "tableNo" in command ? command.tableNo : 0, actor_role: "FACILITATOR", kind: "FACILITATOR_ACTION",
        delta_aed: 0, idempotency_key: operationKey,
        meta: { action: command.action, reason: command.reason },
      });

  const gs = getGameState();

  const response = await (async () => {
  switch (command.action) {
    case "set_phase": {
      if (!isForwardPhaseTransition(gs.phase, command.phase)) {
        throw new MutationError("Phase controls only move forward; use pause or kill for recovery", 409);
      }
      const now = new Date();
      setGameState(manualPhaseClockPatch(command.phase, now));
      if (command.phase === "C") await armMemoryOutagesUnlocked(now);
      appendEvent({
        table_no: 0,
        actor_role: "FACILITATOR",
        kind: "PHASE_CHANGE",
        delta_aed: 0,
        idempotency_key: `${operationKey}:phase`,
        meta: { phase: command.phase, via: "facilitator", reason: command.reason },
      });
      await publishGlobal({ phase: command.phase });
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
        shiftMemoryOutageTimes(add);
        setGameState({
          clock_paused_at: null,
          paused_ms_total: (gs.paused_ms_total ?? 0) + add,
        });
      }
      await publishGlobal();
      return NextResponse.json({ ok: true, paused: false });
    }
    case "set_active_tables": {
      setGameState({ activeTables: command.activeTables });
      appendEvent({
        table_no: 0,
        actor_role: "FACILITATOR",
        kind: "FACILITATOR_ACTION",
        delta_aed: 0,
        idempotency_key: `${operationKey}:active`,
        meta: { action: "set_active_tables", activeTables: command.activeTables, reason: command.reason },
      });
      await publishGlobal({ activeTables: command.activeTables });
      return NextResponse.json({ ok: true, activeTables: command.activeTables });
    }
    case "set_event_mode": {
      setGameState({ event_mode: command.eventMode });
      await publishGlobal();
      return NextResponse.json({ ok: true, eventMode: command.eventMode });
    }
    case "reset_game": {
      if (!["FROZEN", "DEBRIEF", "LOBBY"].includes(getGameState().phase)) {
        // Throw (not return) so withMemoryTransaction rolls back the generic
        // FACILITATOR_ACTION appendEvent and the operation reservation.
        throw new MutationError("Cannot reset while a game is live — freeze or finish it first.", 409);
      }
      loadSeedIntoMemory();
      // The wipe replaced the memory object (and its operations map); re-reserve
      // the current operation so the outer completeMemoryOperation() succeeds.
      beginMemoryOperation(operationKey, "console:facilitator", command);
      appendEvent({
        table_no: 0,
        actor_role: "FACILITATOR",
        kind: "FACILITATOR_ACTION",
        delta_aed: 0,
        idempotency_key: `${operationKey}:reset`,
        meta: { action: "reset_game", reason: command.reason },
      });
      await publishGlobal({ activeTables: 10 });
      return NextResponse.json({ ok: true, reset: true, phase: "LOBBY" });
    }
    case "broadcast": {
      setGameState({ narrative_banner: command.banner || null });
      await publishGlobal({ banner: command.banner || null });
      return NextResponse.json({ ok: true });
    }
    case "adjust": {
      if (gs.phase === "FROZEN" || gs.phase === "DEBRIEF") {
        throw new MutationError("Leaderboard is locked after final freeze", 409);
      }
      const tableNo = command.tableNo;
      if (!getTeam(tableNo)) {
        return NextResponse.json({ error: "Unknown table" }, { status: 404 });
      }
      const amount = command.amount;
      appendEvent({
        table_no: tableNo,
        actor_role: "FACILITATOR",
        kind: "FACILITATOR_ADJUST",
        delta_aed: amount,
        meta: { reason: command.reason },
      });
      await publishTable(tableNo);
      return NextResponse.json({
        ok: true,
        capital_aed: derivedCapital(tableNo),
      });
    }
    case "force_resolve_outage": {
      const tableNo = command.tableNo;
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
      const tableNo = command.tableNo;
      updateTeam(tableNo, { green_unlocked: true });
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "award_badge": {
      const tableNo = command.tableNo;
      const badge = command.badge;
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
      const tableNo = command.tableNo;
      releaseRole(tableNo, command.role as Role);
      await publishTable(tableNo);
      return NextResponse.json({ ok: true });
    }
    case "reset_device": {
      releaseDevice(command.deviceId);
      return NextResponse.json({ ok: true });
    }
    case "kill": {
      setGameState({ phase: "FROZEN", clock_paused_at: new Date().toISOString() });
      await publishGlobal({ phase: "FROZEN" });
      return NextResponse.json({ ok: true });
    }
    default:
      throw new MutationError("Unknown action", 400);
  }
  })();
  const responseBody = await response.clone().json() as Record<string, unknown>;
  completeMemoryOperation(operationKey, responseBody);
  return response;
    });
  } catch (error) {
    if (error instanceof AuthError || error instanceof MutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return friendlyError("[api/console]", error, "Console action failed");
  }
}
