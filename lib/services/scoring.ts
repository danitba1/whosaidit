export type ScoreSettings = {
  scoringEnabled: boolean;
  pointsForCorrect: number;
  speedBonusEnabled: boolean;
  speedBonusPoints: number;
};

export type VoteForScoring = {
  votingParticipantId: string;
  selectedParticipantId: string;
  authorId: string;
  responseTimeMs: number | null;
};

export type ScoreDelta = {
  participantId: string;
  points: number;
  correct: boolean;
  responseTimeMs: number | null;
};

export function isVoteCorrect(vote: VoteForScoring) {
  if (vote.votingParticipantId === vote.authorId) return false;
  return vote.selectedParticipantId === vote.authorId;
}

export function scoreVote(vote: VoteForScoring, settings: ScoreSettings): ScoreDelta {
  const correct = isVoteCorrect(vote);
  if (!settings.scoringEnabled || !correct) {
    return {
      participantId: vote.votingParticipantId,
      points: 0,
      correct,
      responseTimeMs: vote.responseTimeMs,
    };
  }

  let points = settings.pointsForCorrect;
  if (settings.speedBonusEnabled && (vote.responseTimeMs ?? Number.POSITIVE_INFINITY) <= 8000) {
    points += settings.speedBonusPoints;
  }

  return {
    participantId: vote.votingParticipantId,
    points,
    correct: true,
    responseTimeMs: vote.responseTimeMs,
  };
}

export function applyScoreDeltas(
  current: Record<string, { score: number; correctGuesses: number; totalResponseTimeMs: number }>,
  deltas: ScoreDelta[],
) {
  const next = { ...current };
  for (const delta of deltas) {
    const existing = next[delta.participantId] ?? {
      score: 0,
      correctGuesses: 0,
      totalResponseTimeMs: 0,
    };
    next[delta.participantId] = {
      score: existing.score + delta.points,
      correctGuesses: existing.correctGuesses + (delta.correct ? 1 : 0),
      totalResponseTimeMs: existing.totalResponseTimeMs + (delta.responseTimeMs ?? 0),
    };
  }
  return next;
}

export type LeaderboardRow = {
  participantId: string;
  displayName: string;
  score: number;
  correctGuesses: number;
  averageResponseTimeMs: number | null;
  rank: number;
};

export function buildLeaderboard(
  players: Array<{
    participantId: string;
    displayName: string;
    score: number;
    correctGuesses: number;
    totalResponseTimeMs: number;
  }>,
): LeaderboardRow[] {
  const sorted = [...players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.correctGuesses !== a.correctGuesses) return b.correctGuesses - a.correctGuesses;
    return a.displayName.localeCompare(b.displayName);
  });

  let lastScore = Number.POSITIVE_INFINITY;
  let lastCorrect = Number.POSITIVE_INFINITY;
  let lastRank = 0;

  return sorted.map((player, index) => {
    const tied = player.score === lastScore && player.correctGuesses === lastCorrect;
    const rank = tied ? lastRank : index + 1;
    lastScore = player.score;
    lastCorrect = player.correctGuesses;
    lastRank = rank;
    return {
      participantId: player.participantId,
      displayName: player.displayName,
      score: player.score,
      correctGuesses: player.correctGuesses,
      averageResponseTimeMs:
        player.correctGuesses > 0
          ? Math.round(player.totalResponseTimeMs / player.correctGuesses)
          : null,
      rank,
    };
  });
}

export function revealFunMessage(correctCount: number, totalVotes: number) {
  if (totalVotes === 0) return "No votes were in for this round.";
  if (correctCount === 0) return "No one guessed correctly!";
  if (correctCount === 1) return "Only one player knew the answer!";
  if (correctCount === totalVotes) return "Most of the team guessed correctly!";
  if (correctCount / totalVotes >= 0.6) return "Most of the team guessed correctly!";
  if (correctCount / totalVotes <= 0.25) return "That surprised everyone!";
  return "The team was split on this one.";
}

export type VoteBar = {
  participantId: string;
  displayName: string;
  votes: number;
  isAuthor: boolean;
};

export function aggregateVotes(
  votes: Array<{ selectedParticipantId: string }>,
  participants: Array<{ id: string; displayName: string }>,
  authorId: string,
): VoteBar[] {
  const counts = new Map<string, number>();
  for (const vote of votes) {
    counts.set(vote.selectedParticipantId, (counts.get(vote.selectedParticipantId) ?? 0) + 1);
  }

  return participants
    .map((p) => ({
      participantId: p.id,
      displayName: p.displayName,
      votes: counts.get(p.id) ?? 0,
      isAuthor: p.id === authorId,
    }))
    .sort((a, b) => b.votes - a.votes || a.displayName.localeCompare(b.displayName));
}
