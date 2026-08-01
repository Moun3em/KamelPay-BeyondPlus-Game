import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("selfTickOutageOnce — Hobby-plan throttled self-cron", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs the tick once on first call and skips within the throttle window", async () => {
    vi.useFakeTimers();
    const calls: string[] = [];
    vi.doMock("./timeline", () => ({ advanceTimelineOnce: vi.fn(async () => { calls.push("adv"); return 1; }) }));
    vi.doMock("./outage.catchup", () => ({ tickOutagesOnce: vi.fn(async () => { calls.push("tick"); return 0; }) }));
    const { selfTickOutageOnce } = await import("./db");
    const a = await selfTickOutageOnce(new Date());
    expect(calls).toEqual(["adv", "tick"]);
    expect(a.ran).toBe(true);
    vi.advanceTimersByTime(1_000);
    const b = await selfTickOutageOnce(new Date());
    expect(b.ran).toBe(false);
    vi.advanceTimersByTime(5_000);
    const c = await selfTickOutageOnce(new Date());
    expect(c.ran).toBe(true);
    expect(calls.length).toBe(4);
  });

  it("dedupes concurrent invocations within the same window", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.doMock("./timeline", () => ({ advanceTimelineOnce: vi.fn(async () => { calls += 1; return 1; }) }));
    vi.doMock("./outage.catchup", () => ({ tickOutagesOnce: vi.fn(async () => 0) }));
    const { selfTickOutageOnce } = await import("./db");
    const [a, b, c] = await Promise.all([
      selfTickOutageOnce(new Date()),
      selfTickOutageOnce(new Date()),
      selfTickOutageOnce(new Date()),
    ]);
    expect(calls).toBe(1);
    expect(a.ran).toBe(true);
    expect(b.ran).toBe(false);
    expect(c.ran).toBe(false);
  });
});