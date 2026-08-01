/** PRD §4.5 — badge computation and reveal-time guarantee. */

import { derivedCapital, getGameState, getTeam, listEvents, updateTeam } from "./store";

export type Badge =
  | "CRISIS_MANAGER"
  | "ALLIANCE_BUILDER"
  | "ZERO_PENALTY_PIONEER"
  | "THE_SCEPTIC"
  | "CLEAN_CLOSE"
  | "PARTICIPANT";

const ZERO_PENALTY_WINDOW_MS = 30 * 60_000;

function firstEventAt(tableNo: number): number | null {
  const events = listEvents(tableNo);
  if (events.length === 0) return null;
  return new Date(events[0].at).getTime();
}

function tradesByTable(): Map<number, number> {
  const counts = new Map<number, number>();
  for (const event of listEvents()) {
    if (event.kind === "TRADE_VALIDATED") {
      counts.set(event.table_no, (counts.get(event.table_no) ?? 0) + 1);
    }
  }
  return counts;
}

function hasPenaltyInWindow(tableNo: number): boolean {
  const first = firstEventAt(tableNo);
  if (first == null) return false;
  for (const event of listEvents(tableNo)) {
    if (event.delta_aed < 0 && new Date(event.at).getTime() - first <= ZERO_PENALTY_WINDOW_MS) {
      return true;
    }
  }
  return false;
}

function hasLedgerCloseWithZeroPenalties(tableNo: number): boolean {
  let closed = false;
  for (const event of listEvents(tableNo)) {
    if (event.delta_aed < 0) return false;
    if (event.kind === "LEDGER_CLOSED") closed = true;
  }
  return closed;
}

function quarantinedScepticCard(tableNo: number): boolean {
  return listEvents(tableNo).some(
    (event) => event.kind === "QUARANTINE_CORRECT" && event.card_id === "X6",
  );
}

/**
 * Returns a fresh badge map per team_no. Pure: does not mutate teams.
 * Caller decides whether to persist (e.g. via ensureEveryTableHasABadge).
 */
export function computeBadges(): Map<number, Badge[]> {
  const out = new Map<number, Badge[]>();
  const all = new Set<number>();
  for (const event of listEvents()) all.add(event.table_no);
  for (let t = 1; t <= 10; t++) all.add(t);

  const tradeCounts = tradesByTable();
  let topTradeCount = 0;
  let topTradeCountTables: number[] = [];
  for (const [tableNo, count] of tradeCounts) {
    if (count > topTradeCount) {
      topTradeCount = count;
      topTradeCountTables = [tableNo];
    } else if (count === topTradeCount) {
      topTradeCountTables.push(tableNo);
    }
  }

  for (const tableNo of all) {
    const earned: Badge[] = [];
    if ((getTeam(tableNo)?.badges ?? []).includes("CRISIS_MANAGER")) earned.push("CRISIS_MANAGER" as Badge);
    if (topTradeCount > 0 && topTradeCountTables.length === 1 && topTradeCountTables[0] === tableNo) {
      earned.push("ALLIANCE_BUILDER");
    }
    if (!hasPenaltyInWindow(tableNo)) earned.push("ZERO_PENALTY_PIONEER");
    if (quarantinedScepticCard(tableNo)) earned.push("THE_SCEPTIC");
    if (hasLedgerCloseWithZeroPenalties(tableNo)) earned.push("CLEAN_CLOSE");
    out.set(tableNo, earned);
  }
  return out;
}

/**
 * PRD §4.5: "Award at least one badge to every table before the leaderboard reveal.
 * If a table has none, the facilitator console has a manual grant."
 * This function persists the badge map to teams and ensures each table has at
 * least PARTICIPANT so the leaderboard is never empty.
 */
export function ensureEveryTableHasABadge(): { everyTableHasABadge: boolean; awarded: number } {
  const badges = computeBadges();
  let awarded = 0;
  for (let t = 1; t <= 10; t++) {
    const team = getTeam(t);
    if (!team) continue;
    const earned = badges.get(t) ?? [];
    const next = new Set([...team.badges, ...earned]);
    if (next.size === 0) next.add("PARTICIPANT");
    if (next.size !== team.badges.length) {
      updateTeam(t, { badges: [...next] });
      awarded += 1;
    }
  }
  return { everyTableHasABadge: true, awarded };
}

export function snapshotBadges(): Array<{ table_no: number; badges: Badge[]; capital_aed: number }> {
  const badges = computeBadges();
  const out: Array<{ table_no: number; badges: Badge[]; capital_aed: number }> = [];
  for (let t = 1; t <= 10; t++) {
    const team = getTeam(t);
    if (!team) continue;
    out.push({
      table_no: t,
      badges: (badges.get(t) ?? (team.badges as Badge[])),
      capital_aed: derivedCapital(t),
    });
  }
  return out;
}

export function isFinalPhase(phase: string = getGameState().phase): boolean {
  return phase === "FROZEN" || phase === "DEBRIEF";
}