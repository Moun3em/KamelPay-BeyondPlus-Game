import { getTick, getTableVersion } from "@/lib/sse";
import { getGameState, listEvents, listTeams, derivedCapital } from "@/lib/store";
import { streamSnapshotPg } from "@/lib/store.pg";
import { selectStoreKind } from "@/lib/store.interface";
import { elapsedMs, remainingInPhaseMs, formatClock } from "@/lib/engines/clock";
import { ECONOMY } from "@/lib/config";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tableNo = new URL(req.url).searchParams.get("table");
  const encoder = new TextEncoder();
  const kind = selectStoreKind();
  let lastVersion = -1;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      send({ type: "hello", at: Date.now() });

      const interval = setInterval(async () => {
        if (closed) return clearInterval(interval);
        try {
          const tick = await getTick();
          const version = tableNo
            ? Math.max(tick.version, await getTableVersion(Number(tableNo)))
            : tick.version;
          if (version === lastVersion) return send({ type: "ping", at: Date.now() });
          lastVersion = version;
          const snapshot = kind === "postgres"
            ? await streamSnapshotPg()
            : {
                game: getGameState(),
                teams: listTeams().map((team) => ({
                  table_no: team.table_no,
                  capital_aed: derivedCapital(team.table_no),
                  badges: team.badges,
                })),
                recent: listEvents().slice(-8).reverse().map((event) => ({
                  table_no: event.table_no,
                  kind: event.kind,
                  delta_aed: event.delta_aed,
                })),
              };
          const teams = snapshot.teams
            .map((team) => ({
              ...team,
              display_aed: Math.max(ECONOMY.display_floor, team.capital_aed),
            }))
            .sort((a, b) => b.capital_aed - a.capital_aed);
          send({
            type: "tick",
            version,
            phase: snapshot.game.phase,
            banner: snapshot.game.narrative_banner,
            remaining_ms: remainingInPhaseMs(snapshot.game),
            elapsed_ms: elapsedMs(snapshot.game),
            clock: formatClock(remainingInPhaseMs(snapshot.game)),
            paused: Boolean(snapshot.game.clock_paused_at),
            teams,
            recent: snapshot.recent,
          });
        } catch {
          send({ type: "error", message: "tick failed" });
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
