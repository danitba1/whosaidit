"use server";

import { AppError, getPublicGameState, joinGame, submitFact, submitVote } from "@/lib/services/game-engine";
import { describeError } from "@/lib/services/privacy";
import { joinGameSchema, submitFactSchema, voteSchema } from "@/lib/validation/schemas";

function fail(error: unknown) {
  if (error instanceof AppError) return { error: error.message };
  console.error("[who-said-it] unexpected error:", describeError(error));
  return { error: "Something went wrong. Please try again." };
}

export async function submitFactAction(input: {
  gameCode: string;
  displayName: string;
  factText: string;
  clientToken: string;
}) {
  const parsed = submitFactSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your answers." };
  try {
    await submitFact(parsed.data);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function joinGameAction(input: {
  gameCode: string;
  displayName: string;
  clientToken: string;
}) {
  const parsed = joinGameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details." };
  try {
    const result = await joinGame(parsed.data);
    return { ok: true, participantId: result.participantId };
  } catch (error) {
    return fail(error);
  }
}

export async function voteAction(input: {
  gameCode: string;
  clientToken: string;
  selectedParticipantId: string;
}) {
  const parsed = voteSchema.safeParse(input);
  if (!parsed.success) return { error: "Choose someone before submitting your vote." };
  try {
    await submitVote(parsed.data);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function publicStateAction(gameCode: string, clientToken?: string) {
  try {
    const state = await getPublicGameState(gameCode, clientToken);
    return { ok: true as const, state };
  } catch (error) {
    if (error instanceof AppError) return { ok: false as const, error: error.message };
    console.error("[who-said-it] could not load game state:", describeError(error));
    return { ok: false as const, error: "We couldn't reach the game service. Please try again." };
  }
}
