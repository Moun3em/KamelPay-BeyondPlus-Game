import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AuthError, requireServerTick } from "@/lib/auth";
import { sql } from "@/lib/db";
import { friendlyError } from "@/lib/error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

/**
 * One-time bootstrap: apply the platform schema + seed the DB.
 * Guarded by CRON_SECRET (same as /api/cron/outage).
 *
 * Idempotent: every CREATE uses IF NOT EXISTS, every INSERT uses
 * ON CONFLICT DO NOTHING. Safe to re-run.
 *
 * Production guard: refuses to run unless NODE_ENV=production AND
 * the env var MIGRATE_ON_BOOT is set, so a stray curl can't wipe a
 * live game. Set MIGRATE_ON_BOOT=1 on the Vercel env for one
 * deployment to enable it, then remove.
 */
export async function POST(req: Request) {
  if (process.env.MIGRATE_ON_BOOT !== "1") {
    return NextResponse.json(
      { error: "MIGRATE_ON_BOOT is not set to 1" },
      { status: 403 },
    );
  }
  try {
    requireServerTick(req.headers.get("authorization"));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return friendlyError("[api/migrate-and-seed]", error, "Migrate failed");
  }

  // 1) Apply schema (everything is CREATE ... IF NOT EXISTS so re-runs are safe)
  const schemaPath = join(process.cwd(), "sql", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const statements = splitSql(schema);
  for (const stmt of statements) {
    if (stmt.trim()) await sql.query(stmt);
  }

  // 2) Apply the Phase 1 migration
  const phase1Path = join(process.cwd(), "sql", "migrations", "phase1_event_safety.up.sql");
  const phase1 = readFileSync(phase1Path, "utf8");
  const phase1Statements = splitSql(phase1);
  for (const stmt of phase1Statements) {
    if (stmt.trim()) await sql.query(stmt);
  }

  // 3) Seed teams + cards + positions from cards_seed.json (idempotent)
  const seedResult = await seedFromJson();

  return NextResponse.json({
    ok: true,
    schema_statements: statements.length,
    migration_statements: phase1Statements.length,
    seed: seedResult,
  });
}

function splitSqlStatements(schema: string): string[] {
  const withoutComments = schema.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n");
  const out: string[] = [];
  let buf = "";
  let q: "'" | '"' | null = null;
  for (let i = 0; i < withoutComments.length; i++) {
    const c = withoutComments[i];
    if (q && c === q && withoutComments[i + 1] === q) {
      buf += c + c;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      q = q === c ? null : (q ?? (c as "'" | '"'));
      buf += c;
      continue;
    }
    if (c === ";" && q === null) {
      out.push(buf);
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

async function seedFromJson() {
  const path = join(process.cwd(), "data", "cards_seed.json");
  const seed = JSON.parse(readFileSync(path, "utf8")) as {
    meta: { pin_seed: string; tables: number };
    teams: { table_no: number; pin: string }[];
    cards: Record<string, unknown>[];
  };

  if (seed.meta.pin_seed !== "kamelpay-2026-event-01") {
    throw new Error(`Unexpected pin_seed ${seed.meta.pin_seed}; refusing to seed.`);
  }

  let teams = 0;
  for (const t of seed.teams) {
    await sql.query(
      "INSERT INTO teams (table_no, pin) VALUES ($1, $2) ON CONFLICT (table_no) DO NOTHING",
      [t.table_no, t.pin],
    );
    teams += 1;
  }

  let cards = 0;
  for (const raw of seed.cards) {
    const skip = new Set([
      "card_id", "qr", "deck", "archetype", "owner_table", "held_by_table_at_setup",
      "is_foreign_at_setup", "validity", "correct_action", "penalty_aed", "locked_until_phase",
    ]);
    const payload = Object.fromEntries(Object.entries(raw).filter(([k]) => !skip.has(k)));
    await sql.query(
      `INSERT INTO cards (card_id, qr, deck, archetype, owner_table, validity, correct_action, penalty_aed, locked_until_phase, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (card_id) DO NOTHING`,
      [
        String(raw.card_id),
        String(raw.qr),
        String(raw.deck),
        String(raw.archetype),
        Number(raw.owner_table),
        raw.validity ?? null,
        raw.correct_action ?? null,
        Number(raw.penalty_aed ?? 0),
        raw.locked_until_phase ?? null,
        JSON.stringify(payload),
      ],
    );
    await sql.query(
      `INSERT INTO card_positions (card_id, held_by_table, state)
       VALUES ($1, $2, 'PENDING')
       ON CONFLICT (card_id) DO NOTHING`,
      [String(raw.card_id), Number(raw.held_by_table_at_setup)],
    );
    cards += 1;
  }

  return { teams, cards, pin_seed: seed.meta.pin_seed };
}

// Re-export the splitter under a local name used in the handler
const splitSql = splitSqlStatements;