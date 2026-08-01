import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnostic endpoint: returns the *shape* of the Postgres URL the
 * runtime is using, with the password and user redacted. Use this
 * to verify Vercel env vars landed correctly after edits.
 */
export async function GET() {
  const nonPooled = process.env.POSTGRES_URL_NON_POOLING ?? null;
  const pooled = process.env.POSTGRES_URL ?? null;

  function shape(url: string | null): Record<string, unknown> | null {
    if (!url) return null;
    try {
      const u = new URL(url);
      const user = u.username;
      const masked = user ? `${user.slice(0, 1)}${"*".repeat(Math.max(0, user.length - 1))}` : null;
      return {
        protocol: u.protocol,
        username: masked,
        hostname: u.hostname,
        port: u.port,
        pathname: u.pathname,
        search: u.search,
        has_pooler_marker: u.hostname.includes("-pooler."),
        raw_length: url.length,
        raw_sha_prefix: createHash("sha256").update(url).digest("hex").slice(0, 8),
      };
    } catch {
      return { raw_length: url.length, raw_sha_prefix: createHash("sha256").update(url).digest("hex").slice(0, 8) };
    }
  }

  return NextResponse.json({
    node_env: process.env.NODE_ENV,
    POSTGRES_URL_NON_POOLING_present: !!nonPooled,
    POSTGRES_URL_NON_POOLING_shape: shape(nonPooled),
    POSTGRES_URL_present: !!pooled,
    POSTGRES_URL_shape: shape(pooled),
    game_store: process.env.GAME_STORE ?? null,
  });
}