import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as scan } from "../app/api/scan/route";
import { POST as outage } from "../app/api/outage/route";
import { POST as join } from "../app/api/join/route";
import { getTeam, loadSeedIntoMemory } from "./store";

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
});

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("strict mutation route validation", () => {
  it("rejects malformed and unknown scan fields before dispatch", async () => {
    expect((await scan(request("/api/scan", {
      cardId: { value: "R-01" }, action: "FILE", idempotencyKey: { value: "x" },
    }))).status).toBe(400);
    expect((await scan(request("/api/scan", {
      cardId: "R-01", action: "FILE", idempotencyKey: "x", unknown: true,
    }))).status).toBe(400);
    expect((await scan(request("/api/scan", {
      qr: "one", cardId: "R-01", action: "FILE", idempotencyKey: "x",
    }))).status).toBe(400);
  });

  it("rejects coercive or unknown outage solve fields before dispatch", async () => {
    expect((await outage(request("/api/outage", {
      action: "solve", answer: ["4", "1", "3", "2"], idempotencyKey: ["x"], unknown: true,
    }))).status).toBe(400);
    expect((await outage(request("/api/outage", {
      action: "solve", answer: "4132", idempotencyKey: "x", unknown: true,
    }))).status).toBe(400);
  });

  it("accepts the authoritative six-character alphanumeric table PIN", async () => {
    const pin = getTeam(1)?.pin;
    expect(pin).toMatch(/^[A-Z0-9]{6}$/);
    const response = await join(request("/api/join", { tableNo: 1, pin, role: "CFO" }));
    expect(response.status).toBe(200);
  });

  it("rejects coerced, out-of-range, and unknown join fields", async () => {
    expect((await join(request("/api/join", { tableNo: "1", pin: "123456", role: "CFO" }))).status).toBe(400);
    expect((await join(request("/api/join", { tableNo: 11, pin: "123456", role: "CFO" }))).status).toBe(400);
    expect((await join(request("/api/join", { tableNo: 1, pin: 123456, role: "CFO" }))).status).toBe(400);
    expect((await join(request("/api/join", { tableNo: 1, pin: "123456", role: "CFO", unknown: true }))).status).toBe(400);
  });
});
