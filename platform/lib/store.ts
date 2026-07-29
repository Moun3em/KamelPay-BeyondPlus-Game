/**
 * Game store: Postgres when POSTGRES_URL is set, otherwise in-memory for local demo.
 * Production event MUST use Postgres — memory is for scaffolding/demo only.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { ECONOMY } from "./config";
import type { Role } from "./config";
import type {
  CardRow,
  CardPositionState,
  DeviceSession,
  EventKind,
  GameStateRow,
  TeamState,
} from "./types";

export interface EventRow {
  id: number;
  at: string;
  table_no: number;
  actor_role: string | null;
  kind: EventKind | string;
  card_id: string | null;
  delta_aed: number;
  meta: Record<string, unknown> | null;
  idempotency_key: string | null;
}

export interface CardPosition {
  card_id: string;
  held_by_table: number;
  state: CardPositionState;
}

interface MemoryDb {
  cards: Map<string, CardRow>;
  cardsByQr: Map<string, string>;
  teams: Map<number, TeamState & { pin: string; display_name: string | null }>;
  devices: Map<string, { device_id: string; table_no: number; role: Role; last_seen: string }>;
  events: EventRow[];
  positions: Map<string, CardPosition>;
  game: GameStateRow;
  eventSeq: number;
}

function emptyGame(): GameStateRow {
  return {
    id: 1,
    phase: "LOBBY",
    clock_started_at: null,
    clock_paused_at: null,
    paused_ms_total: 0,
    narrative_banner: null,
  };
}

function createEmpty(): MemoryDb {
  return {
    cards: new Map(),
    cardsByQr: new Map(),
    teams: new Map(),
    devices: new Map(),
    events: [],
    positions: new Map(),
    game: emptyGame(),
    eventSeq: 0,
  };
}

declare global {
  var __kp5c_memory: MemoryDb | undefined;
}

function db(): MemoryDb {
  if (!globalThis.__kp5c_memory) {
    globalThis.__kp5c_memory = createEmpty();
  }
  return globalThis.__kp5c_memory;
}

export function usingMemoryStore(): boolean {
  return !process.env.POSTGRES_URL && !process.env.DATABASE_URL;
}

export function loadSeedIntoMemory(seedPath?: string): {
  teams: number;
  cards: number;
} {
  const path = seedPath ?? join(process.cwd(), "data", "cards_seed.json");
  const seed = JSON.parse(readFileSync(path, "utf8")) as {
    meta: { pin_seed: string; tables: number };
    teams: { table_no: number; pin: string }[];
    economy: { starting_capital: number };
    cards: Record<string, unknown>[];
  };

  if (seed.meta.pin_seed !== "kamelpay-2026-event-01") {
    throw new Error("Unexpected pin_seed — refusing seed");
  }

  const mem = createEmpty();
  const starting = seed.economy.starting_capital ?? ECONOMY.starting_capital;

  for (const t of seed.teams) {
    mem.teams.set(t.table_no, {
      table_no: t.table_no,
      pin: t.pin,
      display_name: null,
      capital_aed: starting,
      ledger_closed: false,
      outage_active: false,
      green_unlocked: false,
      badges: [],
      penalty_cap_aed: null,
      impl_immunity: false,
      final_multiplier: false,
      outage_loss_aed: 0,
      outage_wrong_tries: 0,
    });
  }

  for (const raw of seed.cards) {
    const skip = new Set([
      "card_id",
      "qr",
      "deck",
      "archetype",
      "owner_table",
      "held_by_table_at_setup",
      "is_foreign_at_setup",
      "validity",
      "correct_action",
      "penalty_aed",
      "locked_until_phase",
    ]);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (!skip.has(k)) payload[k] = v;
    }
    const card: CardRow = {
      card_id: String(raw.card_id),
      qr: String(raw.qr),
      deck: raw.deck as CardRow["deck"],
      archetype: String(raw.archetype),
      owner_table: Number(raw.owner_table),
      validity: (raw.validity as CardRow["validity"]) ?? null,
      correct_action: (raw.correct_action as CardRow["correct_action"]) ?? null,
      penalty_aed: Number(raw.penalty_aed ?? raw.penalty ?? 0),
      locked_until_phase:
        raw.locked_until_phase != null ? String(raw.locked_until_phase) : null,
      payload,
    };
    mem.cards.set(card.card_id, card);
    mem.cardsByQr.set(card.qr, card.card_id);
    mem.positions.set(card.card_id, {
      card_id: card.card_id,
      held_by_table: Number(raw.held_by_table_at_setup),
      state: "PENDING",
    });
  }

  globalThis.__kp5c_memory = mem;
  return { teams: mem.teams.size, cards: mem.cards.size };
}

export function ensureMemorySeeded(): void {
  if (!usingMemoryStore()) return;
  const mem = db();
  if (mem.cards.size === 0) {
    loadSeedIntoMemory();
  }
}

export function getGameState(): GameStateRow {
  ensureMemorySeeded();
  return { ...db().game };
}

export function setGameState(patch: Partial<GameStateRow>): GameStateRow {
  ensureMemorySeeded();
  db().game = { ...db().game, ...patch, id: 1 };
  return { ...db().game };
}

export function getTeam(tableNo: number) {
  ensureMemorySeeded();
  return db().teams.get(tableNo) ?? null;
}

export function listTeams() {
  ensureMemorySeeded();
  return [...db().teams.values()].sort((a, b) => a.table_no - b.table_no);
}

export function updateTeam(
  tableNo: number,
  patch: Partial<TeamState & { display_name?: string | null }>,
) {
  const t = getTeam(tableNo);
  if (!t) throw new Error("Unknown table");
  const next = { ...t, ...patch };
  db().teams.set(tableNo, next);
  return next;
}

export function getCardByQr(qr: string): CardRow | null {
  ensureMemorySeeded();
  const id = db().cardsByQr.get(qr);
  return id ? db().cards.get(id) ?? null : null;
}

export function getCardById(cardId: string): CardRow | null {
  ensureMemorySeeded();
  return db().cards.get(cardId) ?? null;
}

export function getPosition(cardId: string): CardPosition | null {
  ensureMemorySeeded();
  return db().positions.get(cardId) ?? null;
}

export function setPosition(cardId: string, patch: Partial<CardPosition>) {
  const p = getPosition(cardId);
  if (!p) throw new Error("Unknown card position");
  const next = { ...p, ...patch };
  db().positions.set(cardId, next);
  return next;
}

export function listPositionsForTable(tableNo: number) {
  ensureMemorySeeded();
  return [...db().positions.values()].filter((p) => p.held_by_table === tableNo);
}

export function findEventByIdempotency(key: string): EventRow | null {
  ensureMemorySeeded();
  return db().events.find((e) => e.idempotency_key === key) ?? null;
}

export function appendEvent(input: {
  table_no: number;
  actor_role?: string | null;
  kind: string;
  card_id?: string | null;
  delta_aed: number;
  meta?: Record<string, unknown> | null;
  idempotency_key?: string | null;
}): EventRow {
  ensureMemorySeeded();
  if (input.idempotency_key) {
    const existing = findEventByIdempotency(input.idempotency_key);
    if (existing) return existing;
  }
  const row: EventRow = {
    id: ++db().eventSeq,
    at: new Date().toISOString(),
    table_no: input.table_no,
    actor_role: input.actor_role ?? null,
    kind: input.kind,
    card_id: input.card_id ?? null,
    delta_aed: input.delta_aed,
    meta: input.meta ?? null,
    idempotency_key: input.idempotency_key ?? null,
  };
  db().events.push(row);
  const team = getTeam(input.table_no);
  if (team) {
    updateTeam(input.table_no, {
      capital_aed: team.capital_aed + input.delta_aed,
    });
  }
  return row;
}

export function listEvents(tableNo?: number): EventRow[] {
  ensureMemorySeeded();
  const all = db().events;
  return tableNo == null
    ? [...all]
    : all.filter((e) => e.table_no === tableNo);
}

export function sumDeltas(tableNo: number): number {
  return listEvents(tableNo).reduce((s, e) => s + e.delta_aed, 0);
}

export function derivedCapital(tableNo: number): number {
  return ECONOMY.starting_capital + sumDeltas(tableNo);
}

export function claimDevice(
  deviceId: string,
  tableNo: number,
  role: Role,
): { ok: true } | { ok: false; error: string } {
  ensureMemorySeeded();
  for (const d of db().devices.values()) {
    if (d.table_no === tableNo && d.role === role && d.device_id !== deviceId) {
      return {
        ok: false,
        error: `${role} is taken — claim another role or ask them to release.`,
      };
    }
  }
  // release this device's previous role
  db().devices.delete(deviceId);
  db().devices.set(deviceId, {
    device_id: deviceId,
    table_no: tableNo,
    role,
    last_seen: new Date().toISOString(),
  });
  return { ok: true };
}

export function getDevice(deviceId: string) {
  ensureMemorySeeded();
  return db().devices.get(deviceId) ?? null;
}

export function listDevices(tableNo?: number) {
  ensureMemorySeeded();
  const all = [...db().devices.values()];
  return tableNo == null ? all : all.filter((d) => d.table_no === tableNo);
}

export function releaseDevice(deviceId: string) {
  ensureMemorySeeded();
  db().devices.delete(deviceId);
}

export function releaseRole(tableNo: number, role: Role) {
  ensureMemorySeeded();
  for (const [id, d] of db().devices) {
    if (d.table_no === tableNo && d.role === role) db().devices.delete(id);
  }
}

export function verifyPin(tableNo: number, pin: string): boolean {
  const t = getTeam(tableNo);
  return Boolean(t && t.pin.toUpperCase() === pin.toUpperCase());
}

export function ownValidFiledCount(tableNo: number): number {
  ensureMemorySeeded();
  let n = 0;
  for (const card of db().cards.values()) {
    if (
      card.deck === "RED" &&
      card.owner_table === tableNo &&
      card.validity === "VALID"
    ) {
      const pos = db().positions.get(card.card_id);
      if (pos?.state === "FILED") n += 1;
    }
  }
  return n;
}

export function missingOwnValid(tableNo: number): {
  archetype: string;
  held_by_table: number;
  card_id: string;
}[] {
  ensureMemorySeeded();
  const out: { archetype: string; held_by_table: number; card_id: string }[] =
    [];
  for (const card of db().cards.values()) {
    if (
      card.deck === "RED" &&
      card.owner_table === tableNo &&
      card.validity === "VALID"
    ) {
      const pos = db().positions.get(card.card_id);
      if (pos && pos.state === "PENDING") {
        out.push({
          archetype: card.archetype,
          held_by_table: pos.held_by_table,
          card_id: card.card_id,
        });
      }
    }
  }
  return out;
}

export function foreignHeldForOthers(tableNo: number) {
  ensureMemorySeeded();
  const out: {
    card_id: string;
    archetype: string;
    owner_table: number;
  }[] = [];
  for (const pos of listPositionsForTable(tableNo)) {
    if (pos.state !== "PENDING") continue;
    const card = getCardById(pos.card_id);
    if (
      card &&
      card.deck === "RED" &&
      card.validity === "VALID" &&
      card.owner_table !== tableNo
    ) {
      out.push({
        card_id: card.card_id,
        archetype: card.archetype,
        owner_table: card.owner_table,
      });
    }
  }
  return out;
}

export type { DeviceSession };
