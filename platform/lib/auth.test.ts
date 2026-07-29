import { describe, expect, it } from "vitest";
import { authenticateDeviceToken, requireServerTick } from "./auth";
import { sessionCookieValue } from "./session";

const secret = "test-session-secret-that-is-at-least-32-bytes";
const session = {
  deviceId: "9b122d59-b698-4ecf-862d-856f9b93ad97",
  tableNo: 3,
  role: "TAX" as const,
};
const token = sessionCookieValue(session, { secret, now: 1000, ttlSeconds: 60 });

describe("authoritative device authentication", () => {
  it("accepts a signed cookie only when the durable device claim matches", async () => {
    await expect(
      authenticateDeviceToken(
        token,
        async () => ({ device_id: session.deviceId, table_no: 3, role: "TAX" as const }),
        ["TAX"],
        { secret, now: 1001 },
      ),
    ).resolves.toEqual(session);
  });

  it("rejects ownership mismatch and a role not authorized for the mutation", async () => {
    await expect(
      authenticateDeviceToken(
        token,
        async () => ({ device_id: session.deviceId, table_no: 9, role: "TAX" as const }),
        ["TAX"],
        { secret, now: 1001 },
      ),
    ).rejects.toMatchObject({ status: 401 });

    await expect(
      authenticateDeviceToken(
        token,
        async () => ({ device_id: session.deviceId, table_no: 3, role: "TAX" as const }),
        ["CIO"],
        { secret, now: 1001 },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("authenticates the durable tick endpoint with a bounded server secret", () => {
    expect(() => requireServerTick("Bearer tick-secret", "tick-secret")).not.toThrow();
    expect(() => requireServerTick("Bearer forged", "tick-secret")).toThrow();
    expect(() => requireServerTick(null, "tick-secret")).toThrow();
  });
});
