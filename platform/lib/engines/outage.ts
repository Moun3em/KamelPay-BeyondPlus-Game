import { ECONOMY } from "../config";

/**
 * Rank-based outage offset into Phase C (0–180s).
 * Leading tables (rank 1) get earlier/harder; trailing get later + hint flag.
 */
export function outageOffsetSeconds(rank: number, tableCount: number): {
  offsetSec: number;
  extraHint: boolean;
} {
  const clamped = Math.max(1, Math.min(rank, tableCount));
  // rank 1 → 0s, last → 180s
  const offsetSec = Math.round(
    ((clamped - 1) / Math.max(1, tableCount - 1)) * 180,
  );
  const extraHint = clamped > Math.ceil(tableCount / 2);
  return { offsetSec, extraHint };
}

export function outageCapRemaining(outageLossAed: number): number {
  // outageLossAed is negative cumulative
  return ECONOMY.outage_hard_floor - outageLossAed;
}
