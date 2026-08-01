import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "./config";
import type { DeviceSession } from "./types";

export const DEVICE_COOKIE = "kp5c_device";
export const SESSION_COOKIE = "kp5c_session";
export const CONSOLE_COOKIE = "kp5c_console";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const DEV_SECRET = "kp5c-local-only-session-secret-32-bytes";

type TokenOptions = {
  secret?: string;
  now?: number;
  ttlSeconds?: number;
};

type VerifyOptions = Pick<TokenOptions, "secret" | "now">;

type DeviceToken = DeviceSession & { typ: "device"; exp: number };
type ConsoleToken = { typ: "console"; exp: number };

function sessionSecret(explicit?: string): string {
  const secret = explicit ?? process.env.SESSION_SECRET;
  if (secret && Buffer.byteLength(secret) >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be configured with at least 32 bytes");
  }
  return DEV_SECRET;
}

function sign(payload: DeviceToken | ConsoleToken, secret: string): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

function verifyToken(raw: string, options: VerifyOptions = {}): DeviceToken | ConsoleToken | null {
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const [encoded, suppliedText] = parts;
  const expected = createHmac("sha256", sessionSecret(options.secret))
    .update(encoded)
    .digest();
  let supplied: Buffer;
  try {
    supplied = Buffer.from(suppliedText, "base64url");
  } catch {
    return null;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as
      | DeviceToken
      | ConsoleToken;
    const now = options.now ?? Math.floor(Date.now() / 1000);
    if (!Number.isSafeInteger(payload.exp) || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieValue(
  session: DeviceSession,
  options: TokenOptions = {},
): string {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  return sign(
    { ...session, typ: "device", exp: now + (options.ttlSeconds ?? SESSION_TTL_SECONDS) },
    sessionSecret(options.secret),
  );
}

export function consoleSessionCookieValue(options: TokenOptions = {}): string {
  const now = options.now ?? Math.floor(Date.now() / 1000);
  return sign(
    { typ: "console", exp: now + (options.ttlSeconds ?? SESSION_TTL_SECONDS) },
    sessionSecret(options.secret),
  );
}

export function verifyDeviceSession(
  raw: string,
  options: VerifyOptions = {},
): DeviceSession | null {
  const payload = verifyToken(raw, options);
  if (
    payload?.typ !== "device" ||
    typeof payload.deviceId !== "string" ||
    !Number.isInteger(payload.tableNo) ||
    !parseRole(payload.role)
  ) {
    return null;
  }
  return { deviceId: payload.deviceId, tableNo: payload.tableNo, role: payload.role };
}

export function verifyConsoleSession(raw: string, options: VerifyOptions = {}): boolean {
  return verifyToken(raw, options)?.typ === "console";
}

export function sessionCookieOptions(production = process.env.NODE_ENV === "production") {
  return {
    httpOnly: true as const,
    secure: production,
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export async function readSession(): Promise<DeviceSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  return raw ? verifyDeviceSession(raw) : null;
}

export function parseRole(raw: string): Role | null {
  const allowed: Role[] = [
    "CFO",
    "TAX",
    "CIO",
    "PROCUREMENT",
    "OPS",
    "ALL_ROLES",
  ];
  return allowed.includes(raw as Role) ? (raw as Role) : null;
}
