import { timingSafeEqual } from "node:crypto";
import type { Role } from "./config";
import { CONSOLE_COOKIE, SESSION_COOKIE, verifyConsoleSession, verifyDeviceSession } from "./session";
import type { DeviceSession } from "./types";

type DurableDevice = {
  device_id: string;
  table_no: number;
  role: Role;
};

type VerifyOptions = { secret?: string; now?: number };

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
  }
}

export function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export async function authenticateDeviceToken(
  token: string | null,
  getDevice: (deviceId: string) => Promise<DurableDevice | null>,
  allowedRoles?: readonly Role[],
  options: VerifyOptions = {},
): Promise<DeviceSession> {
  const session = token ? verifyDeviceSession(token, options) : null;
  if (!session) throw new AuthError("Unauthorized", 401);
  const durable = await getDevice(session.deviceId);
  if (
    !durable ||
    durable.table_no !== session.tableNo ||
    durable.role !== session.role
  ) {
    throw new AuthError("Session no longer owns this role", 401);
  }
  if (
    allowedRoles &&
    !allowedRoles.includes(session.role) &&
    session.role !== "ALL_ROLES"
  ) {
    throw new AuthError("Role is not authorized for this action", 403);
  }
  return session;
}

export function requireConsoleToken(token: string | null): void {
  if (!token || !verifyConsoleSession(token)) {
    throw new AuthError("Unauthorized", 401);
  }
}

export function requireServerTick(
  authorization: string | null,
  configuredSecret = process.env.CRON_SECRET,
): void {
  if (!configuredSecret) {
    throw new AuthError("CRON_SECRET is not configured", 401);
  }
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  const expectedBuffer = Buffer.from(configuredSecret);
  const suppliedBuffer = Buffer.from(supplied);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    throw new AuthError("Unauthorized", 401);
  }
}

export function deviceTokenFromRequest(req: Request): string | null {
  return cookieValue(req, SESSION_COOKIE);
}

export function consoleTokenFromRequest(req: Request): string | null {
  return cookieValue(req, CONSOLE_COOKIE);
}
