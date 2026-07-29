import { db, sql } from "@vercel/postgres";

export { sql };

export function requirePostgresUrl(): string {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL is required. Set it before running production stateful routes.",
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

export async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  requirePostgresUrl();
  return runTransaction(db as unknown as TransactionPool, fn);
}

export async function derivedCapital(tableNo: number): Promise<number> {
  const { rows } = await sql<{ sum: string | null }>`
    SELECT COALESCE(SUM(delta_aed), 0)::text AS sum
    FROM events
    WHERE table_no = ${tableNo}
  `;
  return 1_000_000 + Number(rows[0]?.sum ?? 0);
}

export async function reconcileCapital(tableNo: number): Promise<number> {
  const truth = await derivedCapital(tableNo);
  await sql`UPDATE teams SET capital_aed = ${truth} WHERE table_no = ${tableNo}`;
  return truth;
}
