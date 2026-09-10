import { describe, expect, it } from "vitest";
import {
  applyScoreDeltas,
  buildLeaderboard,
  isVoteCorrect,
  revealFunMessage,
  scoreVote,
  aggregateVotes,
} from "@/lib/services/scoring";

const settings = {
  scoringEnabled: true,
  pointsForCorrect: 1,
  speedBonusEnabled: true,
  speedBonusPoints: 1,
};

describe("scoring", () => {
  it("awards a point for a correct guess", () => {
    const delta = scoreVote(
      {
        votingParticipantId: "a",
        selectedParticipantId: "author",
        authorId: "author",
        responseTimeMs: 12000,
      },
      settings,
    );
    expect(delta.points).toBe(1);
    expect(delta.correct).toBe(true);
  });

  it("does not score the author for their own fact", () => {
    expect(
      isVoteCorrect({
        votingParticipantId: "author",
        selectedParticipantId: "author",
        authorId: "author",
        responseTimeMs: 100,
      }),
    ).toBe(false);
    const delta = scoreVote(
      {
        votingParticipantId: "author",
        selectedParticipantId: "author",
        authorId: "author",
        responseTimeMs: 100,
      },
      settings,
    );
    expect(delta.points).toBe(0);
    expect(delta.correct).toBe(false);
  });

  it("adds a speed bonus under 8 seconds", () => {
    const delta = scoreVote(
      {
        votingParticipantId: "a",
        selectedParticipantId: "author",
        authorId: "author",
        responseTimeMs: 500,
      },
      settings,
    );
    expect(delta.points).toBe(2);
  });

  it("ranks ties with the same rank", () => {
    const board = buildLeaderboard([
      { participantId: "1", displayName: "Maya", score: 3, correctGuesses: 3, totalResponseTimeMs: 1000 },
      { participantId: "2", displayName: "Alex", score: 3, correctGuesses: 3, totalResponseTimeMs: 2000 },
      { participantId: "3", displayName: "Sam", score: 1, correctGuesses: 1, totalResponseTimeMs: 1000 },
    ]);
    expect(board[0].rank).toBe(1);
    expect(board[1].rank).toBe(1);
    expect(board[2].rank).toBe(3);
  });

  it("applies deltas without mutating the original map", () => {
    const current = { a: { score: 1, correctGuesses: 1, totalResponseTimeMs: 10 } };
    const next = applyScoreDeltas(current, [
      { participantId: "a", points: 1, correct: true, responseTimeMs: 20 },
    ]);
    expect(current.a.score).toBe(1);
    expect(next.a.score).toBe(2);
  });

  it("only uses real vote counts in fun messages", () => {
    expect(revealFunMessage(0, 5)).toBe("No one guessed correctly!");
    expect(revealFunMessage(1, 5)).toBe("Only one player knew the answer!");
    expect(revealFunMessage(0, 0)).toBe("No votes were in for this round.");
  });

  it("aggregates votes and marks the author", () => {
    const bars = aggregateVotes(
      [{ selectedParticipantId: "a" }, { selectedParticipantId: "a" }, { selectedParticipantId: "b" }],
      [
        { id: "a", displayName: "Maya" },
        { id: "b", displayName: "Daniel" },
      ],
      "b",
    );
    expect(bars[0].votes).toBe(2);
    expect(bars.find((b) => b.isAuthor)?.displayName).toBe("Daniel");
  });
});
