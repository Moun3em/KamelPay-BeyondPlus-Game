import { NextResponse } from "next/server";
import { loadSeedIntoMemory } from "@/lib/store";
import { selectStoreKind } from "@/lib/store.interface";

export const runtime = "nodejs";

/** Explicit dev/test-only reset. It is unavailable in production regardless of DB config. */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (selectStoreKind() !== "memory") {
    return NextResponse.json({ error: "Memory seed route requires GAME_STORE=memory" }, { status: 400 });
  }
  const result = loadSeedIntoMemory();
  return NextResponse.json({ ok: true, store: "memory", ...result });
}
