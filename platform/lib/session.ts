import { cookies } from "next/headers";
import type { Role } from "./config";
import type { DeviceSession } from "./types";

export const DEVICE_COOKIE = "kp5c_device";
export const SESSION_COOKIE = "kp5c_session";
export const CONSOLE_COOKIE = "kp5c_console";

export async function readSession(): Promise<DeviceSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DeviceSession;
    if (!parsed.deviceId || !parsed.tableNo || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function sessionCookieValue(session: DeviceSession): string {
  return JSON.stringify(session);
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
