import { NextResponse } from "next/server";
import { AuthError, authenticateDeviceToken, deviceTokenFromRequest } from "@/lib/auth";
import { executeMemoryScan } from "@/lib/scan";
import { selectStoreKind } from "@/lib/store.interface";
import { getDevice } from "@/lib/store";
import { executeScanPg, getDevicePg, MutationError } from "@/lib/store.pg";
import { friendlyError } from "@/lib/error-response";
import type { CardAction } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ ok: false, error: "Invalid scan command" }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const allowed = new Set(["qr", "cardId", "action", "idempotencyKey"]);
    const hasQr = typeof body.qr === "string" && body.qr.length >= 1 && body.qr.length <= 500;
    const hasCardId = typeof body.cardId === "string" && /^[A-Z0-9-]{1,64}$/i.test(body.cardId);
    if (Object.keys(body).some((key) => !allowed.has(key)) || hasQr === hasCardId ||
        (body.action !== "FILE" && body.action !== "QUARANTINE") ||
        typeof body.idempotencyKey !== "string" || body.idempotencyKey.length < 1 || body.idempotencyKey.length > 200) {
      return NextResponse.json(
        { ok: false, error: "Exactly one valid qr/cardId, action, and idempotencyKey required" },
        { status: 400 },
      );
    }

    const kind = selectStoreKind();
    const session = await authenticateDeviceToken(
      deviceTokenFromRequest(req),
      kind === "postgres"
        ? getDevicePg
        : async (deviceId) => getDevice(deviceId),
      ["TAX"],
    );
    const input = {
      qr: hasQr ? body.qr as string : undefined,
      cardId: hasCardId ? body.cardId as string : undefined,
      action: body.action as CardAction,
      idempotencyKey: body.idempotencyKey as string,
    };
    const result = kind === "postgres"
      ? await executeScanPg(session, input)
      : await executeMemoryScan(session, input);
    if (!result.ok) return NextResponse.json(result, { status: result.status });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError || error instanceof MutationError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return friendlyError("[api/scan]", error, "Could not process scan");
  }
}
