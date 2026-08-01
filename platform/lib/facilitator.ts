import { ACTIVE_TABLES, ECONOMY, PHASES, ROLES, type Phase, type Role } from "./config";
import { BADGE_LABELS, type BadgeCode } from "./engines/badges";

export const MAX_FACILITATOR_ADJUST_AED = ECONOMY.starting_capital;
const ACTIONS = [
  "set_phase", "pause", "resume", "broadcast", "adjust", "force_resolve_outage",
  "unlock_green", "award_badge", "ensure_badges", "release_role", "reset_device", "kill",
  "set_active_tables", "reset_game", "set_event_mode", "console_scan",
] as const;
type Action = (typeof ACTIONS)[number];

type Common = { action: Action; reason: string; idempotencyKey: string };
export type FacilitatorCommand =
  | (Common & { action: "set_phase"; phase: Phase })
  | (Common & { action: "broadcast"; banner: string })
  | (Common & { action: "adjust"; tableNo: number; amount: number })
  | (Common & { action: "force_resolve_outage" | "unlock_green"; tableNo: number })
  | (Common & { action: "award_badge"; tableNo: number; badge: BadgeCode })
  | (Common & { action: "release_role"; tableNo: number; role: Role })
  | (Common & { action: "reset_device"; deviceId: string })
  | (Common & { action: "set_active_tables"; activeTables: number })
  | (Common & { action: "set_event_mode"; eventMode: boolean })
  | (Common & { action: "console_scan"; tableNo: number; cardId: string; scanAction: "FILE" | "QUARANTINE" })
  | (Common & { action: "reset_game" })
  | (Common & { action: "pause" | "resume" | "ensure_badges" | "kill" });

function boundedText(value: unknown, name: string, max: number, allowEmpty = false): string {
  if (typeof value !== "string") throw new Error(`${name} is required`);
  const result = value.trim();
  if (!allowEmpty && !result) throw new Error(`${name} is required`);
  if (result.length > max) throw new Error(`${name} must be ${max} characters or fewer`);
  return result;
}

function tableNo(value: unknown): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 12) {
    throw new Error("tableNo must identify a table from 1 to 12");
  }
  return Number(value);
}

/** Parse untrusted console JSON before either persistence adapter sees it. */
export function validateFacilitatorCommand(input: unknown): FacilitatorCommand {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Command must be an object");
  const raw = input as Record<string, unknown>;
  if (typeof raw.action !== "string" || !ACTIONS.includes(raw.action as Action)) throw new Error("Unknown action");
  const action = raw.action as Action;
  const reason = boundedText(raw.reason, "reason", 500);
  const idempotencyKey = boundedText(raw.idempotencyKey, "idempotencyKey", 200);
  const actionFields: Record<Action, readonly string[]> = {
    set_phase: ["phase"], pause: [], resume: [], broadcast: ["banner"], adjust: ["tableNo", "amount"],
    force_resolve_outage: ["tableNo"], unlock_green: ["tableNo"], award_badge: ["tableNo", "badge"],
    ensure_badges: [], release_role: ["tableNo", "role"], reset_device: ["deviceId"], kill: [],
    set_active_tables: ["activeTables"], reset_game: [], set_event_mode: ["eventMode"],
    console_scan: ["tableNo", "cardId", "scanAction"],
  };
  const allowed = new Set(["action", "reason", "idempotencyKey", ...actionFields[action]]);
  const unknown = Object.keys(raw).find((key) => !allowed.has(key));
  if (unknown) throw new Error(`Unknown field: ${unknown}`);
  const common = { action, reason, idempotencyKey };

  switch (action) {
    case "set_phase":
      if (typeof raw.phase !== "string" || !PHASES.includes(raw.phase as Phase)) throw new Error("Invalid phase");
      return { ...common, action, phase: raw.phase as Phase };
    case "broadcast":
      return { ...common, action, banner: boundedText(raw.banner, "banner", 500, true) };
    case "adjust": {
      const amount = raw.amount;
      if (typeof amount !== "number" || !Number.isSafeInteger(amount) || Math.abs(amount) > MAX_FACILITATOR_ADJUST_AED) {
        throw new Error(`Adjustment amount must be a whole AED value within ±${MAX_FACILITATOR_ADJUST_AED}`);
      }
      return { ...common, action, tableNo: tableNo(raw.tableNo), amount };
    }
    case "force_resolve_outage":
    case "unlock_green":
      return { ...common, action, tableNo: tableNo(raw.tableNo) };
    case "award_badge":
      if (typeof raw.badge !== "string" || !(raw.badge in BADGE_LABELS)) throw new Error("Invalid badge");
      return { ...common, action, tableNo: tableNo(raw.tableNo), badge: raw.badge as BadgeCode };
    case "release_role":
      if (typeof raw.role !== "string" || !ROLES.includes(raw.role as Role)) throw new Error("Invalid role");
      return { ...common, action, tableNo: tableNo(raw.tableNo), role: raw.role as Role };
    case "reset_device": {
      const deviceId = boundedText(raw.deviceId, "deviceId", 36);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId)) throw new Error("Invalid device UUID");
      return { ...common, action, deviceId };
    }
    case "set_active_tables": {
      const n = raw.activeTables;
      if (typeof n !== "number" || !Number.isInteger(n) || n < ACTIVE_TABLES.min || n > ACTIVE_TABLES.max) {
        throw new Error(`Active tables must be an integer between ${ACTIVE_TABLES.min} and ${ACTIVE_TABLES.max}`);
      }
      return { ...common, action, activeTables: n };
    }
    case "set_event_mode": {
      if (typeof raw.eventMode !== "boolean") throw new Error("eventMode must be a boolean");
      return { ...common, action, eventMode: raw.eventMode };
    }
    case "console_scan": {
      const t = tableNo(raw.tableNo);
      const cardId = boundedText(raw.cardId, "cardId", 64);
      if (!/^[A-Z0-9-]{1,64}$/i.test(cardId)) throw new Error("Invalid cardId");
      if (raw.scanAction !== "FILE" && raw.scanAction !== "QUARANTINE") throw new Error("Invalid scanAction");
      return { ...common, action, tableNo: t, cardId, scanAction: raw.scanAction };
    }
    case "reset_game":
      return { ...common, action };
    case "pause": case "resume": case "ensure_badges": case "kill":
      return { ...common, action };
  }
}
