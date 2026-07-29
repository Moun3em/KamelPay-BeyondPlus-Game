import { describe, expect, it, vi } from "vitest";
import { runOutageCron } from "./outage.catchup";

describe("single-owner outage cron cadence", () => {
  it("runs six sequential idempotent ticks at ten-second cadence", async () => {
    const tick = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0).mockResolvedValueOnce(1).mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const publish = vi.fn().mockResolvedValue(undefined);

    const result = await runOutageCron({ tick, sleep, publish, signal: new AbortController().signal });

    expect(tick).toHaveBeenCalledTimes(6);
    expect(sleep).toHaveBeenCalledTimes(5);
    expect(sleep.mock.calls.every(([ms]) => ms === 10_000)).toBe(true);
    expect(publish).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ticks: 3, attempts: 6 });
  });

  it("stops without another tick when aborted during sleep", async () => {
    const controller = new AbortController();
    const tick = vi.fn().mockResolvedValue(0);
    const sleep = vi.fn().mockImplementation(async () => controller.abort());
    const result = await runOutageCron({ tick, sleep, publish: vi.fn(), signal: controller.signal });
    expect(tick).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ticks: 0, attempts: 1 });
  });
});