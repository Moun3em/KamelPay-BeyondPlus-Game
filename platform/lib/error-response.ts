import { NextResponse } from "next/server";

/**
 * Convert an unhandled error into a friendly, non-revealing JSON
 * response. Logs full detail to stderr (visible to the operator /
 * Vercel log dashboard) but never leaks the stack or driver message
 * to the client. This protects against the AGENTS.md §7 rule (colour
 * is never the only signal — and *likewise* the underlying technical
 * detail is never the only signal) and reduces information disclosure
 * for the production event.
 *
 * Usage:
 *   } catch (error) {
 *     if (error instanceof AuthError) return NextResponse.json(...);
 *     return friendlyError("[api/scan]", error, "Could not process scan");
 *   }
 */
export function friendlyError(
  tag: string,
  error: unknown,
  publicMessage = "Action failed",
  status = 500,
): NextResponse {
  console.error(tag, "unhandled error:", error);
  return NextResponse.json({ error: publicMessage }, { status });
}