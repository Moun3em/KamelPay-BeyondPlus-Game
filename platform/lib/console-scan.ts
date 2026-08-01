import type { Role } from "./config";

/**
 * Deterministic per-table console device id for the 0-device rescue
 * (console_scan). devices.device_id is UUID (schema.sql) — the role
 * discriminator lives INSIDE the last 12-hex segment so the id stays a
 * valid canonical UUID (8-4-4-4-12), e.g.:
 *   00000000-0000-4000-8000-000000000010  (table 1, ALL_ROLES)
 *   00000000-0000-4000-8000-00000000001a  (table 1, TAX)
 */
export function consoleDeviceId(tableNo: number, role: Role): string {
  const pad = String(tableNo).padStart(11, "0");
  const suffix = role === "TAX" ? "a" : "0";
  return `00000000-0000-4000-8000-${pad}${suffix}`;
}
