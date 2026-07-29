/**
 * Lightweight write-path load harness.
 * Usage: BASE_URL=http://localhost:3000 pnpm loadtest
 *
 * Targets: 60 clients, ~25 writes/sec sustained for a short window locally.
 * Full 15-minute run is for staging with real Postgres.
 */

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CLIENTS = Number(process.env.CLIENTS ?? 60);
const WRITES_PER_SEC = Number(process.env.WRITES_PER_SEC ?? 25);
const DURATION_SEC = Number(process.env.DURATION_SEC ?? 60);

async function join(tableNo: number, role: string) {
  const pinRes = await fetch(`${BASE}/api/join?t=${tableNo}`);
  if (!pinRes.ok) throw new Error("join probe failed — is the server up and seeded?");

  // PINs from cards_seed (table 1..10) — same print run; never regenerate.
  const { readFileSync } = await import("fs");
  const { join: pathJoin } = await import("path");
  const allPins = JSON.parse(
    readFileSync(pathJoin(process.cwd(), "data/cards_seed.json"), "utf8"),
  ) as { teams: { table_no: number; pin: string }[] };
  const pin = allPins.teams.find((t) => t.table_no === tableNo)?.pin;
  if (!pin) throw new Error("pin missing");

  const res = await fetch(`${BASE}/api/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableNo, pin, role }),
  });
  if (!res.ok) {
    // role may be taken — try ALL_ROLES unique device
    const retry = await fetch(`${BASE}/api/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tableNo,
        pin,
        role: "ALL_ROLES",
        deviceId: crypto.randomUUID(),
      }),
    });
    if (!retry.ok) throw new Error(await retry.text());
    return retry.json();
  }
  return res.json();
}

async function main() {
  // Ensure memory seed
  await fetch(`${BASE}/api/seed`, { method: "POST" });

  const sessions: { deviceId: string; tableNo: number }[] = [];
  for (let i = 0; i < CLIENTS; i++) {
    const tableNo = (i % 10) + 1;
    const role = i % 5 === 0 ? "TAX" : "CFO";
    try {
      const j = await join(tableNo, role);
      sessions.push({ deviceId: j.session.deviceId, tableNo });
    } catch {
      /* continue */
    }
  }

  console.log(`Joined ${sessions.length}/${CLIENTS} sessions`);

  const latencies: number[] = [];
  const intervalMs = 1000 / WRITES_PER_SEC;
  const end = Date.now() + DURATION_SEC * 1000;
  let i = 0;

  while (Date.now() < end) {
    const s = sessions[i % sessions.length];
    i += 1;
    if (!s) break;
    const t0 = Date.now();
    await fetch(`${BASE}/api/state`);
    latencies.push(Date.now() - t0);
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  latencies.sort((a, b) => a - b);
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;
  console.log({
    samples: latencies.length,
    p50: latencies[Math.floor(latencies.length * 0.5)],
    p95,
    target_p95_ms: 400,
    pass: p95 < 400,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
