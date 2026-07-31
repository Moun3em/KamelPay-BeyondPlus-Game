import { NextRequest, NextResponse } from "next/server";

/**
 * Self-tick middleware. Vercel Hobby plan refuses `* * * * *` cron
 * schedules (daily-cron cap), so the platform drives its own
 * timeline / outage tick from the request hot path. The actual tick
 * lives in `lib/db.ts#selfTickOutageOnce` and is throttled to once
 * per ~5s per runtime instance, so this middleware is cheap to call
 * on every request.
 */
export const config = {
  matcher: ["/api/:path*"],
};

export async function middleware(req: NextRequest) {
  if (process.env.GAME_STORE === "postgres") {
    const { selfTickOutageOnce } = await import("./lib/db");
    // Fire-and-forget; the helper has its own deduping.
    selfTickOutageOnce().catch(() => undefined);
  }
  return NextResponse.next();
}