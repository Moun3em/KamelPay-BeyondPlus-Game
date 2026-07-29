import { NextResponse } from "next/server";
import { OUTAGE_ANSWER } from "@/lib/config";
import {
  AuthError,
  authenticateDeviceToken,
  deviceTokenFromRequest,
} from "@/lib/auth";
import {
  getDevice,
} from "@/lib/store";
import { MemoryOutageError, solveMemoryOutage } from "@/lib/outage.store";
import { selectStoreKind } from "@/lib/store.interface";
import {
  getDevicePg,
  MutationError,
  solveOutagePg,
} from "@/lib/store.pg";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid outage command" }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const allowed = new Set(["action", "answer", "idempotencyKey"]);
    if (Object.keys(body).some((key) => !allowed.has(key)) || body.action !== "solve" ||
        typeof body.answer !== "string" || body.answer.length < 1 || body.answer.length > 200 ||
        typeof body.idempotencyKey !== "string" || body.idempotencyKey.trim().length < 1 || body.idempotencyKey.length > 200) {
      return NextResponse.json({ error: "Valid solve answer and bounded idempotencyKey required" }, { status: 400 });
    }
    const kind = selectStoreKind();


    if (body.action === "solve") {
      const session = await authenticateDeviceToken(
        deviceTokenFromRequest(req),
        kind === "postgres" ? getDevicePg : async (deviceId) => getDevice(deviceId),
        ["CIO"],
      );
      const normalized = String(body.answer ?? "").trim().replace(/\s+/g, "");
      const idempotencyKey = String(body.idempotencyKey ?? "").trim();
      if (!idempotencyKey || idempotencyKey.length > 200) {
        return NextResponse.json({ error: "Bounded idempotencyKey required" }, { status: 400 });
      }
      const result = kind === "postgres"
        ? await solveOutagePg(session, normalized, normalized === OUTAGE_ANSWER, idempotencyKey)
        : await solveMemoryOutage(session, normalized, normalized === OUTAGE_ANSWER, idempotencyKey);
      await publishTable(session.tableNo);
      if (!result.ok) {
        return NextResponse.json({
          ...result,
          hint: result.tries >= (result.extraHint ? 2 : 3)
            ? "Hint: supplier-issued invoice routing starts at Corner 1, then the supplier ASP."
            : null,
          force: result.tries >= 5
            ? "Five wrong attempts — ask a facilitator to force-resolve from /console."
            : null,
        });
      }
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof MutationError || error instanceof MemoryOutageError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
