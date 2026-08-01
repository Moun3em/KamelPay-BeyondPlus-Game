import { describe, expect, it } from "vitest";
import { splitSqlStatements } from "../scripts/seed";

describe("schema application", () => {
  it("does not discard a CREATE statement preceded by SQL comments", () => {
    const statements = splitSqlStatements(`
      -- schema heading
      -- another comment
      CREATE TABLE cards (id TEXT PRIMARY KEY);
      -- next table
      CREATE TABLE teams (id INT PRIMARY KEY);
    `);

    expect(statements).toEqual([
      "CREATE TABLE cards (id TEXT PRIMARY KEY)",
      "CREATE TABLE teams (id INT PRIMARY KEY)",
    ]);
  });

  it("keeps semicolons inside quoted strings", () => {
    expect(splitSqlStatements("INSERT INTO x VALUES ('a;b'); SELECT 1;"))
      .toEqual(["INSERT INTO x VALUES ('a;b')", "SELECT 1"]);
  });
});
