import { getTick, getTableVersion } from "@/lib/sse";
import { getGameState, listEvents, listTeams, derivedCapital } from "@/lib/store";
import { elapsedMs, remainingInPhaseMs, formatClock } from "@/lib/engines/clock";
import { ECONOMY } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tableNo = url.searchParams.get("table");
  const encoder = new TextEncoder();

  let lastVersion = -1;
  let closed = false;
  let lastOutageTick = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "hello", at: Date.now() });

      const interval = setInterval(async () => {
        if (closed) {
          clearInterval(interval);
          return;
        }
        try {
          const gs = getGameState();
          if (gs.phase === "C" && Date.now() - lastOutageTick > 10_000) {
            lastOutageTick = Date.now();
            await fetch(
              new URL("/api/outage", req.url).toString(),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "tick" }),
              },
            ).catch(() => undefined);
          }

          const tick = await getTick();
          const tableV = tableNo
            ? await getTableVersion(Number(tableNo))
            : tick.version;
          const version = tableNo ? tableV : tick.version;
          if (version === lastVersion) {
            send({ type: "ping", at: Date.now() });
            return;
          }
          lastVersion = version;
          const teams = listTeams()
            .map((t) => ({
              table_no: t.table_no,
              capital_aed: derivedCapital(t.table_no),
              display_aed: Math.max(
                ECONOMY.display_floor,
                derivedCapital(t.table_no),
              ),
              badges: t.badges,
            }))
            .sort((a, b) => b.capital_aed - a.capital_aed);

          const recent = listEvents()
            .slice(-8)
            .reverse()
            .map((e) => ({
              table_no: e.table_no,
              kind: e.kind,
              delta_aed: e.delta_aed,
            }));

          send({
            type: "tick",
            version,
            phase: gs.phase,
            banner: gs.narrative_banner,
            remaining_ms: remainingInPhaseMs(gs),
            elapsed_ms: elapsedMs(gs),
            clock: formatClock(remainingInPhaseMs(gs)),
            paused: Boolean(gs.clock_paused_at),
            teams,
            recent,
          });
        } catch {
          send({ type: "error", message: "tick failed" });
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          /* ignore */
        }
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
