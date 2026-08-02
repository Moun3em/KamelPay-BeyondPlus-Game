import { describe, expect, it } from "vitest";
import { guidanceFor } from "./console-guide";

describe("guidanceFor", () => {
  it("returns actionable steps for every phase", () => {
    for (const phase of ["LOBBY", "TUTORIAL", "A", "B", "C", "FROZEN", "DEBRIEF"] as const) {
      const g = guidanceFor(phase, false, false);
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThan(0);
    }
  });

  it("tells the facilitator to sit back in Event Mode during Phase A", () => {
    const g = guidanceFor("A", true, false);
    expect(g.steps.some((s) => s.includes("Event Mode"))).toBe(true);
  });

  it("tells the facilitator to resume when paused", () => {
    const g = guidanceFor("A", true, true);
    expect(g.title).toContain("PAUSED");
    expect(g.steps[0]).toContain("Resume");
  });

  it("mentions trade validation in Phase B and outage help in Phase C", () => {
    expect(guidanceFor("B", false, false).steps.join(" ")).toContain("ASP trade validation");
    expect(guidanceFor("C", false, false).steps.join(" ")).toContain("Force-resolve");
  });

  it("never returns undefined for unknown/loading phases (console crash regression)", () => {
    for (const bogus of ["—", "", "LOADING", "BOGUS"] as const) {
      const g = guidanceFor(bogus as never, false, false);
      expect(g).toBeDefined();
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.steps.length).toBeGreaterThan(0);
    }
  });
});
