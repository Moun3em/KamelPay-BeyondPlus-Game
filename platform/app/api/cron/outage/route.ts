import { NextResponse } from "next/server";
import { AuthError, requireServerTick } from "@/lib/auth";
import { abortableSleep, runOutageCron, tickOutagesOnce } from "@/lib/outage.catchup";
import { publishGlobal } from "@/lib/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Vercel Cron invokes this GET with Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  try {
    requireServerTick(req.headers.get("authorization"));
    const result = await runOutageCron({
      tick: () => tickOutagesOnce(new Date()),
      sleep: abortableSleep,
      publish: publishGlobal,
      signal: req.signal,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
