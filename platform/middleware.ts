import { NextRequest, NextResponse } from "next/server";

/**
 * Self-tick middleware. Vercel Hobby plan refuses `* * * * *` cron
 * schedules (daily-cron cap), so the platform drives its own
 * timeline / outage tick from the request hot path.
 *
 * We *cannot* import @vercel/postgres at module top-level — webpack
 * chokes on node:crypto when bundling middleware. We also can't
 * trigger Next.js' edge runtime for this route. The fix is a
 * dynamic, lazy import of the DB module inside the request handler,
 * guarded by runtime so the bundle is not affected at build time.
 */
export const config = {
  matcher: ["/api/:path*"],
};

export async function middleware(_req: NextRequest) {
  // Skip on Hobby-plan regions where postgres is not configured:
  // the module itself will throw requirePostgresUrl() and we
  // would have no recovery. Guard up-front.
  if (process.env.GAME_STORE !== "postgres") {
    return NextResponse.next();
  }
  if (!process.env.POSTGRES_URL) {
    return NextResponse.next();
  }
  try {
    const db = await import("./lib/db");
    db.selfTickOutageOnce().catch(() => undefined);
  } catch {
    // Swallow: the tick is opportunistic, not on the critical path.
  }
  return NextResponse.next();
}

export const runtime = "nodejs";