export type BadgeCode =
  | "CRISIS_MANAGER"
  | "ALLIANCE_BUILDER"
  | "ZERO_PENALTY_PIONEER"
  | "THE_SCEPTIC"
  | "CLEAN_CLOSE";

export const BADGE_LABELS: Record<BadgeCode, string> = {
  CRISIS_MANAGER: "Crisis Manager",
  ALLIANCE_BUILDER: "Alliance Builder",
  ZERO_PENALTY_PIONEER: "Zero-Penalty Pioneer",
  THE_SCEPTIC: "The Sceptic",
  CLEAN_CLOSE: "Clean Close",
};

/** Facilitator can grant any badge; computed badges use event rules. */
export function isBadgeCode(x: string): x is BadgeCode {
  return x in BADGE_LABELS;
}
