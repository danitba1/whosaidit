export const NAME_MIN = 1;
export const NAME_MAX = 60;
export const FACT_MIN = 8;
export const FACT_MAX = 280;
export const GAME_CODE_LENGTH = 6;
export const MAX_FACTS_PER_WINDOW = 8;
export const FACT_WINDOW_MS = 10 * 60 * 1000;
export const MAX_VOTES_PER_MINUTE = 20;

export const TIMER_PRESETS = [15, 30, 45, 60] as const;

export const GAME_STATUSES = [
  "DRAFT",
  "COLLECTING_FACTS",
  "READY",
  "LIVE",
  "PAUSED",
  "COMPLETED",
] as const;

export type GameStatus = (typeof GAME_STATUSES)[number];
export type ModerationStatus = "pending" | "approved" | "rejected";
export type PlayStatus = "available" | "used" | "skipped" | "rejected";
export type RoundStatus = "pending" | "voting" | "closed" | "revealed";
export type VotingStatus = "idle" | "open" | "closed" | "revealed";
