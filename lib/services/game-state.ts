import type { GameStatus, RoundStatus, VotingStatus } from "@/lib/constants";

export class GameStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameStateError";
  }
}

const allowedTransitions: Record<GameStatus, GameStatus[]> = {
  DRAFT: ["COLLECTING_FACTS"],
  COLLECTING_FACTS: ["READY", "DRAFT", "LIVE"],
  READY: ["LIVE", "COLLECTING_FACTS"],
  LIVE: ["PAUSED", "COMPLETED"],
  PAUSED: ["LIVE", "COMPLETED"],
  COMPLETED: ["DRAFT"],
};

export function canTransition(from: GameStatus, to: GameStatus) {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: GameStatus, to: GameStatus) {
  if (from === to) return;
  if (!canTransition(from, to)) {
    throw new GameStateError(`Cannot change game status from ${from} to ${to}`);
  }
}

export function nextRoundStatus(current: RoundStatus, action: "open" | "close" | "reveal"): RoundStatus {
  if (action === "open") {
    if (current !== "pending" && current !== "closed") {
      throw new GameStateError("Voting can only be opened from a pending or closed round");
    }
    return "voting";
  }
  if (action === "close") {
    if (current !== "voting") {
      throw new GameStateError("Voting is not open");
    }
    return "closed";
  }
  if (current === "revealed") {
    throw new GameStateError("Answer already revealed");
  }
  return "revealed";
}

export function votingStatusFromRound(status: RoundStatus): VotingStatus {
  if (status === "voting") return "open";
  if (status === "closed") return "closed";
  if (status === "revealed") return "revealed";
  return "idle";
}

export function pickNextFact<T extends { id: string; displayOrder: number }>(
  facts: T[],
  usedIds: Set<string>,
) {
  const available = facts
    .filter((f) => !usedIds.has(f.id))
    .sort((a, b) => a.displayOrder - b.displayOrder);
  return available[0] ?? null;
}

export function shuffleOrder<T>(items: T[], random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function canPlayFact(input: {
  moderationStatus: "pending" | "approved" | "rejected";
  playStatus: "available" | "used" | "skipped" | "rejected";
}) {
  return input.moderationStatus === "approved" && input.playStatus === "available";
}
