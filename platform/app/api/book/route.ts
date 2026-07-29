import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Booking intake — MUST NOT write to the game database.
 * Forwards to BOOKING_WEBHOOK_URL when configured.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    name?: string;
    email?: string;
    org?: string;
  };
  if (!body.email || !body.name) {
    return NextResponse.json({ error: "name and email required" }, { status: 400 });
  }

  const webhook = process.env.BOOKING_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "five-corner-book",
        name: body.name,
        email: body.email,
        org: body.org ?? null,
        at: new Date().toISOString(),
      }),
    });
  } else {
    console.info("[book] captured (no webhook)", {
      email: body.email,
      org: body.org,
    });
  }

  return NextResponse.json({ ok: true });
}
