import { listEvents, listTeams, type EventRow } from "./store";

/**
 * Debrief data view (PRD §10): the numbers the MC needs on the projection
 * at the end — total fines, X3 direct-email cards wrongly filed, and the
 * GRN-04 time-to-close comparison (the EPPA "Patterns" sell).
 *
 * Pure over the event ledger; the store adapters feed it.
 */

export type Debrief = {
  total_fines_aed: number;
  fines_by_table: { table_no: number; fines_aed: number }[];
  x3_wrongly_filed: number;
  grn04: {
    played: { tables: number[]; avg_close_min: number | null };
    not_played: { tables: number[]; avg_close_min: number | null };
  };
};

function finesOf(events: EventRow[]): number {
  return events.reduce((sum, e) => (e.delta_aed < 0 ? sum + Math.abs(e.delta_aed) : sum), 0);
}

function closeTimeMin(events: EventRow[], tableNo: number, clockStartMs: number): number | null {
  const closed = events.find((e) => e.table_no === tableNo && e.kind === "LEDGER_CLOSED");
  if (!closed || !clockStartMs) return null;
  return (new Date(closed.at).getTime() - clockStartMs) / 60_000;
}

export function computeDebrief(opts: {
  clockStartedAt: string | null;
  events?: EventRow[];
  tableNos?: number[];
}): Debrief {
  const events = opts.events ?? listEvents();
  const tables = opts.tableNos ?? listTeams().map((t) => t.table_no);
  const clockStartMs = opts.clockStartedAt ? new Date(opts.clockStartedAt).getTime() : 0;

  const total_fines_aed = finesOf(events);
  const fines_by_table = tables
    .map((table_no) => ({ table_no, fines_aed: finesOf(events.filter((e) => e.table_no === table_no)) }))
    .sort((a, b) => b.fines_aed - a.fines_aed);

  const x3_wrongly_filed = events.filter(
    (e) => e.kind === "FILE_INVALID" && e.card_id != null && e.card_id.includes("-X3"),
  ).length;

  const grn04Played = new Set(
    events.filter((e) => e.kind === "GREEN_PLAYED" && e.card_id != null && /-04$/.test(e.card_id))
      .map((e) => e.table_no),
  );
  const playedTables = tables.filter((t) => grn04Played.has(t));
  const notPlayedTables = tables.filter((t) => !grn04Played.has(t));

  const avgClose = (ts: number[]) => {
    const times = ts.map((t) => closeTimeMin(events, t, clockStartMs)).filter((v): v is number => v != null);
    return times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
  };

  return {
    total_fines_aed,
    fines_by_table,
    x3_wrongly_filed,
    grn04: {
      played: { tables: playedTables, avg_close_min: avgClose(playedTables) },
      not_played: { tables: notPlayedTables, avg_close_min: avgClose(notPlayedTables) },
    },
  };
}
