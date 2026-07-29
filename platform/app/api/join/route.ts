import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from "uuid";
import {
  DEVICE_COOKIE,
  SESSION_COOKIE,
  parseRole,
  sessionCookieValue,
} from "@/lib/session";
import {
  claimDevice,
  getTeam,
  listDevices,
  verifyPin,
  appendEvent,
} from "@/lib/store";
import { publishTable } from "@/lib/sse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    tableNo?: number;
    pin?: string;
    role?: string;
    deviceId?: string;
  };

  const tableNo = Number(body.tableNo);
  if (!Number.isInteger(tableNo) || tableNo < 1 || tableNo > 12) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }
  if (!body.pin || !verifyPin(tableNo, body.pin)) {
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  const role = body.role ? parseRole(body.role) : null;
  if (!role) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const jar = await cookies();
  const deviceId = body.deviceId || jar.get(DEVICE_COOKIE)?.value || uuidv4();

  const claimed = claimDevice(deviceId, tableNo, role);
  if (!claimed.ok) {
    return NextResponse.json({ error: claimed.error }, { status: 409 });
  }

  appendEvent({
    table_no: tableNo,
    actor_role: role,
    kind: "ROLE_CLAIMED",
    delta_aed: 0,
    meta: { deviceId },
  });
  await publishTable(tableNo);

  const session = { deviceId, tableNo, role };
  jar.set(DEVICE_COOKIE, deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  jar.set(SESSION_COOKIE, sessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  const team = getTeam(tableNo)!;
  const devices = listDevices(tableNo);

  return NextResponse.json({
    ok: true,
    session,
    team: { table_no: team.table_no, capital_aed: team.capital_aed },
    devices: devices.map((d) => ({ role: d.role, device_id: d.device_id })),
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tableNo = Number(url.searchParams.get("t"));
  if (!tableNo) {
    return NextResponse.json({ error: "t required" }, { status: 400 });
  }
  const team = getTeam(tableNo);
  if (!team) return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  const devices = listDevices(tableNo);
  return NextResponse.json({
    table_no: tableNo,
    taken_roles: devices.map((d) => d.role),
    device_count: devices.length,
  });
}
