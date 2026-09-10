import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canPlayFact,
  canTransition,
  pickNextFact,
  GameStateError,
} from "@/lib/services/game-state";

describe("game state", () => {
  it("allows the recommended facilitator flow", () => {
    expect(canTransition("DRAFT", "COLLECTING_FACTS")).toBe(true);
    expect(canTransition("COLLECTING_FACTS", "READY")).toBe(true);
    expect(canTransition("READY", "LIVE")).toBe(true);
    expect(canTransition("LIVE", "PAUSED")).toBe(true);
    expect(canTransition("PAUSED", "LIVE")).toBe(true);
    expect(canTransition("LIVE", "COMPLETED")).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(() => assertTransition("DRAFT", "LIVE")).toThrow(GameStateError);
  });

  it("will not pick a used fact again", () => {
    const next = pickNextFact(
      [
        { id: "1", displayOrder: 1 },
        { id: "2", displayOrder: 2 },
      ],
      new Set(["1"]),
    );
    expect(next?.id).toBe("2");
  });

  it("blocks rejected facts from play", () => {
    expect(canPlayFact({ moderationStatus: "rejected", playStatus: "rejected" })).toBe(false);
    expect(canPlayFact({ moderationStatus: "approved", playStatus: "used" })).toBe(false);
    expect(canPlayFact({ moderationStatus: "approved", playStatus: "available" })).toBe(true);
  });
});
