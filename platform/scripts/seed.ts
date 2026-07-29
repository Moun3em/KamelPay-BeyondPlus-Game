/**
 * Seed Postgres from data/cards_seed.json — verbatim PINs, never regenerated.
 *
 * Usage:
 *   POSTGRES_URL=... pnpm seed
 *   pnpm seed:dry   # validate counts without DB
 */

import { readFileSync } from "fs";
import { join } from "path";
import { sql, requirePostgresUrl } from "../lib/db";

interface SeedFile {
  meta: { tables: number; pin_seed: string };
  teams: { table_no: number; pin: string }[];
  economy: { starting_capital: number };
  cards: Record<string, unknown>[];
}

function loadSeed(): SeedFile {
  const path = join(process.cwd(), "data", "cards_seed.json");
  return JSON.parse(readFileSync(path, "utf8")) as SeedFile;
}

function cardPayload(card: Record<string, unknown>): Record<string, unknown> {
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
  for (const [k, v] of Object.entries(card)) {
    if (!skip.has(k)) payload[k] = v;
  }
  return payload;
}

export function validateSeed(seed: SeedFile): {
  teams: number;
  cards: number;
  pin_seed: string;
} {
  if (seed.meta.pin_seed !== "kamelpay-2026-event-01") {
    throw new Error(
      `Unexpected pin_seed ${seed.meta.pin_seed}. Refusing to seed — print run may desync.`,
    );
  }
  if (seed.teams.length !== seed.meta.tables) {
    throw new Error("teams length !== meta.tables");
  }
  if (seed.cards.length !== seed.meta.tables * 21) {
    // 10 red + 6 green + 4 blue + 1 practice = 21 per table
    throw new Error(
      `Expected ${seed.meta.tables * 21} cards, got ${seed.cards.length}`,
    );
  }
  for (const t of seed.teams) {
    if (!/^[ACDEFGHJKLMNPQRTUVWXY34679]{6}$/.test(t.pin)) {
      throw new Error(`Invalid PIN charset for table ${t.table_no}: ${t.pin}`);
    }
  }
  return {
    teams: seed.teams.length,
    cards: seed.cards.length,
    pin_seed: seed.meta.pin_seed,
  };
}

async function applySchema(): Promise<void> {
  const schema = readFileSync(join(process.cwd(), "sql", "schema.sql"), "utf8");
  // Split on semicolons carefully — run as one batch via simple split
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const statement of statements) {
    await sql.query(statement);
  }
}

async function seedDb(seed: SeedFile): Promise<void> {
  requirePostgresUrl();
  await applySchema();

  // Wipe play state for idempotent re-seed (single-use event platform)
  await sql`TRUNCATE events, devices, card_positions, cards, teams, game_state RESTART IDENTITY CASCADE`;

  const starting = seed.economy.starting_capital;

  for (const t of seed.teams) {
    await sql`
      INSERT INTO teams (table_no, pin, capital_aed)
      VALUES (${t.table_no}, ${t.pin}, ${starting})
    `;
  }

  for (const card of seed.cards) {
    const cardId = String(card.card_id);
    const qr = String(card.qr);
    const deck = String(card.deck);
    const archetype = String(card.archetype);
    const ownerTable = Number(card.owner_table);
    const validity = card.validity != null ? String(card.validity) : null;
    const correctAction =
      card.correct_action != null ? String(card.correct_action) : null;
    const penalty = Number(card.penalty_aed ?? card.penalty ?? 0);
    const locked =
      card.locked_until_phase != null ? String(card.locked_until_phase) : null;
    const payload = JSON.stringify(cardPayload(card));
    const heldBy = Number(card.held_by_table_at_setup);

    await sql`
      INSERT INTO cards (
        card_id, qr, deck, archetype, owner_table,
        validity, correct_action, penalty_aed, locked_until_phase, payload
      ) VALUES (
        ${cardId}, ${qr}, ${deck}, ${archetype}, ${ownerTable},
        ${validity}, ${correctAction}, ${penalty}, ${locked}, ${payload}::jsonb
      )
    `;

    await sql`
      INSERT INTO card_positions (card_id, held_by_table, state)
      VALUES (${cardId}, ${heldBy}, 'PENDING')
    `;
  }

  await sql`
    INSERT INTO game_state (id, phase, paused_ms_total)
    VALUES (1, 'LOBBY', 0)
    ON CONFLICT (id) DO UPDATE SET phase = 'LOBBY', clock_started_at = NULL,
      clock_paused_at = NULL, paused_ms_total = 0, narrative_banner = NULL
  `;

  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM teams) AS teams,
      (SELECT COUNT(*)::int FROM cards) AS cards,
      (SELECT COUNT(*)::int FROM card_positions) AS positions,
      (SELECT COUNT(*)::int FROM game_state) AS game_state
  `;
  const row = counts.rows[0] as {
    teams: number;
    cards: number;
    positions: number;
    game_state: number;
  };

  if (
    row.teams !== seed.teams.length ||
    row.cards !== seed.cards.length ||
    row.positions !== seed.cards.length ||
    row.game_state !== 1
  ) {
    throw new Error(`Seed count mismatch: ${JSON.stringify(row)}`);
  }

  console.log("Seed OK:", row, "pin_seed=", seed.meta.pin_seed);
}

async function main() {
  const dry = process.argv.includes("--dry");
  const seed = loadSeed();
  const summary = validateSeed(seed);
  console.log("Validated seed:", summary);

  if (dry) {
    console.log("Dry run — no database writes.");
    return;
  }

  await seedDb(seed);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
