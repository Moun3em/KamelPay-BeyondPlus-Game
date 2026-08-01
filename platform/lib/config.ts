/** Event economy and config — values from cards_seed.json / PRD §4.2 only. */

export const ECONOMY = {
  starting_capital: 1_000_000,
  file_valid_own: 50_000,
  file_foreign_rejected: 0,
  quarantine_invalid_correct: 10_000,
  quarantine_valid_incorrect: -25_000,
  trade_network_bonus: 5_000,
  outage_tick_penalty: -1_000,
  ledger_close_bonus: 75_000,
  outage_hard_floor: -150_000,
  display_floor: 100_000,
  green: {
    "GRN-01": 25_000,
    "GRN-02": 30_000,
    "GRN-02-travel": 20_000,
    "GRN-03": 15_000,
    "GRN-05": 20_000,
  },
  blue: {
    "BLU-01": 40_000,
    "BLU-02": 35_000,
    "BLU-03": 10_000,
  },
} as const;

/** Runtime-scoped active tables. The pack prints 10; the facilitator can
 * bring 3–10 into play (first N tables). Never regenerates PINs. */
export const ACTIVE_TABLES = {
  min: 3,
  max: 10,
  default: 10,
} as const;

export const PHASES = [
  "LOBBY",
  "TUTORIAL",
  "A",
  "B",
  "C",
  "FROZEN",
  "DEBRIEF",
] as const;

export type Phase = (typeof PHASES)[number];

export const PHASE_DURATIONS_MS: Record<string, number> = {
  TUTORIAL: 3 * 60_000,
  A: 15 * 60_000,
  B: 25 * 60_000,
  C: 20 * 60_000,
};

/**
 * Event Mode announcements — factual phase messages broadcast to player
 * phones automatically when the timeline transitions (Event Mode only).
 * No regulatory claims; plain phase guidance.
 */
export const EVENT_PHASE_ANNOUNCEMENTS: Partial<Record<Phase, string>> = {
  TUTORIAL: "Phase TUTORIAL — practice scan: try a card, learn the scanner and the decision.",
  A: "Phase A — Internal Audit: scanning is open. Read each invoice, then FILE or QUARANTINE.",
  B: "Phase B — Trading is open: OPS & Procurement, return foreign invoices to their owners via the ASP for a network bonus.",
  C: "Phase C — Outages are striking. CIOs: fix your systems before the capital drains.",
  FROZEN: "Game over — the leaderboard is frozen. Well played!",
};

export const ROLES = [
  "CFO",
  "TAX",
  "CIO",
  "PROCUREMENT",
  "OPS",
  "ALL_ROLES",
] as const;

export type Role = (typeof ROLES)[number];

/** Map seed role names → short role codes used in devices.role */
export const ROLE_LABELS: Record<string, string> = {
  CFO: "CFO",
  TAX: "Tax & Compliance",
  CIO: "CIO",
  PROCUREMENT: "Procurement",
  OPS: "Operations",
  ALL_ROLES: "All roles (single device)",
};

export const REQUIRED_ROLES = ["CFO", "TAX", "CIO"] as const;

export const OUTAGE_ANSWER = "1-3-4-2-5";

export function getConfig() {
  return {
    domain: process.env.NEXT_PUBLIC_EVENT_DOMAIN ?? "",
    eventDateIso: process.env.NEXT_PUBLIC_EVENT_DATE ?? "",
    facilitatorPin: process.env.FACILITATOR_PIN ?? "FACILITATE",
    region: process.env.VERCEL_REGION ?? "fra1",
  };
}
