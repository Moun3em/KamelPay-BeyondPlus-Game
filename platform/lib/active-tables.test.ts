import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONSOLE_COOKIE, consoleSessionCookieValue } from "./session";
import { getGameState, listEvents, listTeams, loadSeedIntoMemory, setGameState } from "./store";
import { POST as consolePOST } from "../app/api/console/route";
import { POST as joinPOST } from "../app/api/join/route";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
  setGameState({ phase: "A" });
});

const seedTeams = JSON.parse(
  readFileSync(join(process.cwd(), "data/cards_seed.json"), "utf8"),
).teams as { table_no: number; pin: string }[];

function consoleRequest(body: unknown) {
  const cookie = `${CONSOLE_COOKIE}=${encodeURIComponent(consoleSessionCookieValue())}`;
  return new Request("http://localhost/api/console", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

function joinRequest(body: unknown) {
  return new Request("http://localhost/api/join", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("active table count (3–10)", () => {
  it("defaults to 10 and lists all seeded teams", () => {
    expect(getGameState().activeTables).toBe(10);
    expect(listTeams()).toHaveLength(10);
  });

  it("filters listTeams to the active set when lowered", () => {
    setGameState({ activeTables: 5 });
    const teams = listTeams();
    expect(teams.map((t) => t.table_no)).toEqual([1, 2, 3, 4, 5]);
  });

  it("rejects out-of-bounds counts via the console route", async () => {
    for (const bad of [2, 11, 3.5, "5", NaN]) {
      const res = await consolePOST(consoleRequest({
        action: "set_active_tables", activeTables: bad, reason: "test", idempotencyKey: `bounds-${String(bad)}`,
      }));
      expect(res.status, `activeTables=${String(bad)}`).toBe(400);
    }
  });

  it("sets the count with an audit event and replays idempotently", async () => {
    const command = { action: "set_active_tables", activeTables: 6, reason: "fewer guests", idempotencyKey: "at:set" };
    const first = await consolePOST(consoleRequest(command));
    expect(first.status).toBe(200);
    expect(getGameState().activeTables).toBe(6);
    expect(listTeams()).toHaveLength(6);

    const replay = await consolePOST(consoleRequest(command));
    expect(replay.status).toBe(200);
    expect((await replay.json()).replay).toBe(true);

    const audit = listEvents(0).some(
      (e) => e.kind === "FACILITATOR_ACTION" && (e.meta as { action?: string })?.action === "set_active_tables",
    );
    expect(audit).toBe(true);
  });

  it("rejects joins to tables beyond the active count with a friendly error", async () => {
    setGameState({ activeTables: 5 });
    const pin6 = seedTeams.find((t) => t.table_no === 6)?.pin;
    const res = await joinPOST(joinRequest({ tableNo: 6, pin: pin6, role: "CFO" }));
    expect(res.status).toBe(409);
    expect(await res.text()).toMatch(/not in play/i);
  });

  it("still accepts joins within the active count", async () => {
    setGameState({ activeTables: 5 });
    const pin5 = seedTeams.find((t) => t.table_no === 5)?.pin;
    const res = await joinPOST(joinRequest({ tableNo: 5, pin: pin5, role: "CFO" }));
    expect(res.status).toBe(200);
  });
});
