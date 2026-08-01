import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consoleSessionCookieValue,
  sessionCookieOptions,
  sessionCookieValue,
  verifyConsoleSession,
  verifyDeviceSession,
} from "./session";

const secret = "test-session-secret-that-is-at-least-32-bytes";
const now = 1_000_000;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signed sessions", () => {
  it("round-trips an unexpired device session", () => {
    const token = sessionCookieValue(
      { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 3, role: "TAX" },
      { secret, now, ttlSeconds: 60 },
    );

    expect(verifyDeviceSession(token, { secret, now: now + 59 })).toEqual({
      deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97",
      tableNo: 3,
      role: "TAX",
    });
  });

  it("rejects expiry, payload tampering, and signature tampering", () => {
    const token = sessionCookieValue(
      { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 3, role: "TAX" },
      { secret, now, ttlSeconds: 60 },
    );
    const [payload, signature] = token.split(".");
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const forgedPayload = Buffer.from(
      JSON.stringify({ ...parsed, tableNo: 9 }),
    ).toString("base64url");

    expect(verifyDeviceSession(token, { secret, now: now + 60 })).toBeNull();
    expect(verifyDeviceSession(`${forgedPayload}.${signature}`, { secret, now })).toBeNull();
    expect(
      verifyDeviceSession(`${payload}.${signature.slice(0, -1)}A`, { secret, now }),
    ).toBeNull();
  });

  it("does not accept a device token as a console token", () => {
    const device = sessionCookieValue(
      { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 3, role: "TAX" },
      { secret, now, ttlSeconds: 60 },
    );
    const consoleToken = consoleSessionCookieValue({ secret, now, ttlSeconds: 60 });

    expect(verifyConsoleSession(device, { secret, now })).toBe(false);
    expect(verifyConsoleSession(consoleToken, { secret, now })).toBe(true);
  });

  it("fails closed when production has no strong session secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "");
    expect(() => sessionCookieValue(
      { deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97", tableNo: 3, role: "TAX" },
    )).toThrow(/SESSION_SECRET/);

    vi.stubEnv("SESSION_SECRET", "short");
    expect(() => consoleSessionCookieValue()).toThrow(/SESSION_SECRET/);
  });

  it("uses bounded strict secure cookies in production", () => {
    expect(sessionCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 28_800,
    });
  });
});
