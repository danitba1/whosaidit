import { describe, expect, it } from "vitest";
import { isDuplicateVote, validateVote, VoteValidationError } from "@/lib/services/votes";

describe("vote validation", () => {
  const base = {
    votingOpen: true,
    revealed: false,
    voterId: "p1",
    selectedId: "p2",
    authorId: "p3",
    allowSelfVote: false,
  };

  it("allows a first vote while open", () => {
    expect(validateVote(base).isUpdate).toBe(false);
  });

  it("rejects votes after reveal", () => {
    expect(() => validateVote({ ...base, revealed: true })).toThrow(VoteValidationError);
  });

  it("rejects votes when closed", () => {
    expect(() => validateVote({ ...base, votingOpen: false })).toThrow(/not open/);
  });

  it("optionally prevents self-voting", () => {
    expect(() => validateVote({ ...base, selectedId: "p1" })).toThrow(/yourself/);
    expect(validateVote({ ...base, selectedId: "p1", allowSelfVote: true }).isUpdate).toBe(false);
  });

  it("detects an unchanged duplicate selection", () => {
    expect(isDuplicateVote({ selectedId: "p2" }, "p2")).toBe(true);
    expect(isDuplicateVote({ selectedId: "p2" }, "p3")).toBe(false);
  });
});
