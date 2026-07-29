import { outageOffsetSeconds } from "./engines/outage";
import {
  appendEvent,
  beginMemoryOperation,
  completeMemoryOperation,
  derivedCapital,
  findEventByIdempotency,
  getGameState,
  getTeam,
  listEvents,
  listTeams,
  updateTeam,
  withMemoryTransaction,
} from "./store";
import { scoreOutageResolved } from "./scoring";
import type { DeviceSession } from "./types";

export class MemoryOutageError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export async function armMemoryOutages(now = new Date()): Promise<number> {
  return withMemoryTransaction(() => armMemoryOutagesUnlocked(now));
}

/** Must only be called while the caller owns the memory transaction. */
export async function armMemoryOutagesUnlocked(now = new Date()): Promise<number> {
  if (getGameState().phase !== "C") return 0;
  const teams = listTeams()
    .map((value) => ({ ...value, capital: derivedCapital(value.table_no) }))
    .sort((a, b) => b.capital - a.capital || a.table_no - b.table_no);
  for (let index = 0; index < teams.length; index++) {
    const tableNo = teams[index].table_no;
    const key = `outage:arm:${tableNo}`;
    if (findEventByIdempotency(key)) continue;
    const schedule = outageOffsetSeconds(index + 1, teams.length);
    const scheduledAt = new Date(now.getTime() + schedule.offsetSec * 1000).toISOString();
    updateTeam(tableNo, { outage_scheduled_at: scheduledAt, outage_extra_hint: schedule.extraHint });
    appendEvent({
      table_no: tableNo,
      actor_role: "SYSTEM",
      kind: "OUTAGE_ARMED",
      delta_aed: 0,
      idempotency_key: key,
      meta: {
        scheduledAt,
        extraHint: schedule.extraHint,
      },
    });
  }
  return teams.length;
}

export async function solveMemoryOutage(
  session: DeviceSession,
  answer: string,
  answerCorrect: boolean,
  idempotencyKey: string,
) {
  return withMemoryTransaction(async () => {
    const { getDevice } = await import("./store");
    const durable = getDevice(session.deviceId);
    if (!durable || durable.table_no !== session.tableNo || durable.role !== session.role) {
      throw new MemoryOutageError("Session no longer owns this role", 401);
    }
    if (session.role !== "CIO" && session.role !== "ALL_ROLES") {
      throw new MemoryOutageError("Only CIO can submit the outage sequence", 403);
    }
    type SolveResult =
      | { ok: false; wrong: true; tries: number; extraHint: boolean; replay?: boolean }
      | { ok: true; green_unlocked: true; badge: string | null; modal: ReturnType<typeof scoreOutageResolved>["modal"]; replay?: boolean };
    const operation = beginMemoryOperation<SolveResult>(
      idempotencyKey,
      `outage:solve:${session.deviceId}:${session.tableNo}`,
      { answer },
    );
    if (operation.kind === "conflict") {
      throw new MemoryOutageError("Idempotency key was already used for a different request", 409);
    }
    if (operation.kind === "replay") return { ...operation.response, replay: true };

    const current = getTeam(session.tableNo);
    if (!current?.outage_active) throw new MemoryOutageError("No active outage", 409);
    if (!answerCorrect) {
      const response = {
        ok: false as const, wrong: true as const,
        tries: current.outage_wrong_tries + 1,
        extraHint: Boolean(current.outage_extra_hint),
      };
      updateTeam(session.tableNo, { outage_wrong_tries: response.tries });
      completeMemoryOperation(idempotencyKey, response);
      return response;
    }
    const scored = scoreOutageResolved();
    const first = !listTeams().some((candidate) => candidate.badges.includes("CRISIS_MANAGER"));
    appendEvent({
      table_no: session.tableNo, actor_role: session.role, kind: scored.kind, delta_aed: 0,
      idempotency_key: `outage:resolved:${session.tableNo}`, meta: { modal: scored.modal },
    });
    updateTeam(session.tableNo, {
      outage_active: false, green_unlocked: true,
      badges: first ? [...current.badges, "CRISIS_MANAGER"] : current.badges,
    });
    if (first) appendEvent({
      table_no: session.tableNo, actor_role: "SYSTEM", kind: "BADGE_AWARDED", delta_aed: 0,
      idempotency_key: "badge:crisis_manager:first", meta: { badge: "CRISIS_MANAGER" },
    });
    const response = {
      ok: true as const, green_unlocked: true as const,
      badge: first ? "CRISIS_MANAGER" : null, modal: scored.modal,
    };
    completeMemoryOperation(idempotencyKey, response);
    return response;
  });
}

/** Server-invoked durable tick. It has no dependency on SSE connections. */
export async function tickMemoryOutages(now = new Date()): Promise<number> {
  return withMemoryTransaction(async () => {
    if (getGameState().phase !== "C") return 0;
    let ticks = 0;
    for (const current of listTeams()) {
      const arm = listEvents(current.table_no).find((event) => event.kind === "OUTAGE_ARMED");
      const scheduledAt = arm?.meta?.scheduledAt ? new Date(String(arm.meta.scheduledAt)) : null;
      if (!scheduledAt || scheduledAt > now || current.green_unlocked) continue;
      if (!current.outage_active) updateTeam(current.table_no, {
        outage_active: true, outage_started_at: scheduledAt.toISOString(),
      });
      const dueBucket = Math.floor((now.getTime() - scheduledAt.getTime()) / 10_000);
      for (let bucket = 1; bucket <= dueBucket; bucket++) {
        const live = getTeam(current.table_no)!;
        if (Math.abs(live.outage_loss_aed) >= 150_000) break;
        const key = `outage:tick:${current.table_no}:${bucket}`;
        if (findEventByIdempotency(key)) continue;
        appendEvent({
          table_no: current.table_no,
          actor_role: "SYSTEM",
          kind: "OUTAGE_TICK",
          delta_aed: -1_000,
          idempotency_key: key,
          meta: { bucket },
        });
        updateTeam(current.table_no, { outage_loss_aed: live.outage_loss_aed - 1_000 });
        ticks++;
      }
    }
    return ticks;
  });
}
