/** Seed Postgres from data/cards_seed.json verbatim; never regenerate PINs here. */
import { readFileSync } from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { requirePostgresUrl, withTransaction, type TransactionClient } from "../lib/db";

export interface SeedFile {
  meta: { tables: number; pin_seed: string };
  teams: { table_no: number; pin: string }[];
  economy: { starting_capital: number };
  cards: Record<string, unknown>[];
}

function loadSeed(): SeedFile {
  return JSON.parse(readFileSync(join(process.cwd(), "data", "cards_seed.json"), "utf8")) as SeedFile;
}

function cardPayload(card: Record<string, unknown>): Record<string, unknown> {
  const skip = new Set(["card_id", "qr", "deck", "archetype", "owner_table", "held_by_table_at_setup", "is_foreign_at_setup", "validity", "correct_action", "penalty_aed", "locked_until_phase"]);
  return Object.fromEntries(Object.entries(card).filter(([key]) => !skip.has(key)));
}

export function validateSeed(seed: SeedFile) {
  if (seed.meta.pin_seed !== "kamelpay-2026-event-01") {
    throw new Error(`Unexpected pin_seed ${seed.meta.pin_seed}. Refusing to seed — print run may desync.`);
  }
  if (seed.teams.length !== seed.meta.tables) throw new Error("teams length !== meta.tables");
  if (seed.cards.length !== seed.meta.tables * 21) {
    throw new Error(`Expected ${seed.meta.tables * 21} cards, got ${seed.cards.length}`);
  }
  for (const team of seed.teams) {
    if (!/^[ACDEFGHJKLMNPQRTUVWXY34679]{6}$/.test(team.pin)) {
      throw new Error(`Invalid PIN charset for table ${team.table_no}: ${team.pin}`);
    }
  }
  return { teams: seed.teams.length, cards: seed.cards.length, pin_seed: seed.meta.pin_seed };
}

/** Split SQL outside quoted strings and strip whole-line comments. */
export function splitSqlStatements(schema: string): string[] {
  const withoutComments = schema.split("\n").filter((line) => !line.trimStart().startsWith("--")).join("\n");
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  for (let index = 0; index < withoutComments.length; index++) {
    const char = withoutComments[index];
    if (quote && char === quote && withoutComments[index + 1] === quote) {
      current += char + char;
      index++;
      continue;
    }
    if (char === "'" || char === '"') quote = quote === char ? null : quote ?? char;
    if (char === ";" && !quote) {
      if (current.trim()) statements.push(current.trim());
      current = "";
    } else current += char;
  }
  if (current.trim()) statements.push(current.trim());
  return statements;
}

async function applySchema(client: TransactionClient): Promise<void> {
  const schema = readFileSync(join(process.cwd(), "sql", "schema.sql"), "utf8");
  for (const statement of splitSqlStatements(schema)) await client.query(statement);
}

export async function seedDatabase(seed: SeedFile): Promise<void> {
  requirePostgresUrl();
  await withTransaction(async (client) => {
    await applySchema(client);
    await client.query("TRUNCATE operations, events, devices, card_positions, cards, teams, game_state RESTART IDENTITY CASCADE");
    for (const team of seed.teams) {
      await client.query("INSERT INTO teams (table_no, pin, capital_aed) VALUES ($1, $2, $3)", [team.table_no, team.pin, seed.economy.starting_capital]);
    }
    for (const raw of seed.cards) {
      const values = [
        String(raw.card_id), String(raw.qr), String(raw.deck), String(raw.archetype), Number(raw.owner_table),
        raw.validity == null ? null : String(raw.validity), raw.correct_action == null ? null : String(raw.correct_action),
        Number(raw.penalty_aed ?? raw.penalty ?? 0), raw.locked_until_phase == null ? null : String(raw.locked_until_phase),
        JSON.stringify(cardPayload(raw)),
      ];
      await client.query(`INSERT INTO cards
        (card_id, qr, deck, archetype, owner_table, validity, correct_action, penalty_aed, locked_until_phase, payload)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`, values);
      await client.query("INSERT INTO card_positions (card_id, held_by_table, state) VALUES ($1, $2, 'PENDING')", [String(raw.card_id), Number(raw.held_by_table_at_setup)]);
    }
    await client.query(`INSERT INTO game_state (id, phase, paused_ms_total) VALUES (1, 'LOBBY', 0)
      ON CONFLICT (id) DO UPDATE SET phase = 'LOBBY', clock_started_at = NULL,
      clock_paused_at = NULL, paused_ms_total = 0, narrative_banner = NULL`);
    const result = await client.query(`SELECT
      (SELECT COUNT(*)::int FROM teams) AS teams,
      (SELECT COUNT(*)::int FROM cards) AS cards,
      (SELECT COUNT(*)::int FROM card_positions) AS positions,
      (SELECT COUNT(*)::int FROM game_state) AS game_state`);
    const row = result.rows[0];
    if (Number(row.teams) !== seed.teams.length || Number(row.cards) !== seed.cards.length || Number(row.positions) !== seed.cards.length || Number(row.game_state) !== 1) {
      throw new Error(`Seed count mismatch: ${JSON.stringify(row)}`);
    }
  });
}

export async function main() {
  const seed = loadSeed();
  const summary = validateSeed(seed);
  console.log("Validated seed:", summary);
  if (process.argv.includes("--dry")) {
    console.log("Dry run — no database writes.");
    return;
  }
  await seedDatabase(seed);
  console.log("Seed OK: pin_seed=", seed.meta.pin_seed);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
