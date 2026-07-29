import { NextResponse } from "next/server";
import { executeScan } from "@/lib/scan";
import type { CardAction } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    qr?: string;
    cardId?: string;
    deviceId?: string;
    action?: CardAction;
    idempotencyKey?: string;
  };

  if (!body.deviceId || !body.idempotencyKey || !body.action) {
    return NextResponse.json(
      { ok: false, error: "deviceId, action, idempotencyKey required" },
      { status: 400 },
    );
  }
  if (body.action !== "FILE" && body.action !== "QUARANTINE") {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }
  if (!body.qr && !body.cardId) {
    return NextResponse.json(
      { ok: false, error: "Provide qr or cardId" },
      { status: 400 },
    );
  }

  const result = await executeScan({
    qr: body.qr,
    cardId: body.cardId,
    deviceId: body.deviceId,
    action: body.action,
    idempotencyKey: body.idempotencyKey,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: result.status });
  }
  return NextResponse.json(result);
}
