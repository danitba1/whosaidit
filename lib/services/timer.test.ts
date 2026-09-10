import { describe, expect, it } from "vitest";
import { isExpired, isWarningWindow, remainingSeconds, timerEndsAt } from "@/lib/services/timer";

describe("timer", () => {
  it("returns null when disabled", () => {
    expect(timerEndsAt(new Date(), null)).toBeNull();
    expect(remainingSeconds(null)).toBeNull();
  });

  it("computes remaining time from a server timestamp", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const ends = new Date("2026-01-01T00:00:30Z");
    expect(remainingSeconds(ends, now)).toBe(30);
    expect(isExpired(ends, now)).toBe(false);
    expect(isExpired(ends, new Date("2026-01-01T00:00:31Z"))).toBe(true);
  });

  it("warns in the final five seconds", () => {
    expect(isWarningWindow(5)).toBe(true);
    expect(isWarningWindow(6)).toBe(false);
  });
});
