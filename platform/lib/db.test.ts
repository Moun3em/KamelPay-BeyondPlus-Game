import { describe, expect, it, vi } from "vitest";
import { runTransaction } from "./db";

describe("database transactions", () => {
  it("runs BEGIN, work, and COMMIT on one checked-out client", async () => {
    const calls: string[] = [];
    const client = {
      query: vi.fn(async (text: string) => {
        calls.push(text);
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) };

    await expect(
      runTransaction(pool, async (tx) => {
        expect(tx).toBe(client);
        await tx.query("WORK");
        return 7;
      }),
    ).resolves.toBe(7);
    expect(calls).toEqual(["BEGIN", "WORK", "COMMIT"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the same client on failure", async () => {
    const calls: string[] = [];
    const client = {
      query: vi.fn(async (text: string) => {
        calls.push(text);
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    const pool = { connect: vi.fn(async () => client) };

    await expect(
      runTransaction(pool, async (tx) => {
        await tx.query("WORK");
        throw new Error("injected");
      }),
    ).rejects.toThrow("injected");
    expect(calls).toEqual(["BEGIN", "WORK", "ROLLBACK"]);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("discards a client when rollback itself fails", async () => {
    const original = new Error("mutation failed");
    const client = {
      query: vi.fn(async (text: string) => {
        if (text === "WORK") throw original;
        if (text === "ROLLBACK") throw new Error("connection lost");
        return { rows: [] };
      }),
      release: vi.fn(),
    };
    await expect(runTransaction({ connect: async () => client }, async (tx) => {
      await tx.query("WORK");
    })).rejects.toBe(original);
    expect(client.release).toHaveBeenCalledWith(expect.any(Error));
  });
});
