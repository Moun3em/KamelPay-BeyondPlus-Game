import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  DEVICE_COOKIE,
  SESSION_COOKIE,
  parseRole,
  sessionCookieOptions,
  sessionCookieValue,
} from "@/lib/session";
import { cookieValue } from "@/lib/auth";
import { friendlyError } from "@/lib/error-response";
import {
  appendEvent,
  claimDevice,
  getGameState,
  getTeam,
  listDevices,
  verifyPin,
  withMemoryTransaction,
} from "@/lib/store";
import {
  claimDevicePg,
  getActiveTablesPg,
  getTeamPg,
  listDevicesPg,
  MutationError,
  verifyPinPg,
} from "@/lib/store.pg";
import { selectStoreKind } from "@/lib/store.interface";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const raw: unknown = await req.json();
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return NextResponse.json({ error: "Invalid join command" }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const allowed = new Set(["tableNo", "pin", "role"]);
    if (Object.keys(body).some((key) => !allowed.has(key)) ||
        typeof body.tableNo !== "number" || !Number.isInteger(body.tableNo) || body.tableNo < 1 || body.tableNo > 10 ||
        typeof body.pin !== "string" || !/^[A-Z0-9]{6}$/.test(body.pin) || typeof body.role !== "string") {
      return NextResponse.json({ error: "Invalid table, PIN, or role" }, { status: 400 });
    }
    const tableNo = body.tableNo;
    const role = parseRole(body.role);
    if (!role) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

    const kind = selectStoreKind();
    const activeTables = kind === "postgres"
      ? await getActiveTablesPg()
      : getGameState().activeTables;
    if (tableNo > activeTables) {
      return NextResponse.json({
        error: `T-${String(tableNo).padStart(2, "0")} is not in play today — only T-01 to T-${String(activeTables).padStart(2, "0")} are active`,
      }, { status: 409 });
    }
    const pinOk = body.pin && (kind === "postgres"
      ? await verifyPinPg(tableNo, body.pin)
      : verifyPin(tableNo, body.pin));
    if (!pinOk) return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });

    const priorDeviceId = cookieValue(req, DEVICE_COOKIE);
    const deviceId = priorDeviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(priorDeviceId)
      ? priorDeviceId
      : uuidv4();
    if (kind === "postgres") {
      await claimDevicePg(deviceId, tableNo, role);
    } else {
      await withMemoryTransaction(async () => {
        const claimed = claimDevice(deviceId, tableNo, role);
        if (!claimed.ok) throw new MutationError(claimed.error, 409);
        appendEvent({
          table_no: tableNo,
          actor_role: role,
          kind: "ROLE_CLAIMED",
          delta_aed: 0,
          idempotency_key: `role:${deviceId}:${tableNo}:${role}`,
        });
      });
    }
    await publishTable(tableNo);

    const session = { deviceId, tableNo, role };
    const response = NextResponse.json({
      ok: true,
      session,
      team: kind === "postgres" ? await getTeamPg(tableNo) : getTeam(tableNo),
      devices: kind === "postgres" ? await listDevicesPg(tableNo) : listDevices(tableNo),
    });
    response.cookies.set(DEVICE_COOKIE, deviceId, sessionCookieOptions());
    response.cookies.set(SESSION_COOKIE, sessionCookieValue(session), sessionCookieOptions());
    return response;
  } catch (error) {
    if (error instanceof MutationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return friendlyError("[api/join]", error, "Could not join table");
  }
}

export async function GET(req: Request) {
  const tableNo = Number(new URL(req.url).searchParams.get("t"));
  if (!tableNo) return NextResponse.json({ error: "t required" }, { status: 400 });
  const kind = selectStoreKind();
  const team = kind === "postgres" ? await getTeamPg(tableNo) : getTeam(tableNo);
  if (!team) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const devices = kind === "postgres" ? await listDevicesPg(tableNo) : listDevices(tableNo);
  return NextResponse.json({
    table_no: tableNo,
    taken_roles: devices.map((device) => device.role),
    device_count: devices.length,
  });
}
