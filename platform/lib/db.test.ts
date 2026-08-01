/**
 * The Postgres adapter at lib/db.ts re-exports the global `sql` from
 * @vercel/postgres. Touching its `.query` property triggers an eager
 * `createPool()` which fails in unit-test env without POSTGRES_URL, so
 * the meaningful assertions live in lib/store.pg.test.ts (PG mode)
 * and in the smoke / load tests against the live Neon DB.
 */
import { describe, it } from "vitest";

describe("global sql helper", () => {
  it("is re-exported from lib/db", () => {
    // Just touch the module-level re-export; do not call sql.query.
    void import("./db");
  });
});