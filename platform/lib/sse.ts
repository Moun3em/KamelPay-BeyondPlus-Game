/**
 * Live fanout via Vercel KV. When KV is unset, in-memory fallback for local dev.
 * SSE clients poll/subscribe to version ticks.
 */

type TickPayload = {
  version: number;
  at: number;
  phase?: string;
  banner?: string | null;
  leaderboard?: { table_no: number; capital_aed: number; badges: string[] }[];
};

const memory: { tick: TickPayload; tableVersions: Map<number, number> } = {
  tick: { version: 0, at: Date.now() },
  tableVersions: new Map(),
};

function kvConfigured(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN,
  );
}

async function getKv() {
  const { kv } = await import("@vercel/kv");
  return kv;
}

export async function publishGlobal(partial?: Partial<TickPayload>): Promise<TickPayload> {
  const next: TickPayload = {
    ...memory.tick,
    ...partial,
    version: memory.tick.version + 1,
    at: Date.now(),
  };
  memory.tick = next;

  if (kvConfigured()) {
    const kv = await getKv();
    await kv.set("game:tick", next);
  }
  return next;
}

export async function publishTable(tableNo: number): Promise<void> {
  const v = (memory.tableVersions.get(tableNo) ?? 0) + 1;
  memory.tableVersions.set(tableNo, v);
  if (kvConfigured()) {
    const kv = await getKv();
    await kv.set(`table:${tableNo}:v`, v);
    await kv.publish(`table:${tableNo}`, String(v));
  }
  await publishGlobal();
}

export async function getTick(): Promise<TickPayload> {
  if (kvConfigured()) {
    const kv = await getKv();
    const remote = await kv.get<TickPayload>("game:tick");
    if (remote) return remote;
  }
  return memory.tick;
}

export async function getTableVersion(tableNo: number): Promise<number> {
  if (kvConfigured()) {
    const kv = await getKv();
    const v = await kv.get<number>(`table:${tableNo}:v`);
    if (typeof v === "number") return v;
  }
  return memory.tableVersions.get(tableNo) ?? 0;
}
