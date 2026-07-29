import { sql } from "@vercel/postgres";

export { sql };

export function requirePostgresUrl(): string {
  const url =
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      "POSTGRES_URL is required. Set it in .env.local before seeding or running stateful routes.",
    );
  }
  return url;
}

export async function withTransaction<T>(
  fn: (query: typeof sql) => Promise<T>,
): Promise<T> {
  await sql`BEGIN`;
  try {
    const result = await fn(sql);
    await sql`COMMIT`;
    return result;
  } catch (err) {
    await sql`ROLLBACK`;
    throw err;
  }
}

export async function derivedCapital(tableNo: number): Promise<number> {
  const { rows } = await sql<{ sum: string | null }>`
    SELECT COALESCE(SUM(delta_aed), 0)::text AS sum
    FROM events
    WHERE table_no = ${tableNo}
  `;
  const eventSum = Number(rows[0]?.sum ?? 0);
  const start = 1_000_000;
  return start + eventSum;
}

export async function reconcileCapital(tableNo: number): Promise<number> {
  const truth = await derivedCapital(tableNo);
  await sql`
    UPDATE teams SET capital_aed = ${truth} WHERE table_no = ${tableNo}
  `;
  return truth;
}
