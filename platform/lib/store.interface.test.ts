import { afterEach, describe, expect, it, vi } from "vitest";
import { selectStoreKind } from "./store.interface";

afterEach(() => vi.unstubAllEnvs());

function clearUrls() {
  vi.stubEnv("POSTGRES_URL", "");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("POSTGRES_PRISMA_URL", "");
}

describe("persistence selection", () => {
  it("requires explicit memory mode outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("GAME_STORE", "");
    clearUrls();
    expect(() => selectStoreKind()).toThrow(/GAME_STORE=memory/);
    vi.stubEnv("GAME_STORE", "memory");
    expect(selectStoreKind()).toBe("memory");
  });

  it("fails closed instead of selecting memory in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GAME_STORE", "memory");
    clearUrls();
    expect(() => selectStoreKind()).toThrow(/Postgres/);
  });

  it("selects postgres in production only with POSTGRES_URL", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GAME_STORE", "");
    clearUrls();
    vi.stubEnv("POSTGRES_URL", "postgres://configured-without-connecting");
    expect(selectStoreKind()).toBe("postgres");
  });

  it("does not advertise unsupported database URL aliases", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GAME_STORE", "");
    clearUrls();
    vi.stubEnv("DATABASE_URL", "postgres://unsupported-alias");
    vi.stubEnv("POSTGRES_PRISMA_URL", "postgres://unsupported-alias");
    expect(() => selectStoreKind()).toThrow(/POSTGRES_URL/);
  });
});
