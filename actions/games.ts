"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  AppError,
  addManualFact,
  adjustScore,
  closeVoting,
  deleteGame,
  endGame,
  exportResultsCsv,
  getControlState,
  getFacilitatorGame,
  listFacts,
  listParticipants,
  moderateFact,
  openVoting,
  pauseGame,
  previousRound,
  randomizeFacts,
  removeParticipant,
  reorderFacts,
  resetCurrentRound,
  resetGame,
  resetScores,
  resetUsedFacts,
  revealAnswer,
  setGameStatus,
  skipCurrentFact,
  startRound,
  togglePresenterFlag,
  updateGameSettings,
} from "@/lib/services/game-engine";
import type { GameStatus } from "@/lib/constants";
import { displayNameSchema, factTextSchema } from "@/lib/validation/schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Please sign in.", "UNAUTHORIZED");
  return user;
}

function fail(error: unknown) {
  return { error: error instanceof AppError ? error.message : "Something went wrong. Try again." };
}

export async function loadGame(gameId: string) {
  const user = await requireUser();
  return getFacilitatorGame(user.id, gameId);
}

export async function loadControl(gameId: string) {
  const user = await requireUser();
  return getControlState(user.id, gameId);
}

export async function loadFacts(gameId: string) {
  const user = await requireUser();
  return listFacts(user.id, gameId);
}

export async function loadParticipants(gameId: string) {
  const user = await requireUser();
  return listParticipants(user.id, gameId);
}

export async function updateSettingsAction(gameId: string, formData: FormData) {
  const user = await requireUser();
  try {
    const timerRaw = String(formData.get("timerDurationSeconds") ?? "");
    await updateGameSettings(user.id, gameId, {
      name: String(formData.get("name") ?? ""),
      welcome_message: String(formData.get("welcomeMessage") ?? "") || null,
      scoring_enabled: formData.get("scoringEnabled") === "on",
      speed_bonus_enabled: formData.get("speedBonusEnabled") === "on",
      allow_self_vote: formData.get("allowSelfVote") === "on",
      show_vote_details: formData.get("showVoteDetails") === "on",
      show_leaderboard_after_round: formData.get("showLeaderboardAfterRound") === "on",
      wheel_enabled: formData.get("wheelEnabled") === "on",
      timer_duration_seconds: timerRaw ? Number(timerRaw) : null,
    });
    revalidatePath(`/admin/games/${gameId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function setStatusAction(gameId: string, status: GameStatus) {
  const user = await requireUser();
  try {
    await setGameStatus(user.id, gameId, status);
    revalidatePath(`/admin/games/${gameId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function moderateFactAction(
  gameId: string,
  factId: string,
  action: "approve" | "reject" | "delete" | "available" | "skipped" | "used",
  factText?: string,
) {
  const user = await requireUser();
  try {
    await moderateFact(user.id, factId, action, factText);
    revalidatePath(`/admin/games/${gameId}`);
    revalidatePath(`/admin/games/${gameId}/facts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function addFactAction(gameId: string, formData: FormData) {
  const user = await requireUser();
  const name = displayNameSchema.safeParse(formData.get("displayName"));
  const fact = factTextSchema.safeParse(formData.get("factText"));
  if (!name.success || !fact.success) return { error: "Name and fact are required." };
  try {
    await addManualFact(user.id, gameId, name.data, fact.data);
    revalidatePath(`/admin/games/${gameId}/facts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function reorderFactsAction(gameId: string, orderedIds: string[]) {
  const user = await requireUser();
  try {
    await reorderFacts(user.id, gameId, orderedIds);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function randomizeFactsAction(gameId: string) {
  const user = await requireUser();
  try {
    await randomizeFacts(user.id, gameId);
    revalidatePath(`/admin/games/${gameId}/facts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function resetUsedFactsAction(gameId: string) {
  const user = await requireUser();
  try {
    await resetUsedFacts(user.id, gameId);
    revalidatePath(`/admin/games/${gameId}/facts`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function resetGameAction(gameId: string) {
  const user = await requireUser();
  try {
    await resetGame(user.id, gameId);
    revalidatePath(`/admin/games/${gameId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function deleteGameAction(gameId: string) {
  const user = await requireUser();
  try {
    await deleteGame(user.id, gameId);
    revalidatePath("/admin/games");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function startRoundAction(gameId: string, options?: { random?: boolean; factId?: string }) {
  const user = await requireUser();
  try {
    await startRound(user.id, gameId, options);
    revalidatePath(`/admin/games/${gameId}/control`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function openVotingAction(gameId: string) {
  const user = await requireUser();
  try {
    await openVoting(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function closeVotingAction(gameId: string) {
  const user = await requireUser();
  try {
    await closeVoting(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function revealAnswerAction(gameId: string) {
  const user = await requireUser();
  try {
    await revealAnswer(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function nextFactAction(gameId: string) {
  return startRoundAction(gameId);
}

export async function previousFactAction(gameId: string) {
  const user = await requireUser();
  try {
    await previousRound(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function skipFactAction(gameId: string) {
  const user = await requireUser();
  try {
    await skipCurrentFact(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function randomFactAction(gameId: string) {
  return startRoundAction(gameId, { random: true });
}

export async function pauseAction(gameId: string, resume = false) {
  const user = await requireUser();
  try {
    await pauseGame(user.id, gameId, resume);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function endGameAction(gameId: string) {
  const user = await requireUser();
  try {
    await endGame(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function resetRoundAction(gameId: string) {
  const user = await requireUser();
  try {
    await resetCurrentRound(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function toggleFlagAction(
  gameId: string,
  flag: "show_leaderboard" | "show_vote_distribution",
  value: boolean,
) {
  const user = await requireUser();
  try {
    await togglePresenterFlag(user.id, gameId, flag, value);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function adjustScoreAction(
  gameId: string,
  participantId: string,
  mode: "add" | "sub" | "set",
  value = 0,
) {
  const user = await requireUser();
  try {
    await adjustScore(user.id, gameId, participantId, mode, value);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function resetScoresAction(gameId: string) {
  const user = await requireUser();
  try {
    await resetScores(user.id, gameId);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function removeParticipantAction(gameId: string, participantId: string) {
  const user = await requireUser();
  try {
    await removeParticipant(user.id, gameId, participantId);
    revalidatePath(`/admin/games/${gameId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function exportCsvAction(gameId: string) {
  const user = await requireUser();
  return exportResultsCsv(user.id, gameId);
}
