import { describe, expect, it } from "vitest";
import { validateFacilitatorCommand } from "./facilitator";

describe("facilitator mutation validation", () => {
  it("requires a reason for every facilitator action", () => {
    for (const action of [
      "set_phase", "pause", "resume", "broadcast", "adjust",
      "force_resolve_outage", "unlock_green", "award_badge",
      "ensure_badges", "release_role", "reset_device", "kill",
    ]) {
      expect(() => validateFacilitatorCommand({ action, reason: "", idempotencyKey: crypto.randomUUID() })).toThrow(/reason/i);
    }
  });

  it("rejects non-finite, fractional, and over-limit capital adjustments", () => {
    for (const amount of [Number.NaN, Infinity, -Infinity, 1.5, 1_000_001, -1_000_001]) {
      expect(() => validateFacilitatorCommand({ action: "adjust", reason: "correction", amount, tableNo: 1, idempotencyKey: crypto.randomUUID() }))
        .toThrow(/amount/i);
    }
  });

  it("accepts a bounded whole-AED adjustment with a meaningful reason", () => {
    expect(validateFacilitatorCommand({
      action: "adjust",
      reason: "Correcting station operator entry",
      amount: -5_000,
      tableNo: 1,
      idempotencyKey: crypto.randomUUID(),
    })).toMatchObject({ amount: -5_000, reason: "Correcting station operator entry" });
  });

  it.each([
    { action: "set_phase", phase: "INVALID" },
    { action: "award_badge", tableNo: 1, badge: "MADE_UP" },
    { action: "release_role", tableNo: 1, role: "ADMIN" },
    { action: "reset_device", deviceId: "not-a-uuid" },
    { action: "adjust", tableNo: 0, amount: 1 },
    { action: "broadcast", banner: "x".repeat(501) },
    { action: "kill", unexpected: true },
    { action: "unknown" },
  ])("rejects invalid or unknown command %#", (fields) => {
    expect(() => validateFacilitatorCommand({
      ...fields, reason: "operator requested", idempotencyKey: crypto.randomUUID(),
    })).toThrow();
  });

  it("returns a discriminated command with exact action-specific fields", () => {
    expect(validateFacilitatorCommand({
      action: "release_role", tableNo: 12, role: "CIO",
      reason: "device was replaced", idempotencyKey: crypto.randomUUID(),
    })).toEqual(expect.objectContaining({ action: "release_role", tableNo: 12, role: "CIO" }));
  });
});
