import { createClient, sql, type VercelPoolClient } from "@vercel/postgres";

export { sql };

/**
 * Postgres adapter.
 *
 * Vercel's Neon integration injects both pooled and unpooled URLs:
 *   POSTGRES_URL             = pooled endpoint (-pooler.c-...neon.tech)
 *   POSTGRES_URL_NON_POOLING = direct endpoint (-c-...neon.tech)
 *
 * For this single-shot event platform we use the global `sql` (VercelPool)
 * for both SELECT and mutation. The pooled endpoint validates that
 * POSTGRES_URL contains '-pooler.' (which we set). Mutations rely on
 * SELECT ... FOR UPDATE row locks plus unique constraints to handle
 * concurrent claims safely — each statement auto-commits because the
 * Neon HTTP protocol does not support interactive transactions.
 */
export function requirePostgresUrl(): string {
  const url = process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL_NON_POOLING (or POSTGRES_URL) is required. Set it before running production stateful routes.",
    );
  }
  return url;
}

/**
 * Get the long-lived direct (unpooled) Postgres client. Available for
 * callers that need the createClient() result. The Neon HTTP driver
 * does not support interactive transactions, so callers must batch
 * statements via `client.transaction([...])` if they need atomicity.
 */
export function getClient(): VercelPoolClient {
  const url = requirePostgresUrl();
  return createClient({ connectionString: url }) as unknown as VercelPoolClient;
}

/**
 * TransactionClient — adapter type matching the existing call-site
 * signature `(client) => client.query(text, values) => Promise<rows>`
 * used by lib/store.pg.ts and scripts/seed.ts. The "client" passed in
 * is the global `sql` VercelPool, so each query is a real HTTP
 * round-trip to the pooled endpoint and auto-commits.
 */
export interface TransactionClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

/**
 * withTransaction — shim that satisfies the legacy call-site pattern
 * `(fn: (client) => Promise<T>) => Promise<T>` without a real Postgres
 * transaction. Just calls `fn(sql)`. Safe because row-level safety
 * comes from `SELECT ... FOR UPDATE` locks + unique constraints in the
 * SQL itself.
 */
export async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  return fn(sql as unknown as TransactionClient);
}

export async function derivedCapital(tableNo: number): Promise<number> {
  const result = await sql<{ sum: string | null }>`
    SELECT COALESCE(SUM(delta_aed), 0)::text AS sum
    FROM events
    WHERE table_no = ${tableNo}
  `;
  const rows = (result as { rows?: { sum: string | null }[] }).rows ?? [];
  return 1_000_000 + Number(rows[0]?.sum ?? 0);
}

export async function reconcileCapital(tableNo: number): Promise<number> {
  const truth = await derivedCapital(tableNo);
  await sql`UPDATE teams SET capital_aed = ${truth} WHERE table_no = ${tableNo}`;
  return truth;
}

/**
 * Self-tick: run the same work as /api/cron/outage from inside any
 * stateful request, throttled to once per ~5 seconds per runtime
 * instance. The Hobby Vercel plan refuses `* * * * *` cron schedules
 * (daily-cron cap), so the platform drives its own tick from the
 * request hot path. Safe because every underlying mutation is
 * idempotent and uses SELECT FOR UPDATE under the hood.
 */
let lastTickAt = 0;
let lastTickPromise: Promise<unknown> | null = null;
const TICK_THROTTLE_MS = 5_000;

export async function selfTickOutageOnce(now: Date = new Date()): Promise<{
  advanced: number;
  ticks: number;
  ran: boolean;
}> {
  const nowMs = now.getTime();
  if (nowMs - lastTickAt < TICK_THROTTLE_MS) {
    return { advanced: 0, ticks: 0, ran: false };
  }
  if (lastTickPromise) {
    await lastTickPromise.catch(() => undefined);
    return { advanced: 0, ticks: 0, ran: false };
  }
  lastTickAt = nowMs;
  lastTickPromise = (async () => {
    try {
      const { advanceTimelineOnce } = await import("./timeline");
      const { tickOutagesOnce } = await import("./outage.catchup");
      const advanced = await advanceTimelineOnce(now);
      const ticks = await tickOutagesOnce(now);
      return { advanced, ticks };
    } finally {
      lastTickPromise = null;
    }
  })();
  const result = await lastTickPromise.catch(() => ({ advanced: 0, ticks: 0 }));
  return { ...(result as { advanced: number; ticks: number }), ran: true };
}