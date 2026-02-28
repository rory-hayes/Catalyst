import { describe, expect, it } from "vitest";

import { computeStale, deriveHealth } from "../../lib/services/health";

describe("deriveHealth", () => {
  it("returns RED when next step is missing", () => {
    const health = deriveHealth({
      now: new Date("2026-02-28T12:00:00.000Z"),
      closeDate: null,
      lastActivityAt: new Date("2026-02-20T12:00:00.000Z"),
      nextStep: null,
      stageMovedCount30d: 0,
      missingRequiredFields: 0,
    });

    expect(health).toBe("RED");
  });

  it("returns YELLOW for repeated close-date movement or missing required fields", () => {
    const health = deriveHealth({
      now: new Date("2026-02-28T12:00:00.000Z"),
      closeDate: new Date("2026-03-10T12:00:00.000Z"),
      lastActivityAt: new Date("2026-02-25T12:00:00.000Z"),
      nextStep: "Send proposal",
      stageMovedCount30d: 2,
      missingRequiredFields: 1,
    });

    expect(health).toBe("YELLOW");
  });

  it("returns GREEN when healthy and current", () => {
    const health = deriveHealth({
      now: new Date("2026-02-28T12:00:00.000Z"),
      closeDate: new Date("2026-03-20T12:00:00.000Z"),
      lastActivityAt: new Date("2026-02-27T12:00:00.000Z"),
      nextStep: "Run pricing review",
      stageMovedCount30d: 0,
      missingRequiredFields: 0,
    });

    expect(health).toBe("GREEN");
  });
});

describe("computeStale", () => {
  it("marks deals stale when update exceeds configured threshold", () => {
    const stale = computeStale(new Date("2026-02-10T00:00:00.000Z"), 7, new Date("2026-02-28T00:00:00.000Z"));
    expect(stale).toBe(true);
  });

  it("does not mark stale when update is recent", () => {
    const stale = computeStale(new Date("2026-02-25T00:00:00.000Z"), 7, new Date("2026-02-28T00:00:00.000Z"));
    expect(stale).toBe(false);
  });
});
