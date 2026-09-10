import { describe, expect, it } from "vitest";
import { joinGameSchema, submitFactSchema } from "@/lib/validation/schemas";

describe("fact submission validation", () => {
  it("rejects blank and short facts", () => {
    expect(submitFactSchema.safeParse({
      gameCode: "DEMO01",
      displayName: "Maya",
      factText: "   ",
      clientToken: "1234567890abcdef",
    }).success).toBe(false);
  });

  it("accepts a trimmed valid fact", () => {
    const parsed = submitFactSchema.parse({
      gameCode: " demo01 ",
      displayName: "  Maya  ",
      factText: "  I once attended an online meeting wearing two different shoes.  ",
      clientToken: "1234567890abcdef",
    });
    expect(parsed.gameCode).toBe("DEMO01");
    expect(parsed.displayName).toBe("Maya");
  });
});

describe("join game validation", () => {
  it("requires a display name", () => {
    expect(joinGameSchema.safeParse({
      gameCode: "DEMO01",
      displayName: " ",
      clientToken: "1234567890abcdef",
    }).success).toBe(false);
  });
});
