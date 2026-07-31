import { createClient, sql, type VercelPoolClient } from "@vercel/postgres";

export { sql };

/**
 * Postgres adapter.
 *
 * Vercel's Neon integration injects both pooled and unpooled URLs:
 *   POSTGRES_URL             = pooled endpoint (-pooler.c-...neon.tech)
 *   POSTGRES_URL_NON_POOLING = direct endpoint (-c-...neon.tech)
 *
 * For this single-shot event platform we use the direct endpoint only,
 * because:
 *   1. The runtime lives ~60 minutes per event; long-lived client is fine
 *   2. Postgres transactions (SELECT FOR UPDATE in store.pg.ts) need
 *      the direct connection
 *   3. The pooled endpoint speaks HTTP/WS via PgBouncer, which the
 *      SQL transaction API doesn't speak cleanly
 *
 * The user only has to set POSTGRES_URL_NON_POOLING (we set it from
 * the unpooled DATABASE_URL_UNPOOLED the Neon console hands out).
 * Falls back to POSTGRES_URL for backwards compatibility.
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

export interface TransactionClient {
  query(text: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  release(error?: Error | boolean): void;
}

export interface TransactionPool<T extends TransactionClient = TransactionClient> {
  connect(): Promise<T>;
}

export async function runTransaction<T, C extends TransactionClient>(
  pool: TransactionPool<C>,
  fn: (client: C) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let releaseError: Error | undefined;
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Preserve the mutation error; a discarded connection cannot be reused.
      releaseError = rollbackError instanceof Error ? rollbackError : new Error("Rollback failed");
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}

let clientSingleton: VercelPoolClient | null = null;
let clientUrl: string | null = null;

/**
 * Get the long-lived direct (unpooled) Postgres client. Created lazily
 * and memoised per URL. The direct endpoint is required because the
 * SQL transaction API in store.pg.ts uses SELECT FOR UPDATE which
 * cannot safely span PgBouncer's pooled connections.
 */
export function getClient(): VercelPoolClient {
  const url = requirePostgresUrl();
  if (clientSingleton && clientUrl === url) return clientSingleton;
  clientSingleton = createClient({ connectionString: url }) as unknown as VercelPoolClient;
  clientUrl = url;
  return clientSingleton;
}

export async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  return runTransaction(getClient() as unknown as TransactionPool, fn);
}

/**
 * Run a parameterised query and return rows. Convenience wrapper for
 * the common SELECT/UPDATE-with-bind pattern used across routes.
 */
export async function query<R = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<R[]> {
  const client = getClient();
  const result = await client.query({ text, values });
  return result.rows as R[];
}

/**
 * Same as `query` but returns the first row or null.
 */
export async function queryOne<R = Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<R | null> {
  const rows = await query<R>(text, values);
  return rows[0] ?? null;
}

export async function derivedCapital(tableNo: number): Promise<number> {
  const rows = await query<{ sum: string | null }>(
    "SELECT COALESCE(SUM(delta_aed), 0)::text AS sum FROM events WHERE table_no = $1",
    [tableNo],
  );
  return 1_000_000 + Number(rows[0]?.sum ?? 0);
}

export async function reconcileCapital(tableNo: number): Promise<number> {
  const truth = await derivedCapital(tableNo);
  await query(
    "UPDATE teams SET capital_aed = $1 WHERE table_no = $2",
    [truth, tableNo],
  );
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