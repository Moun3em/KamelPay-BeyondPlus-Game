import { NextResponse } from "next/server";
import { loadSeedIntoMemory, usingMemoryStore } from "@/lib/store";

export const runtime = "nodejs";

/** Dev helper: re-seed memory store. Refuses if POSTGRES_URL is set (use pnpm seed). */
export async function POST() {
  if (!usingMemoryStore()) {
    return NextResponse.json(
      {
        error:
          "POSTGRES_URL is set — run `pnpm seed` against Postgres instead of this route.",
      },
      { status: 400 },
    );
  }
  const result = loadSeedIntoMemory();
  return NextResponse.json({ ok: true, store: "memory", ...result });
}
