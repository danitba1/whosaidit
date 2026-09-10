import { z } from "zod";
import { FACT_MAX, FACT_MIN, NAME_MAX, NAME_MIN } from "@/lib/constants";
import { sanitizeText } from "@/lib/utils";

const trimmed = (min: number, max: number) =>
  z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().min(min).max(max));

export const displayNameSchema = trimmed(NAME_MIN, NAME_MAX);
export const factTextSchema = trimmed(FACT_MIN, FACT_MAX);
export const gameCodeSchema = z
  .string()
  .transform((v) => sanitizeText(v).toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{4,8}$/));

export const createGameSchema = z.object({
  name: trimmed(2, 80),
  welcomeMessage: z
    .string()
    .transform(sanitizeText)
    .pipe(z.string().max(400))
    .optional()
    .or(z.literal("")),
});

export const gameSettingsSchema = z.object({
  name: trimmed(2, 80).optional(),
  welcomeMessage: z.string().transform(sanitizeText).pipe(z.string().max(400)).optional(),
  scoringEnabled: z.boolean().optional(),
  speedBonusEnabled: z.boolean().optional(),
  allowSelfVote: z.boolean().optional(),
  showVoteDetails: z.boolean().optional(),
  showLeaderboardAfterRound: z.boolean().optional(),
  timerDurationSeconds: z.number().int().min(5).max(600).nullable().optional(),
  wheelEnabled: z.boolean().optional(),
});

export const submitFactSchema = z.object({
  gameCode: gameCodeSchema,
  displayName: displayNameSchema,
  factText: factTextSchema,
  clientToken: z.string().min(16).max(80),
});

export const joinGameSchema = z.object({
  gameCode: gameCodeSchema,
  displayName: displayNameSchema,
  clientToken: z.string().min(16).max(80),
});

export const voteSchema = z.object({
  gameCode: gameCodeSchema,
  clientToken: z.string().min(16).max(80),
  selectedParticipantId: z.string().uuid(),
});
