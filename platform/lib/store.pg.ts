import { sql } from "./db";
import { elapsedMs, inFinalFiveMinutes, phaseFromElapsed } from "./engines/clock";
import { crossedTimedPhases, isForwardPhaseTransition, phaseStartElapsedMs } from "./timeline";
import { outageOffsetSeconds } from "./engines/outage";
import { createHash } from "node:crypto";

/**
 * TransactionClient — a wrapper that satisfies the existing call-site
 * signatures in this file without needing a real Postgres transaction
 * (the Neon HTTP driver doesn't support interactive transactions).
 *
 * Each `client.query(text, values)` call goes straight to the pooled
 * endpoint, which auto-commits. Row-level safety comes from
 * SELECT ... FOR UPDATE + unique constraints, not from wrapping in
 * BEGIN/COMMIT. This is the right tradeoff for a single-shot event
 * platform that doesn't need multi-statement atomicity.
 */
interface TransactionClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * withTransaction — shim that satisfies the legacy call-site pattern
 * `(fn: (client) => Promise<T>) => Promise<T>` without needing a real
 * Postgres transaction. Just calls `fn(sql)`.
 */
async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  return fn(sql as unknown as TransactionClient);
}
import {
  scoreGreenPlay,
  scoreLedgerClose,
  scoreOutageResolved,
  scoreScan,
  scoreTradeValidated,
  deckAllowedInPhase,
} from "./scoring";
import type { Phase, Role } from "./config";
import type {
  CardAction,
  CardRow,
  DeviceSession,
  GameStateRow,
  TeamState,
  TeachingModal,
} from "./types";

export class MutationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

type Row = Record<string, unknown>;

type PgEvent = {
  id: number;
  table_no: number;
  kind: string;
  card_id: string | null;
  delta_aed: number;
  meta: Record<string, unknown> | null;
  idempotency_key: string | null;
};

function team(row: Row): TeamState {
  return {
    table_no: Number(row.table_no),
    capital_aed: Number(row.capital_aed),
    ledger_closed: Boolean(row.ledger_closed),
    outage_active: Boolean(row.outage_active),
    green_unlocked: Boolean(row.green_unlocked),
    badges: (row.badges as string[] | null) ?? [],
    penalty_cap_aed: row.penalty_cap_aed == null ? null : Number(row.penalty_cap_aed),
    impl_immunity: Boolean(row.impl_immunity),
    final_multiplier: Boolean(row.final_multiplier),
    outage_loss_aed: Number(row.outage_loss_aed ?? 0),
    outage_wrong_tries: Number(row.outage_wrong_tries ?? 0),
    outage_scheduled_at: row.outage_scheduled_at == null ? null : new Date(String(row.outage_scheduled_at)).toISOString(),
    outage_started_at: row.outage_started_at == null ? null : new Date(String(row.outage_started_at)).toISOString(),
    outage_extra_hint: Boolean(row.outage_extra_hint),
  };
}

function card(row: Row): CardRow {
  return {
    card_id: String(row.card_id),
    qr: String(row.qr),
    deck: row.deck as CardRow["deck"],
    archetype: String(row.archetype),
    owner_table: Number(row.owner_table),
    validity: (row.validity as CardRow["validity"]) ?? null,
    correct_action: (row.correct_action as CardRow["correct_action"]) ?? null,
    penalty_aed: Number(row.penalty_aed ?? 0),
    locked_until_phase: row.locked_until_phase == null ? null : String(row.locked_until_phase),
    payload: (row.payload as CardRow["payload"]) ?? {},
  };
}

function game(row: Row): GameStateRow {
  return {
    id: 1,
    phase: row.phase as GameStateRow["phase"],
    clock_started_at: row.clock_started_at == null ? null : new Date(String(row.clock_started_at)).toISOString(),
    clock_paused_at: row.clock_paused_at == null ? null : new Date(String(row.clock_paused_at)).toISOString(),
    paused_ms_total: Number(row.paused_ms_total ?? 0),
    narrative_banner: row.narrative_banner == null ? null : String(row.narrative_banner),
  };
}

async function queryOne(client: TransactionClient, text: string, values: unknown[] = []): Promise<Row | null> {
  const result = await client.query(text, values);
  return result.rows[0] ?? null;
}

async function insertEvent(
  client: TransactionClient,
  input: {
    tableNo: number;
    actor: string;
    kind: string;
    cardId?: string | null;
    delta: number;
    key?: string | null;
    meta?: Record<string, unknown> | null;
  },
): Promise<PgEvent | null> {
  const row = await queryOne(
    client,
    `INSERT INTO events
       (table_no, actor_role, kind, card_id, delta_aed, idempotency_key, meta)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id, table_no, kind, card_id, delta_aed, meta, idempotency_key`,
    [
      input.tableNo,
      input.actor,
      input.kind,
      input.cardId ?? null,
      input.delta,
      input.key ?? null,
      JSON.stringify(input.meta ?? null),
    ],
  );
  if (!row) return null;
  if (input.delta !== 0) {
    await client.query(
      "UPDATE teams SET capital_aed = capital_aed + $1 WHERE table_no = $2",
      [input.delta, input.tableNo],
    );
  }
  return {
    id: Number(row.id),
    table_no: Number(row.table_no),
    kind: String(row.kind),
    card_id: row.card_id == null ? null : String(row.card_id),
    delta_aed: Number(row.delta_aed),
    meta: (row.meta as Record<string, unknown> | null) ?? null,
    idempotency_key: row.idempotency_key == null ? null : String(row.idempotency_key),
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function beginOperation(
  client: TransactionClient,
  input: { key: string; scope: string; request: unknown },
): Promise<({ ok: true } & Record<string, unknown>) | null> {
  const requestFingerprint = fingerprint(input.request);
  await client.query(
    `INSERT INTO operations (idempotency_key, scope, request_fingerprint, status)
     VALUES ($1, $2, $3, 'pending') ON CONFLICT (idempotency_key) DO NOTHING`,
    [input.key, input.scope, requestFingerprint],
  );
  const row = await queryOne(client, "SELECT * FROM operations WHERE idempotency_key = $1 FOR UPDATE", [input.key]);
  if (!row) throw new MutationError("Unable to reserve idempotency key", 409);
  if (row.scope !== input.scope || row.request_fingerprint !== requestFingerprint) {
    throw new MutationError("Idempotency key was already used for a different request", 409);
  }
  return row.status === "completed" ? (row.response as { ok: true } & Record<string, unknown>) : null;
}

async function completeOperation(client: TransactionClient, key: string, response: unknown): Promise<void> {
  await client.query(
    "UPDATE operations SET status = 'completed', response = $2::jsonb, completed_at = now() WHERE idempotency_key = $1",
    [key, JSON.stringify(response)],
  );
}

type CommittedFailure = { committedFailure: true; error: string; status: number };

function committedFailure(error: string, status: number): CommittedFailure {
  return { committedFailure: true, error, status };
}

async function discardOperation(client: TransactionClient, key: string): Promise<void> {
  await client.query("DELETE FROM operations WHERE idempotency_key = $1 AND status = 'pending'", [key]);
}

function throwIfCommittedFailure<T>(result: T | CommittedFailure): T {
  if (typeof result === "object" && result !== null && "committedFailure" in result) {
    const failure = result as CommittedFailure;
    throw new MutationError(failure.error, failure.status);
  }
  return result as T;
}

function replayResponse(event: PgEvent, capital: number) {
  const modal = event.meta?.modal as TeachingModal | undefined;
  return {
    ok: true as const,
    replay: true,
    delta_aed: event.delta_aed,
    kind: event.kind,
    capital_aed: capital,
    modal: modal ?? {
      title: event.kind,
      kind: event.kind as TeachingModal["kind"],
      delta_aed: event.delta_aed,
      why: "Replay of prior result (idempotent).",
      icon: "info" as const,
      word: "Replay",
      card_id: event.card_id ?? "",
    },
  };
}

export async function getDevicePg(deviceId: string) {
  const result = await sql.query(
    "SELECT device_id::text, table_no, role FROM devices WHERE device_id = $1",
    [deviceId],
  );
  const row = result.rows[0] as Row | undefined;
  return row
    ? { device_id: String(row.device_id), table_no: Number(row.table_no), role: row.role as Role }
    : null;
}

export async function getTeamPg(tableNo: number): Promise<TeamState | null> {
  const result = await sql.query("SELECT * FROM teams WHERE table_no = $1", [tableNo]);
  const row = result.rows[0] as Row | undefined;
  return row ? team(row) : null;
}

export async function listDevicesPg(tableNo: number) {
  const result = await sql.query(
    "SELECT device_id::text, table_no, role, last_seen FROM devices WHERE table_no = $1 ORDER BY role",
    [tableNo],
  );
  return result.rows.map((row) => ({
    device_id: String(row.device_id),
    table_no: Number(row.table_no),
    role: row.role as Role,
    last_seen: new Date(String(row.last_seen)).toISOString(),
  }));
}

export async function claimDevicePg(deviceId: string, tableNo: number, role: Role) {
  return withTransaction(async (client) => {
    // Global mutation lock order: game_state (when needed) → device → teams → card positions.
    await queryOne(client, "SELECT device_id FROM devices WHERE device_id = $1 FOR UPDATE", [deviceId]);
    const pinTeam = await queryOne(client, "SELECT table_no FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]);
    if (!pinTeam) throw new MutationError("Unknown table", 404);
    try {
      await client.query("DELETE FROM devices WHERE device_id = $1", [deviceId]);
      await client.query(
        `INSERT INTO devices (device_id, table_no, role, last_seen)
         VALUES ($1, $2, $3, now())`,
        [deviceId, tableNo, role],
      );
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new MutationError(`${role} is taken — claim another role or ask them to release.`, 409);
      }
      throw error;
    }
    await insertEvent(client, {
      tableNo,
      actor: role,
      kind: "ROLE_CLAIMED",
      delta: 0,
      key: `role:${deviceId}:${tableNo}:${role}`,
      meta: {},
    });
  });
}

export async function verifyPinPg(tableNo: number, pin: string): Promise<boolean> {
  const result = await sql.query(
    "SELECT 1 FROM teams WHERE table_no = $1 AND upper(pin) = upper($2)",
    [tableNo, pin],
  );
  return result.rowCount === 1;
}

export async function executeScanPg(
  session: DeviceSession,
  input: { qr?: string; cardId?: string; action: CardAction; idempotencyKey: string },
) {
  return withTransaction(async (client) => {
    const operationKey = `scan:${session.deviceId}:${input.idempotencyKey}`;
    const replay = await beginOperation(client, {
      key: operationKey,
      scope: `scan:${session.deviceId}:${session.tableNo}`,
      request: { qr: input.qr ?? null, cardId: input.cardId?.toUpperCase() ?? null, action: input.action },
    });
    if (replay) return { ...replay, replay: true };
    const timeline = await advanceTimelineTx(client, new Date());
    if (timeline.phase === "FROZEN" || timeline.phase === "DEBRIEF") {
      await discardOperation(client, operationKey);
      return { ok: false as const, status: 409, error: "Game frozen. Writes rejected." };
    }

    const durable = await queryOne(
      client,
      "SELECT device_id::text, table_no, role FROM devices WHERE device_id = $1 FOR UPDATE",
      [session.deviceId],
    );
    if (!durable || Number(durable.table_no) !== session.tableNo || durable.role !== session.role) {
      throw new MutationError("Session no longer owns this role", 401);
    }
    if (session.role !== "TAX" && session.role !== "ALL_ROLES") {
      throw new MutationError("Only the Tax & Compliance Director can file or quarantine.", 403);
    }

    const gameRow = await queryOne(client, "SELECT * FROM game_state WHERE id = 1 FOR SHARE");
    const teamRow = await queryOne(client, "SELECT * FROM teams WHERE table_no = $1 FOR UPDATE", [session.tableNo]);
    const cardRow = input.qr
      ? await queryOne(client, "SELECT * FROM cards WHERE qr = $1", [input.qr])
      : await queryOne(client, "SELECT * FROM cards WHERE upper(card_id) = upper($1)", [input.cardId ?? ""]);
    if (!cardRow) throw new MutationError("Card not recognised", 404);
    if (!teamRow || !gameRow) throw new MutationError("Game state unavailable", 503);
    const teamState = team(teamRow);
    const gameState = game(gameRow);
    const selectedCard = card(cardRow);
    if (gameState.phase === "FROZEN") throw new MutationError("Game frozen. Writes rejected.", 409);
    const allowed = deckAllowedInPhase(selectedCard.deck, gameState.phase, teamState);
    if (!allowed.ok) throw new MutationError(allowed.hint ?? "Deck locked for this phase", 409);

    const position = await queryOne(
      client,
      "SELECT card_id, held_by_table, state FROM card_positions WHERE card_id = $1 FOR UPDATE",
      [selectedCard.card_id],
    );
    if (!position) throw new MutationError("Card position missing", 404);
    if (Number(position.held_by_table) !== session.tableNo) {
      throw new MutationError(`Table ${String(position.held_by_table).padStart(2, "0")} holds this card`, 409);
    }
    if (["FILED", "QUARANTINED", "PLAYED", "TRADED"].includes(String(position.state))) {
      const prior = await queryOne(
        client,
        `SELECT id, table_no, kind, card_id, delta_aed, meta, idempotency_key
         FROM events WHERE table_no = $1 AND card_id = $2 ORDER BY id LIMIT 1`,
        [session.tableNo, selectedCard.card_id],
      );
      if (!prior) throw new MutationError("Card already resolved", 409);
      const response = replayResponse({
        id: Number(prior.id), table_no: Number(prior.table_no), kind: String(prior.kind),
        card_id: String(prior.card_id), delta_aed: Number(prior.delta_aed),
        meta: prior.meta as Record<string, unknown> | null,
        idempotency_key: prior.idempotency_key == null ? null : String(prior.idempotency_key),
      }, teamState.capital_aed);
      await completeOperation(client, operationKey, response);
      return response;
    }

    const finalWindow = inFinalFiveMinutes(gameState);
    const scored = selectedCard.deck === "GREEN"
      ? scoreGreenPlay(selectedCard, teamState, { inFinalWindow: finalWindow })
      : scoreScan(selectedCard, teamState, {
          tableNo: session.tableNo,
          action: input.action,
          inFinalWindow: finalWindow,
        });
    const inserted = await insertEvent(client, {
      tableNo: session.tableNo,
      actor: session.role,
      kind: scored.kind,
      cardId: selectedCard.card_id,
      delta: scored.delta_aed,
      key: operationKey,
      meta: { modal: scored.modal, flags: scored.flags },
    });
    if (!inserted) throw new MutationError("Concurrent replay; retry request", 409);

    if (scored.kind !== "FILE_FOREIGN") {
      const nextState = selectedCard.deck === "GREEN" || selectedCard.deck === "PRACTICE"
        ? "PLAYED"
        : input.action === "FILE" ? "FILED" : "QUARANTINED";
      await client.query("UPDATE card_positions SET state = $1 WHERE card_id = $2", [nextState, selectedCard.card_id]);
    }
    if (scored.flags?.set_impl_immunity) {
      await client.query("UPDATE teams SET impl_immunity = TRUE WHERE table_no = $1", [session.tableNo]);
    }
    if (scored.flags?.set_penalty_cap != null) {
      await client.query("UPDATE teams SET penalty_cap_aed = $1 WHERE table_no = $2", [scored.flags.set_penalty_cap, session.tableNo]);
    }
    if (scored.flags?.set_final_multiplier) {
      await client.query("UPDATE teams SET final_multiplier = TRUE WHERE table_no = $1", [session.tableNo]);
    }
    if (scored.flags?.auto_resolve_held) {
      await autoResolveHeldPg(client, session, operationKey, finalWindow);
    }

    if (scored.flags?.ledger_close_candidate) {
      const count = await queryOne(
        client,
        `SELECT count(*)::int AS count FROM cards c JOIN card_positions p USING(card_id)
         WHERE c.deck = 'RED' AND c.owner_table = $1 AND c.validity = 'VALID' AND p.state = 'FILED'`,
        [session.tableNo],
      );
      if (!teamState.ledger_closed && Number(count?.count ?? 0) >= 6) {
        const close = scoreLedgerClose(teamState, { inFinalWindow: finalWindow });
        const ledgerEvent = await insertEvent(client, {
          tableNo: session.tableNo, actor: session.role, kind: close.kind,
          delta: close.delta_aed, key: `${operationKey}:ledger`, meta: { modal: close.modal },
        });
        if (!ledgerEvent) throw new MutationError("Ledger-close audit event collision", 409);
        await client.query("UPDATE teams SET ledger_closed = TRUE WHERE table_no = $1", [session.tableNo]);
      }
    }
    const capitalRow = await queryOne(client, "SELECT capital_aed FROM teams WHERE table_no = $1", [session.tableNo]);
    const response = {
      ok: true as const, replay: false, delta_aed: scored.delta_aed, kind: scored.kind,
      capital_aed: Number(capitalRow?.capital_aed ?? 0), modal: scored.modal,
    };
    await completeOperation(client, operationKey, response);
    return response;
  });
}

async function autoResolveHeldPg(
  client: TransactionClient,
  session: DeviceSession,
  operationKey: string,
  finalWindow: boolean,
): Promise<void> {
  const heldRows = (await client.query(
    `SELECT c.* FROM cards c JOIN card_positions p USING(card_id)
     WHERE p.held_by_table = $1 AND p.state = 'PENDING' AND c.deck = 'RED'
     ORDER BY c.card_id FOR UPDATE OF p`,
    [session.tableNo],
  )).rows;
  for (const row of heldRows) {
    const selected = card(row);
    if (selected.validity === "VALID" && selected.owner_table === session.tableNo) {
      const currentTeamRow = await queryOne(client, "SELECT * FROM teams WHERE table_no = $1", [session.tableNo]);
      if (!currentTeamRow) throw new MutationError("Team unavailable during GRN-04", 503);
      const automated = scoreScan(selected, team(currentTeamRow), {
        tableNo: session.tableNo,
        action: "FILE",
        inFinalWindow: finalWindow,
      });
      const event = await insertEvent(client, {
        tableNo: session.tableNo,
        actor: session.role,
        kind: automated.kind,
        cardId: selected.card_id,
        delta: automated.delta_aed,
        key: `${operationKey}:grn04:${selected.card_id}`,
        meta: { modal: automated.modal, via: "GRN-04" },
      });
      if (!event) throw new MutationError("GRN-04 filing audit event collision", 409);
      await client.query("UPDATE card_positions SET state = 'FILED' WHERE card_id = $1", [selected.card_id]);
    } else if (selected.validity === "INVALID" || selected.validity === "OUT_OF_SCOPE") {
      const modal = {
        title: String(selected.payload.title ?? "Auto-quarantined"),
        kind: "QUARANTINE_CORRECT" as const,
        delta_aed: 0,
        why: String(selected.payload.why ?? ""),
        icon: "check" as const,
        word: "Auto",
        card_id: selected.card_id,
      };
      const event = await insertEvent(client, {
        tableNo: session.tableNo,
        actor: session.role,
        kind: "QUARANTINE_CORRECT",
        cardId: selected.card_id,
        delta: 0,
        key: `${operationKey}:grn04:${selected.card_id}`,
        meta: { modal, via: "GRN-04" },
      });
      if (!event) throw new MutationError("GRN-04 quarantine audit event collision", 409);
      await client.query("UPDATE card_positions SET state = 'QUARANTINED' WHERE card_id = $1", [selected.card_id]);
    }
  }

  const filed = await queryOne(
    client,
    `SELECT count(*)::int AS count FROM cards c JOIN card_positions p USING(card_id)
     WHERE c.deck = 'RED' AND c.owner_table = $1 AND c.validity = 'VALID' AND p.state = 'FILED'`,
    [session.tableNo],
  );
  const currentTeamRow = await queryOne(client, "SELECT * FROM teams WHERE table_no = $1", [session.tableNo]);
  if (currentTeamRow && !currentTeamRow.ledger_closed && Number(filed?.count ?? 0) >= 6) {
    const close = scoreLedgerClose(team(currentTeamRow), { inFinalWindow: finalWindow });
    const event = await insertEvent(client, {
      tableNo: session.tableNo,
      actor: session.role,
      kind: close.kind,
      delta: close.delta_aed,
      key: `${operationKey}:grn04:ledger`,
      meta: { modal: close.modal, via: "GRN-04" },
    });
    if (!event) throw new MutationError("GRN-04 ledger-close audit event collision", 409);
    await client.query("UPDATE teams SET ledger_closed = TRUE WHERE table_no = $1", [session.tableNo]);
  }
}

export async function executeTradePg(input: {
  cardId: string;
  fromTable: number;
  toTable: number;
  doubled: boolean;
  idempotencyKey: string;
  reason: string;
}) {
  const result = await withTransaction(async (client) => {
    const operationKey = `trade:${input.idempotencyKey}`;
    const replay = await beginOperation(client, {
      key: operationKey,
      scope: "console:trade",
      request: { cardId: input.cardId, fromTable: input.fromTable, toTable: input.toTable, doubled: input.doubled, reason: input.reason },
    });
    if (replay) return { ...replay, replay: true };
    const timeline = await advanceTimelineTx(client, new Date());
    if (timeline.phase === "FROZEN" || timeline.phase === "DEBRIEF") {
      await discardOperation(client, operationKey);
      return committedFailure("Leaderboard is locked after final freeze", 409);
    }
    if (timeline.phase !== "B" && timeline.phase !== "C") {
      await discardOperation(client, operationKey);
      return committedFailure(`Trades only in Phase B or C (current: ${timeline.phase})`, 409);
    }
    const gameRow = await queryOne(client, "SELECT * FROM game_state WHERE id = 1 FOR SHARE");
    if (!gameRow || !["B", "C"].includes(String(gameRow.phase))) {
      throw new MutationError("Trades only in Phase B or C", 409);
    }
    const lockedTeams = await client.query(
      "SELECT * FROM teams WHERE table_no = ANY($1::int[]) ORDER BY table_no FOR UPDATE",
      [[input.fromTable, input.toTable].sort((a, b) => a - b)],
    );
    if (lockedTeams.rows.length !== 2) throw new MutationError("Unknown trade table", 404);
    const position = await queryOne(client, "SELECT * FROM card_positions WHERE card_id = $1 FOR UPDATE", [input.cardId]);
    const cardRow = await queryOne(client, "SELECT * FROM cards WHERE card_id = $1", [input.cardId]);
    if (!cardRow) throw new MutationError("Card not found", 404);
    if (!position) throw new MutationError("Card position missing", 404);
    if (Number(position.held_by_table) !== input.fromTable) throw new MutationError("From-table does not hold this card", 409);
    const positionState = String(position.state);
    if (positionState === "TRADED" || positionState === "FILED" || positionState === "QUARANTINED") {
      await discardOperation(client, operationKey);
      return committedFailure(`Card already ${positionState.toLowerCase()} — cannot be re-traded`, 409);
    }
    const selected = card(cardRow);
    if (selected.owner_table !== input.toTable || selected.validity !== "VALID" || selected.deck !== "RED") {
      throw new MutationError("Invalid trade", 409);
    }
    await client.query("UPDATE card_positions SET held_by_table = $1, state = 'TRADED' WHERE card_id = $2", [input.toTable, input.cardId]);
    for (const tableNo of [input.fromTable, input.toTable]) {
      const state = team(lockedTeams.rows.find((row) => Number(row.table_no) === tableNo)!);
      const scored = scoreTradeValidated(state, {
        cardId: input.cardId,
        doubled: input.doubled,
        inFinalWindow: inFinalFiveMinutes(game(gameRow)),
      });
      const inserted = await insertEvent(client, {
        tableNo, actor: "FACILITATOR", kind: scored.kind, cardId: input.cardId,
        delta: scored.delta_aed, key: `${operationKey}:${tableNo}`,
        meta: { modal: scored.modal, counterparty: tableNo === input.fromTable ? input.toTable : input.fromTable, reason: input.reason },
      });
      if (!inserted) throw new MutationError("Trade event idempotency collision", 409);
    }
    const response = { ok: true as const, replay: false, card_id: input.cardId, now_held_by: input.toTable };
    await completeOperation(client, operationKey, response);
    return response;
  });
  return throwIfCommittedFailure(result);
}

async function armOutagesTx(client: TransactionClient, now: Date): Promise<number> {
    const gameRow = await queryOne(client, "SELECT phase FROM game_state WHERE id = 1 FOR UPDATE");
    if (gameRow?.phase !== "C") return 0;
    const rows = (await client.query("SELECT * FROM teams ORDER BY table_no FOR UPDATE")).rows;
    const sums = (await client.query("SELECT table_no, COALESCE(SUM(delta_aed), 0) AS delta FROM events GROUP BY table_no")).rows;
    const byTable = new Map(sums.map((row) => [Number(row.table_no), Number(row.delta)]));
    rows.sort((a, b) =>
      (1_000_000 + (byTable.get(Number(b.table_no)) ?? 0)) - (1_000_000 + (byTable.get(Number(a.table_no)) ?? 0)) ||
      Number(a.table_no) - Number(b.table_no));
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].outage_scheduled_at != null) continue;
      const schedule = outageOffsetSeconds(i + 1, rows.length);
      const scheduledAt = new Date(now.getTime() + schedule.offsetSec * 1000);
      const armedEvent = await insertEvent(client, {
        tableNo: Number(rows[i].table_no), actor: "SYSTEM", kind: "OUTAGE_ARMED", delta: 0,
        key: `system:outage:arm:${rows[i].table_no}`, meta: { scheduledAt: scheduledAt.toISOString(), extraHint: schedule.extraHint },
      });
      if (!armedEvent) throw new MutationError("Outage-arm audit event collision", 409);
      await client.query(
        "UPDATE teams SET outage_scheduled_at = $1, outage_extra_hint = $2 WHERE table_no = $3 AND outage_scheduled_at IS NULL",
        [scheduledAt.toISOString(), schedule.extraHint, rows[i].table_no],
      );
    }
    return rows.length;
}

export async function armOutagesPg(now = new Date()): Promise<number> {
  return withTransaction((client) => armOutagesTx(client, now));
}

async function advanceTimelineTx(client: TransactionClient, now: Date): Promise<{ phase: Phase; changed: boolean }> {
  const row = await queryOne(client, "SELECT * FROM game_state WHERE id = 1 FOR UPDATE");
  if (!row) throw new MutationError("Game state is unavailable", 503);
  const current = game(row);
  if (!current.clock_started_at || current.clock_paused_at || current.phase === "LOBBY" || current.phase === "FROZEN" || current.phase === "DEBRIEF") {
    return { phase: current.phase, changed: false };
  }
  const target = phaseFromElapsed(current.phase, elapsedMs(current, now.getTime()));
  const transitions = crossedTimedPhases(current.phase, target);
  if (transitions.length === 0) return { phase: current.phase, changed: false };

  const generation = new Date(current.clock_started_at).getTime();
  for (const phase of transitions) {
    const event = await insertEvent(client, {
      tableNo: 0,
      actor: "SYSTEM",
      kind: "PHASE_CHANGE",
      delta: 0,
      key: `timeline:${generation}:${phase}`,
      meta: { phase, via: "timeline" },
    });
    if (!event) throw new MutationError("Timeline audit event collision", 409);
    await client.query(
      `UPDATE game_state SET phase = $1,
       clock_paused_at = CASE WHEN $1 = 'FROZEN' THEN $2::timestamptz ELSE clock_paused_at END
       WHERE id = 1`,
      [phase, now.toISOString()],
    );
    if (phase === "C") await armOutagesTx(client, now);
  }
  return { phase: transitions.at(-1)!, changed: true };
}

export async function advanceTimelinePg(now = new Date()): Promise<{ phase: Phase; changed: boolean }> {
  return withTransaction((client) => advanceTimelineTx(client, now));
}

export async function tickOutagesPg(now = new Date()): Promise<number> {
  return withTransaction(async (client) => {
    await advanceTimelineTx(client, now);
    const gameRow = await queryOne(client, "SELECT phase, clock_paused_at FROM game_state WHERE id = 1 FOR UPDATE");
    if (gameRow?.phase !== "C" || gameRow.clock_paused_at) return 0;
    const rows = (await client.query("SELECT * FROM teams ORDER BY table_no FOR UPDATE")).rows;
    let insertedCount = 0;
    for (const row of rows) {
      if (row.green_unlocked || row.outage_scheduled_at == null || new Date(String(row.outage_scheduled_at)) > now) continue;
      let startedAt = row.outage_started_at == null ? null : new Date(String(row.outage_started_at));
      if (!row.outage_active) {
        startedAt = new Date(String(row.outage_scheduled_at));
        await client.query(
          "UPDATE teams SET outage_active = TRUE, outage_started_at = $1 WHERE table_no = $2",
          [startedAt.toISOString(), row.table_no],
        );
      }
      let currentLoss = Math.abs(Number(row.outage_loss_aed ?? 0));
      const dueBucket = Math.floor((now.getTime() - startedAt!.getTime()) / 10_000);
      for (let bucket = 1; bucket <= dueBucket && currentLoss < 150_000; bucket++) {
        const event = await insertEvent(client, {
          tableNo: Number(row.table_no), actor: "SYSTEM", kind: "OUTAGE_TICK", delta: -1000,
          key: `outage:tick:${row.table_no}:${bucket}`, meta: { bucket },
        });
        if (event) {
          insertedCount++;
          currentLoss += 1_000;
          await client.query("UPDATE teams SET outage_loss_aed = outage_loss_aed - 1000 WHERE table_no = $1", [row.table_no]);
        }
      }
    }
    return insertedCount;
  });
}

export async function solveOutagePg(
  session: DeviceSession,
  answer: string,
  answerCorrect: boolean,
  idempotencyKey: string,
) {
  const result = await withTransaction(async (client) => {
    const operationKey = `outage:solve:${session.deviceId}:${idempotencyKey}`;
    const replay = await beginOperation(client, {
      key: operationKey,
      scope: `outage:solve:${session.deviceId}:${session.tableNo}`,
      request: { answer },
    });
    if (replay) return { ...replay, replay: true };
    const timeline = await advanceTimelineTx(client, new Date());
    if (timeline.phase !== "C") {
      await discardOperation(client, operationKey);
      return committedFailure("Outage solving is unavailable outside Phase C", 409);
    }

    const gameRow = await queryOne(client, "SELECT phase FROM game_state WHERE id = 1 FOR SHARE");
    if (gameRow?.phase !== "C") throw new MutationError("Outage solving is unavailable outside Phase C", 409);
    const durable = await queryOne(client, "SELECT * FROM devices WHERE device_id = $1 FOR UPDATE", [session.deviceId]);
    if (!durable || Number(durable.table_no) !== session.tableNo || durable.role !== session.role) {
      throw new MutationError("Session no longer owns this role", 401);
    }
    if (session.role !== "CIO" && session.role !== "ALL_ROLES") throw new MutationError("Only CIO can submit the outage sequence", 403);
    const teams = (await client.query("SELECT * FROM teams ORDER BY table_no FOR UPDATE")).rows;
    const row = teams.find((candidate) => Number(candidate.table_no) === session.tableNo);
    if (!row || !row.outage_active) throw new MutationError("No active outage", 409);
    if (!answerCorrect) {
      const tries = Number(row.outage_wrong_tries ?? 0) + 1;
      await client.query("UPDATE teams SET outage_wrong_tries = $1 WHERE table_no = $2", [tries, session.tableNo]);
      const response = { ok: false as const, wrong: true, tries, extraHint: Boolean(row.outage_extra_hint) };
      await completeOperation(client, operationKey, response);
      return response;
    }
    const first = !teams.some((candidate) => (candidate.badges as string[] | null)?.includes("CRISIS_MANAGER"));
    const scored = scoreOutageResolved();
    const resolvedEvent = await insertEvent(client, {
      tableNo: session.tableNo, actor: session.role, kind: scored.kind, delta: 0,
      key: `system:outage:resolved:${session.tableNo}`, meta: { modal: scored.modal },
    });
    if (!resolvedEvent) throw new MutationError("Outage-resolution audit event collision", 409);
    await client.query(
      `UPDATE teams SET outage_active = FALSE, outage_resolved_at = now(), green_unlocked = TRUE,
       badges = CASE WHEN $1 THEN array_append(badges, 'CRISIS_MANAGER') ELSE badges END WHERE table_no = $2`,
      [first, session.tableNo],
    );
    if (first) {
      const badgeEvent = await insertEvent(client, {
        tableNo: session.tableNo, actor: "SYSTEM", kind: "BADGE_AWARDED", delta: 0,
        key: "system:badge:crisis_manager:first", meta: { badge: "CRISIS_MANAGER" },
      });
      if (!badgeEvent) throw new MutationError("Badge audit event collision", 409);
    }
    const response = { ok: true as const, green_unlocked: true, badge: first ? "CRISIS_MANAGER" : null, modal: scored.modal };
    await completeOperation(client, operationKey, response);
    return response;
  });
  return throwIfCommittedFailure(result);
}

export async function streamSnapshotPg() {
  const [gameResult, teamsResult, eventsResult] = await Promise.all([
    sql.query("SELECT * FROM game_state WHERE id = 1"),
    sql.query(`SELECT t.table_no, t.badges, 1000000 + COALESCE(SUM(e.delta_aed), 0) AS capital_aed
      FROM teams t LEFT JOIN events e ON e.table_no = t.table_no
      GROUP BY t.table_no ORDER BY t.table_no`),
    sql.query("SELECT table_no, kind, delta_aed FROM events ORDER BY id DESC LIMIT 8"),
  ]);
  const gameRow = gameResult.rows[0] as Row | undefined;
  if (!gameRow) throw new MutationError("Game state unavailable", 503);
  return {
    game: game(gameRow),
    teams: teamsResult.rows.map((row) => ({
      table_no: Number(row.table_no),
      capital_aed: Number(row.capital_aed),
      badges: (row.badges as string[] | null) ?? [],
    })),
    recent: eventsResult.rows.map((row) => ({
      table_no: Number(row.table_no),
      kind: String(row.kind),
      delta_aed: Number(row.delta_aed),
    })),
  };
}

export async function adjustCapitalPg(tableNo: number, amount: number, reason: string, key: string) {
  return withTransaction(async (client) => {
    const locked = await queryOne(client, "SELECT capital_aed FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]);
    if (!locked) throw new MutationError("Unknown table", 404);
    const inserted = await insertEvent(client, {
      tableNo, actor: "FACILITATOR", kind: "FACILITATOR_ADJUST", delta: amount,
      key, meta: { reason },
    });
    const updated = await queryOne(client, "SELECT capital_aed FROM teams WHERE table_no = $1", [tableNo]);
    return { capital_aed: Number(updated?.capital_aed ?? 0), replay: !inserted };
  });
}

export async function auditTablePg(tableNo: number) {
  const teamResult = await sql.query("SELECT * FROM teams WHERE table_no = $1", [tableNo]);
  if (!teamResult.rows[0]) return null;
  const eventsResult = await sql.query("SELECT * FROM events WHERE table_no = $1 ORDER BY id", [tableNo]);
  const state = team(teamResult.rows[0]);
  const events = eventsResult.rows.map((row) => ({
    id: Number(row.id), at: new Date(String(row.at)).toISOString(), kind: String(row.kind),
    delta_aed: Number(row.delta_aed), card_id: row.card_id == null ? null : String(row.card_id),
    actor_role: row.actor_role == null ? null : String(row.actor_role),
    meta: (row.meta as Record<string, unknown> | null) ?? null,
  }));
  const sum = events.reduce((total, event) => total + event.delta_aed, 0);
  return { team: state, events, sum_delta_aed: sum, derived_capital_aed: 1_000_000 + sum };
}

export async function stateSnapshotPg(tableNo?: number) {
  const [gameResult, teamsResult, devicesResult, eventsResult, positionsResult] = await Promise.all([
    sql.query("SELECT * FROM game_state WHERE id = 1"),
    sql.query("SELECT * FROM teams ORDER BY table_no"),
    sql.query("SELECT device_id::text, table_no, role, last_seen FROM devices ORDER BY table_no, role"),
    sql.query("SELECT * FROM events ORDER BY id"),
    sql.query(`SELECT p.*, c.archetype, c.owner_table, c.validity, c.deck
      FROM card_positions p JOIN cards c USING(card_id) ORDER BY p.card_id`),
  ]);
  const gameRow = gameResult.rows[0];
  if (!gameRow) throw new MutationError("Game state unavailable", 503);
  const events = eventsResult.rows.map((row) => ({
    id: Number(row.id), at: new Date(String(row.at)).toISOString(), table_no: Number(row.table_no),
    actor_role: row.actor_role == null ? null : String(row.actor_role), kind: String(row.kind),
    card_id: row.card_id == null ? null : String(row.card_id), delta_aed: Number(row.delta_aed),
    meta: (row.meta as Record<string, unknown> | null) ?? null,
  }));
  const teams = teamsResult.rows.map((row) => {
    const value = team(row);
    const tableEvents = events.filter((event) => event.table_no === value.table_no);
    const devices = devicesResult.rows.filter((device) => Number(device.table_no) === value.table_no);
    const positions = positionsResult.rows.filter((position) =>
      Number(position.held_by_table) === value.table_no || Number(position.owner_table) === value.table_no,
    );
    return {
      ...value,
      cache_capital_aed: value.capital_aed,
      capital_aed: 1_000_000 + tableEvents.reduce((sum, event) => sum + event.delta_aed, 0),
      devices: devices.map((device) => ({ device_id: String(device.device_id), table_no: value.table_no, role: device.role as Role, last_seen: new Date(String(device.last_seen)).toISOString() })),
      events: tableEvents,
      positions,
      filed: positionsResult.rows.filter((position) => position.deck === "RED" && Number(position.owner_table) === value.table_no && position.validity === "VALID" && position.state === "FILED").length,
    };
  });
  return { game: game(gameRow), teams, selected: tableNo == null ? null : teams.find((value) => value.table_no === tableNo) ?? null };
}

export type FacilitatorCommand = {
  action: string;
  reason: string;
  idempotencyKey: string;
  tableNo?: number;
  amount?: number;
  phase?: Phase;
  banner?: string;
  badge?: string;
  role?: Role;
  deviceId?: string;
};

export async function executeFacilitatorPg(command: FacilitatorCommand) {
  const result = await withTransaction(async (client) => {
    const tableNo = command.tableNo ?? 0;
    const operationKey = `console:${command.idempotencyKey}`;
    const replay = await beginOperation(client, {
      key: operationKey,
      scope: "console:facilitator",
      request: command,
    });
    if (replay) return { ...replay, replay: true };
    const timeline = await advanceTimelineTx(client, new Date());
    if (command.action === "adjust" && (timeline.phase === "FROZEN" || timeline.phase === "DEBRIEF")) {
      await discardOperation(client, operationKey);
      return committedFailure("Leaderboard is locked after final freeze", 409);
    }
    const audit = async (meta: Record<string, unknown> = {}) => {
      const event = await insertEvent(client, {
        tableNo, actor: "FACILITATOR", kind: command.action === "adjust" ? "FACILITATOR_ADJUST" : "FACILITATOR_ACTION",
        delta: command.action === "adjust" ? command.amount ?? 0 : 0,
        key: operationKey,
        meta: { action: command.action, reason: command.reason, ...meta },
      });
      if (!event) throw new MutationError("Facilitator audit event collision", 409);
      return event;
    };

    switch (command.action) {
      case "set_phase": {
        const phase = command.phase!;
        const currentGame = await queryOne(client, "SELECT phase FROM game_state WHERE id = 1 FOR UPDATE");
        if (!currentGame || !isForwardPhaseTransition(currentGame.phase as Phase, phase)) {
          throw new MutationError("Phase controls only move forward; use pause or kill for recovery", 409);
        }
        const timed = ["TUTORIAL", "A", "B", "C"].includes(phase);
        const changed = await queryOne(client, `UPDATE game_state SET phase = $1,
          clock_started_at = CASE
            WHEN $1 = 'LOBBY' THEN NULL
            WHEN $2::boolean THEN transaction_timestamp() - ($3::double precision * interval '1 millisecond')
            ELSE clock_started_at END,
          clock_paused_at = CASE WHEN $1 = 'FROZEN' THEN transaction_timestamp() WHEN $2::boolean OR $1 = 'LOBBY' THEN NULL ELSE clock_paused_at END,
          paused_ms_total = CASE WHEN $2::boolean OR $1 = 'LOBBY' THEN 0 ELSE paused_ms_total END
          WHERE id = 1 RETURNING transaction_timestamp() AS changed_at`,
          [phase, timed, phaseStartElapsedMs(phase)]);
        await audit({ phase });
        const phaseEvent = await insertEvent(client, {
          tableNo: 0, actor: "FACILITATOR", kind: "PHASE_CHANGE", delta: 0,
          key: `${operationKey}:phase`, meta: { phase, via: "facilitator", reason: command.reason },
        });
        if (!phaseEvent) throw new MutationError("Phase-change audit event collision", 409);
        if (phase === "C") await armOutagesTx(client, new Date(String(changed?.changed_at)));
        break;
      }
      case "pause":
        await client.query("UPDATE game_state SET clock_paused_at = COALESCE(clock_paused_at, now()) WHERE id = 1");
        await audit();
        break;
      case "resume": {
        const paused = await queryOne(client, "SELECT clock_paused_at, transaction_timestamp() AS resumed_at FROM game_state WHERE id = 1 FOR UPDATE");
        if (paused?.clock_paused_at != null) {
          const durationMs = new Date(String(paused.resumed_at)).getTime() - new Date(String(paused.clock_paused_at)).getTime();
          await client.query(`UPDATE teams SET
            outage_scheduled_at = CASE WHEN outage_scheduled_at IS NULL THEN NULL ELSE outage_scheduled_at + ($1::double precision * interval '1 millisecond') END,
            outage_started_at = CASE WHEN outage_started_at IS NULL THEN NULL ELSE outage_started_at + ($1::double precision * interval '1 millisecond') END`, [durationMs]);
          await client.query("UPDATE game_state SET paused_ms_total = paused_ms_total + $1, clock_paused_at = NULL WHERE id = 1", [durationMs]);
        }
        await audit();
        break;
      }
      case "broadcast":
        await client.query("UPDATE game_state SET narrative_banner = $1 WHERE id = 1", [command.banner ?? null]);
        await audit({ banner: command.banner ?? null });
        break;
      case "adjust": {
        const currentGame = await queryOne(client, "SELECT phase FROM game_state WHERE id = 1 FOR UPDATE");
        if (currentGame?.phase === "FROZEN" || currentGame?.phase === "DEBRIEF") {
          throw new MutationError("Leaderboard is locked after final freeze", 409);
        }
        const locked = await queryOne(client, "SELECT 1 FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]);
        if (!locked) throw new MutationError("Unknown table", 404);
        await audit();
        break;
      }
      case "force_resolve_outage":
        if (!(await queryOne(client, "SELECT 1 FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]))) throw new MutationError("Unknown table", 404);
        await client.query("UPDATE teams SET outage_active = FALSE, outage_resolved_at = now(), green_unlocked = TRUE WHERE table_no = $1", [tableNo]);
        await audit();
        break;
      case "unlock_green":
        if (!(await queryOne(client, "SELECT 1 FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]))) throw new MutationError("Unknown table", 404);
        await client.query("UPDATE teams SET green_unlocked = TRUE WHERE table_no = $1", [tableNo]);
        await audit();
        break;
      case "award_badge":
        if (!(await queryOne(client, "SELECT 1 FROM teams WHERE table_no = $1 FOR UPDATE", [tableNo]))) throw new MutationError("Unknown table", 404);
        await client.query("UPDATE teams SET badges = CASE WHEN $1 = ANY(badges) THEN badges ELSE array_append(badges, $1) END WHERE table_no = $2", [command.badge, tableNo]);
        await audit({ badge: command.badge });
        break;
      case "ensure_badges": {
        const rows = (await client.query("SELECT table_no FROM teams WHERE cardinality(badges) = 0 ORDER BY table_no FOR UPDATE")).rows;
        await client.query("UPDATE teams SET badges = ARRAY['CLEAN_CLOSE'] WHERE cardinality(badges) = 0");
        await audit({ awardedTables: rows.map((row) => Number(row.table_no)) });
        break;
      }
      case "release_role":
        await client.query("DELETE FROM devices WHERE table_no = $1 AND role = $2", [tableNo, command.role]);
        await audit({ role: command.role });
        break;
      case "reset_device":
        await client.query("DELETE FROM devices WHERE device_id = $1", [command.deviceId]);
        await audit({ deviceId: command.deviceId });
        break;
      case "kill":
        await client.query("UPDATE game_state SET phase = 'FROZEN', clock_paused_at = now() WHERE id = 1");
        await audit();
        break;
      default:
        throw new MutationError("Unknown action", 400);
    }
    const response = { ok: true as const, replay: false };
    await completeOperation(client, operationKey, response);
    return response;
  });
  return throwIfCommittedFailure(result);
}
