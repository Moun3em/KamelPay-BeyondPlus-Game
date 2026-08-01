export type StoreKind = "memory" | "postgres";

export function postgresUrl(): string | null {
  return process.env.POSTGRES_URL || null;
}

/**
 * Persistence is deliberately explicit. Production can only use Postgres;
 * process memory is available solely when dev/test opts in with GAME_STORE=memory.
 */
export function selectStoreKind(): StoreKind {
  const configuredUrl = postgresUrl();
  if (process.env.NODE_ENV === "production") {
    if (!configuredUrl || process.env.GAME_STORE === "memory") {
      throw new Error("Production requires POSTGRES_URL and Postgres persistence");
    }
    return "postgres";
  }
  if (process.env.GAME_STORE === "memory") return "memory";
  if (configuredUrl) return "postgres";
  throw new Error(
    "Persistence is not configured; set GAME_STORE=memory explicitly for dev/test",
  );
}
