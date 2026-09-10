import { describe, expect, it } from "vitest";
import { hideAuthorUntilReveal } from "@/lib/services/privacy";
import { canPlayFact, pickNextFact } from "@/lib/services/game-state";
import { validateVote } from "@/lib/services/votes";
import { buildLeaderboard, scoreVote } from "@/lib/services/scoring";

describe("author remains hidden before reveal", () => {
  it("strips author and results until voting_status is revealed", () => {
    const hidden = hideAuthorUntilReveal("open", "Danit Ben Admon", { authorName: "Danit Ben Admon" });
    expect(hidden.revealedAuthorName).toBeNull();
    expect(hidden.results).toBeNull();
    const shown = hideAuthorUntilReveal("revealed", "Danit Ben Admon", { authorName: "Danit Ben Admon" });
    expect(shown.revealedAuthorName).toBe("Danit Ben Admon");
  });
});

describe("complete game flow", () => {
  it("walks collect → vote → reveal → score → next unused fact", () => {
    const facts = [
      { id: "f1", displayOrder: 1, moderationStatus: "approved" as const, playStatus: "available" as const },
      { id: "f2", displayOrder: 2, moderationStatus: "approved" as const, playStatus: "available" as const },
    ];
    const used = new Set<string>();
    const first = pickNextFact(facts, used);
    expect(first?.id).toBe("f1");
    used.add(first!.id);
    expect(canPlayFact({ ...facts[0], playStatus: "used" })).toBe(false);

    validateVote({
      votingOpen: true,
      revealed: false,
      voterId: "maya",
      selectedId: "daniel",
      authorId: "alex",
      allowSelfVote: false,
    });

    const maya = scoreVote(
      {
        votingParticipantId: "maya",
        selectedParticipantId: "alex",
        authorId: "alex",
        responseTimeMs: 4000,
      },
      { scoringEnabled: true, pointsForCorrect: 1, speedBonusEnabled: true, speedBonusPoints: 1 },
    );
    expect(maya.points).toBe(2);

    const second = pickNextFact(facts, used);
    expect(second?.id).toBe("f2");
    used.add(second!.id);
    expect(pickNextFact(facts, used)).toBeNull();

    const board = buildLeaderboard([
      { participantId: "maya", displayName: "Maya", score: 2, correctGuesses: 1, totalResponseTimeMs: 4000 },
      { participantId: "daniel", displayName: "Daniel", score: 0, correctGuesses: 0, totalResponseTimeMs: 0 },
    ]);
    expect(board[0].displayName).toBe("Maya");
  });
});
