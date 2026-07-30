import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/join/route";
import {
  claimDevice,
  getDevice,
  getTeam,
  loadSeedIntoMemory,
  releaseDevice,
  releaseRole,
} from "./store";

function pinForTable(tableNo: number): string {
  return getTeam(tableNo)?.pin ?? "AAAAAA";
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("GAME_STORE", "memory");
  vi.stubEnv("SESSION_SECRET", "test-session-secret-that-is-long-enough-123456");
  loadSeedIntoMemory();
});

function joinRequest(body: unknown, deviceCookie?: string) {
  const cookie = deviceCookie ? `kp5c_device=${deviceCookie}` : "";
  return new Request("http://localhost/api/join", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

describe("join — PRD §7 role resilience", () => {
  it("preserves a device's own role claim when reconnecting after losing the connection", async () => {
    const deviceId = "9b122d59-b698-4ecf-862d-856f9b93ad97";
    const first = await POST(
      joinRequest({ tableNo: 1, pin: pinForTable(1), role: "TAX" }, deviceId),
    );
    expect(first.status).toBe(200);
    expect(getDevice(deviceId)?.role).toBe("TAX");

    releaseDevice(deviceId);

    const reconnect = await POST(
      joinRequest({ tableNo: 1, pin: pinForTable(1), role: "TAX" }, deviceId),
    );
    expect(reconnect.status).toBe(200);
    expect(getDevice(deviceId)?.role).toBe("TAX");
  });

  it("lets any device reclaim a role that the facilitator just released", async () => {
    const original = "11111111-1111-4111-8111-111111111111";
    const replacement = "22222222-2222-4222-8222-222222222222";
    claimDevice(original, 1, "CFO");
    releaseRole(1, "CFO");

    const response = await POST(
      joinRequest({ tableNo: 1, pin: pinForTable(1), role: "CFO" }, replacement),
    );
    expect(response.status).toBe(200);
    expect(getDevice(replacement)?.role).toBe("CFO");
  });

  it("refuses a second device from stealing a role that is currently held by someone else", async () => {
    const original = "11111111-1111-4111-8111-111111111111";
    const thief = "33333333-3333-4333-8333-333333333333";
    claimDevice(original, 1, "CFO");

    const response = await POST(
      joinRequest({ tableNo: 1, pin: getTeam(1)!.pin, role: "CFO" }, thief),
    );
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error.toLowerCase()).toContain("taken");
    expect(getDevice(original)?.role).toBe("CFO");
    expect(getDevice(thief)).toBeNull();
  });

  it("lets a returning device move to a different role after it voluntarily releases", async () => {
    const deviceId = "44444444-4444-4444-8444-444444444444";
    claimDevice(deviceId, 1, "TAX");
    releaseDevice(deviceId);

    const response = await POST(
      joinRequest({ tableNo: 1, pin: pinForTable(1), role: "CFO" }, deviceId),
    );
    expect(response.status).toBe(200);
    expect(getDevice(deviceId)?.role).toBe("CFO");
  });
});