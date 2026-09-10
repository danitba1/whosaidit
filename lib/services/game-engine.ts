import { FACT_WINDOW_MS, MAX_FACTS_PER_WINDOW, type GameStatus } from "@/lib/constants";
import { createGameCode } from "@/lib/game-code";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  applyScoreDeltas,
  aggregateVotes,
  buildLeaderboard,
  revealFunMessage,
  scoreVote,
  type LeaderboardRow,
  type VoteBar,
} from "@/lib/services/scoring";
import {
  assertTransition,
  canPlayFact,
  shuffleOrder,
  votingStatusFromRound,
} from "@/lib/services/game-state";
import { isExpired, timerEndsAt } from "@/lib/services/timer";
import { validateVote } from "@/lib/services/votes";
import { hideAuthorUntilReveal } from "@/lib/services/privacy";
import { sanitizeText } from "@/lib/utils";

export class AppError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "UNAUTHORIZED"
      | "VALIDATION"
      | "CONFLICT"
      | "FORBIDDEN"
      | "RATE_LIMIT"
      | "CLOSED" = "VALIDATION",
  ) {
    super(message);
    this.name = "AppError";
  }
}

function relationName(value: unknown): string {
  if (!value) return "Player";
  if (Array.isArray(value)) {
    const first = value[0] as { display_name?: string } | undefined;
    return first?.display_name ?? "Player";
  }
  if (typeof value === "object" && value && "display_name" in value) {
    return String((value as { display_name: string }).display_name);
  }
  return "Player";
}

function requireRow<T>(row: T | null, message: string): T {
  if (!row) throw new AppError(message, "NOT_FOUND");
  return row;
}

type Admin = ReturnType<typeof createAdminClient>;

function db() {
  return createAdminClient();
}

async function requireFacilitator(userId: string, gameId: string, client: Admin = db()) {
  const { data, error } = await client
    .from("games")
    .select("*")
    .eq("id", gameId)
    .eq("created_by", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("Game not found", "NOT_FOUND");
  return data as GameRow;
}

export type GameRow = {
  id: string;
  game_code: string;
  name: string;
  welcome_message: string | null;
  status: GameStatus;
  created_by: string;
  current_round_id: string | null;
  scoring_enabled: boolean;
  speed_bonus_enabled: boolean;
  allow_self_vote: boolean;
  show_vote_details: boolean;
  show_leaderboard_after_round: boolean;
  timer_duration_seconds: number | null;
  wheel_enabled: boolean;
  show_leaderboard: boolean;
  show_vote_distribution: boolean;
  current_round_number: number;
  current_fact_text: string | null;
  voting_status: "idle" | "open" | "closed" | "revealed";
  votes_received: number;
  revealed_author_name: string | null;
  results_payload: ResultsPayload | null;
  leaderboard_payload: LeaderboardRow[] | null;
  timer_ends_at: string | null;
  presentation_hint: string | null;
};

export type ResultsPayload = {
  authorName: string;
  authorId: string;
  bars: VoteBar[];
  totalVotes: number;
  correctCount: number;
  mostPopularName: string | null;
  message: string;
};

export type PublicGameState = {
  gameId: string;
  gameCode: string;
  name: string;
  welcomeMessage: string | null;
  status: GameStatus;
  currentRoundNumber: number;
  currentFactText: string | null;
  votingStatus: GameRow["voting_status"];
  votesReceived: number;
  revealedAuthorName: string | null;
  results: ResultsPayload | null;
  leaderboard: LeaderboardRow[] | null;
  showLeaderboard: boolean;
  showVoteDistribution: boolean;
  timerEndsAt: string | null;
  allowSelfVote: boolean;
  scoringEnabled: boolean;
  wheelEnabled: boolean;
  participants: Array<{ id: string; displayName: string }>;
  myVoteSelectedId: string | null;
  myParticipantId: string | null;
  submissionOpen: boolean;
};

function toPublic(game: GameRow, extras: Partial<PublicGameState> = {}): PublicGameState {
  const hidden = hideAuthorUntilReveal(game.voting_status, game.revealed_author_name, game.results_payload);
  return {
    gameId: game.id,
    gameCode: game.game_code,
    name: game.name,
    welcomeMessage: game.welcome_message,
    status: game.status,
    currentRoundNumber: game.current_round_number,
    currentFactText: game.current_fact_text,
    votingStatus: game.voting_status,
    votesReceived: game.votes_received,
    revealedAuthorName: hidden.revealedAuthorName,
    results: hidden.results,
    leaderboard: game.show_leaderboard ? game.leaderboard_payload : null,
    showLeaderboard: game.show_leaderboard,
    showVoteDistribution: game.voting_status === "revealed" && game.show_vote_distribution,
    timerEndsAt: game.timer_ends_at,
    allowSelfVote: game.allow_self_vote,
    scoringEnabled: game.scoring_enabled,
    wheelEnabled: game.wheel_enabled,
    participants: [],
    myVoteSelectedId: null,
    myParticipantId: null,
    submissionOpen: game.status === "COLLECTING_FACTS",
    ...extras,
  };
}

async function getGameByCode(code: string, client: Admin = db()) {
  const { data, error } = await client
    .from("games")
    .select("*")
    .eq("game_code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError("We couldn't find that game code.", "NOT_FOUND");
  return data as GameRow;
}

async function bumpRateLimit(key: string, max: number, windowMs: number, client: Admin) {
  const { data } = await client.from("rate_limits").select("*").eq("key", key).maybeSingle();
  const now = Date.now();
  if (!data) {
    await client.from("rate_limits").insert({ key, window_started_at: new Date().toISOString(), hit_count: 1 });
    return;
  }
  const started = new Date(data.window_started_at).getTime();
  if (now - started > windowMs) {
    await client
      .from("rate_limits")
      .update({ window_started_at: new Date().toISOString(), hit_count: 1 })
      .eq("key", key);
    return;
  }
  if (data.hit_count >= max) {
    throw new AppError("Too many attempts. Please wait a moment and try again.", "RATE_LIMIT");
  }
  await client.from("rate_limits").update({ hit_count: data.hit_count + 1 }).eq("key", key);
}

async function upsertScoreRows(client: Admin, gameId: string, participantId: string) {
  await client.from("scores").upsert(
    { game_id: gameId, participant_id: participantId, score: 0, correct_guesses: 0 },
    { onConflict: "game_id,participant_id", ignoreDuplicates: true },
  );
}

export async function createGame(userId: string, name: string, welcomeMessage?: string) {
  const client = db();
  for (let i = 0; i < 6; i += 1) {
    const code = createGameCode();
    const { data, error } = await client
      .from("games")
      .insert({
        game_code: code,
        name,
        welcome_message: welcomeMessage || null,
        status: "DRAFT",
        created_by: userId,
      })
      .select("*")
      .single();
    if (!error) return data as GameRow;
    if (!String(error.message).includes("duplicate")) throw error;
  }
  throw new AppError("Could not generate a unique game code. Try again.", "CONFLICT");
}

export async function listGames(userId: string) {
  const { data, error } = await db()
    .from("games")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GameRow[];
}

export async function getFacilitatorGame(userId: string, gameId: string) {
  return requireFacilitator(userId, gameId);
}

export async function updateGameSettings(
  userId: string,
  gameId: string,
  patch: Partial<{
    name: string;
    welcome_message: string | null;
    scoring_enabled: boolean;
    speed_bonus_enabled: boolean;
    allow_self_vote: boolean;
    show_vote_details: boolean;
    show_leaderboard_after_round: boolean;
    timer_duration_seconds: number | null;
    wheel_enabled: boolean;
  }>,
) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { data, error } = await client.from("games").update(patch).eq("id", gameId).select("*").single();
  if (error) throw error;
  return data as GameRow;
}

export async function setGameStatus(userId: string, gameId: string, status: GameStatus) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  assertTransition(game.status, status);
  if (status === "READY" || status === "LIVE") {
    const { count } = await client
      .from("facts")
      .select("id", { count: "exact", head: true })
      .eq("game_id", gameId)
      .eq("moderation_status", "approved")
      .eq("play_status", "available");
    if ((count ?? 0) < 1 && status === "LIVE" && game.status !== "PAUSED") {
      const { count: used } = await client
        .from("facts")
        .select("id", { count: "exact", head: true })
        .eq("game_id", gameId)
        .eq("moderation_status", "approved");
      if ((used ?? 0) < 1) throw new AppError("Approve at least one fact before starting.", "VALIDATION");
    }
  }
  const { error } = await client.from("games").update({ status }).eq("id", gameId);
  if (error) throw error;
}

export async function submitFact(input: {
  gameCode: string;
  displayName: string;
  factText: string;
  clientToken: string;
}) {
  const client = db();
  const game = await getGameByCode(input.gameCode, client);
  if (game.status !== "COLLECTING_FACTS") {
    throw new AppError("Fact submission is closed for this game.", "CLOSED");
  }

  await bumpRateLimit(`fact:${input.clientToken}`, MAX_FACTS_PER_WINDOW, FACT_WINDOW_MS, client);

  let participant = (
    await client
      .from("participants")
      .select("*")
      .eq("game_id", game.id)
      .eq("client_token", input.clientToken)
      .maybeSingle()
  ).data;

  if (!participant) {
    const { data, error } = await client
      .from("participants")
      .insert({
        game_id: game.id,
        display_name: input.displayName,
        client_token: input.clientToken,
      })
      .select("*")
      .single();
    if (error) {
      if (String(error.message).toLowerCase().includes("unique")) {
        throw new AppError("That display name is already taken in this game.", "CONFLICT");
      }
      throw error;
    }
    participant = data;
    await upsertScoreRows(client, game.id, participant.id);
  } else if (participant.display_name !== input.displayName) {
    const { error } = await client
      .from("participants")
      .update({ display_name: input.displayName, last_seen_at: new Date().toISOString() })
      .eq("id", participant.id);
    if (error && String(error.message).toLowerCase().includes("unique")) {
      throw new AppError("That display name is already taken in this game.", "CONFLICT");
    }
  }

  const { error } = await client.from("facts").insert({
    game_id: game.id,
    participant_id: participant.id,
    fact_text: input.factText,
    moderation_status: "pending",
    play_status: "available",
  });
  if (error) {
    if (String(error.message).toLowerCase().includes("unique")) {
      throw new AppError("You already submitted that fact.", "CONFLICT");
    }
    throw error;
  }

  return { participantId: participant.id as string };
}

export async function joinGame(input: { gameCode: string; displayName: string; clientToken: string }) {
  const client = db();
  const game = await getGameByCode(input.gameCode, client);
  if (!["READY", "LIVE", "PAUSED"].includes(game.status) && game.status !== "COLLECTING_FACTS") {
    if (game.status === "COMPLETED") throw new AppError("This game has already finished.", "CLOSED");
    if (game.status === "DRAFT") throw new AppError("This game is not open yet.", "CLOSED");
  }

  const existing = (
    await client
      .from("participants")
      .select("*")
      .eq("game_id", game.id)
      .eq("client_token", input.clientToken)
      .maybeSingle()
  ).data;

  if (existing) {
    if (existing.is_removed) throw new AppError("You were removed from this game.", "FORBIDDEN");
    await client
      .from("participants")
      .update({
        display_name: input.displayName,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    await upsertScoreRows(client, game.id, existing.id);
    return { participantId: existing.id as string, game };
  }

  const { data, error } = await client
    .from("participants")
    .insert({
      game_id: game.id,
      display_name: input.displayName,
      client_token: input.clientToken,
    })
    .select("*")
    .single();
  if (error) {
    if (String(error.message).toLowerCase().includes("unique")) {
      throw new AppError("That display name is already taken in this game.", "CONFLICT");
    }
    throw error;
  }
  await upsertScoreRows(client, game.id, data.id);
  return { participantId: data.id as string, game };
}

export async function getPublicGameState(gameCode: string, clientToken?: string | null) {
  const client = db();
  const game = await getGameByCode(gameCode, client);

  if (game.timer_ends_at && game.voting_status === "open" && isExpired(game.timer_ends_at)) {
    await closeVotingInternal(client, game);
    const refreshed = await getGameByCode(gameCode, client);
    return assemblePublicState(client, refreshed, clientToken);
  }

  return assemblePublicState(client, game, clientToken);
}

async function assemblePublicState(client: Admin, game: GameRow, clientToken?: string | null) {
  let participants: Array<{ id: string; displayName: string }> = [];
  if (["LIVE", "PAUSED", "COMPLETED"].includes(game.status)) {
    const { data } = await client
      .from("participants")
      .select("id, display_name")
      .eq("game_id", game.id)
      .eq("is_removed", false)
      .order("display_name");
    participants = ((data ?? []) as Array<{ id: string; display_name: string }>).map((p) => ({
      id: p.id,
      displayName: p.display_name,
    }));
  }

  let myVoteSelectedId: string | null = null;
  let myParticipantId: string | null = null;
  if (clientToken) {
    const { data: me } = await client
      .from("participants")
      .select("id, is_removed")
      .eq("game_id", game.id)
      .eq("client_token", clientToken)
      .maybeSingle();
    if (me?.is_removed) throw new AppError("You were removed from this game.", "FORBIDDEN");
    if (me) {
      myParticipantId = me.id;
      if (game.current_round_id) {
        const { data: vote } = await client
          .from("votes")
          .select("selected_participant_id")
          .eq("round_id", game.current_round_id)
          .eq("voting_participant_id", me.id)
          .maybeSingle();
        myVoteSelectedId = vote?.selected_participant_id ?? null;
      }
    }
  }

  return toPublic(game, { participants, myVoteSelectedId, myParticipantId });
}

export async function listFacts(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { data, error } = await client
    .from("facts")
    .select("*, participants(display_name)")
    .eq("game_id", gameId)
    .order("display_order")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function listParticipants(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { data, error } = await client
    .from("participants")
    .select("*, facts(id), scores(score, correct_guesses)")
    .eq("game_id", gameId)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}

export async function moderateFact(
  userId: string,
  factId: string,
  action: "approve" | "reject" | "delete" | "available" | "skipped" | "used",
  factText?: string,
) {
  const client = db();
  const { data: fact } = await client.from("facts").select("*").eq("id", factId).maybeSingle();
  if (!fact) throw new AppError("Fact not found", "NOT_FOUND");
  await requireFacilitator(userId, fact.game_id, client);

  if (action === "delete") {
    const { error } = await client.from("facts").delete().eq("id", factId);
    if (error) throw error;
    return;
  }

  const patch: Record<string, unknown> = {};
  if (factText) patch.fact_text = sanitizeText(factText);
  if (action === "approve") {
    patch.moderation_status = "approved";
    if (fact.play_status === "rejected") patch.play_status = "available";
  }
  if (action === "reject") {
    patch.moderation_status = "rejected";
    patch.play_status = "rejected";
  }
  if (action === "available") patch.play_status = "available";
  if (action === "skipped") patch.play_status = "skipped";
  if (action === "used") patch.play_status = "used";

  const { error } = await client.from("facts").update(patch).eq("id", factId);
  if (error) throw error;
}

export async function addManualFact(
  userId: string,
  gameId: string,
  displayName: string,
  factText: string,
) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const token = `manual-${crypto.randomUUID()}`;
  const { data: participant, error: pErr } = await client
    .from("participants")
    .insert({ game_id: gameId, display_name: displayName, client_token: token })
    .select("*")
    .single();
  if (pErr) {
    if (String(pErr.message).toLowerCase().includes("unique")) {
      const existing = await client
        .from("participants")
        .select("*")
        .eq("game_id", gameId)
        .ilike("display_name", displayName)
        .maybeSingle();
      if (!existing.data) throw pErr;
      const { error } = await client.from("facts").insert({
        game_id: gameId,
        participant_id: existing.data.id,
        fact_text: factText,
        moderation_status: "approved",
        play_status: "available",
      });
      if (error) throw error;
      return;
    }
    throw pErr;
  }
  await upsertScoreRows(client, gameId, participant.id);
  const { error } = await client.from("facts").insert({
    game_id: gameId,
    participant_id: participant.id,
    fact_text: factText,
    moderation_status: "approved",
    play_status: "available",
  });
  if (error) throw error;
}

export async function reorderFacts(userId: string, gameId: string, orderedIds: string[]) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await Promise.all(
    orderedIds.map((id, index) =>
      client.from("facts").update({ display_order: index + 1 }).eq("id", id).eq("game_id", gameId),
    ),
  );
}

export async function randomizeFacts(userId: string, gameId: string) {
  const facts = await listFacts(userId, gameId);
  const approved = facts.filter((f) => f.moderation_status === "approved" && f.play_status === "available");
  const shuffled = shuffleOrder(approved);
  await reorderFacts(
    userId,
    gameId,
    shuffled.map((f) => f.id),
  );
}

export async function resetUsedFacts(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await client
    .from("facts")
    .update({ play_status: "available" })
    .eq("game_id", gameId)
    .in("play_status", ["used", "skipped"]);
}

export async function resetGame(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await client.from("votes").delete().eq("game_id", gameId);
  await client.from("rounds").delete().eq("game_id", gameId);
  await client.from("scores").update({ score: 0, correct_guesses: 0, total_response_time_ms: 0 }).eq("game_id", gameId);
  await client
    .from("facts")
    .update({ play_status: "available" })
    .eq("game_id", gameId)
    .neq("moderation_status", "rejected");
  await client
    .from("games")
    .update({
      status: "COLLECTING_FACTS",
      current_round_id: null,
      current_round_number: 0,
      current_fact_text: null,
      voting_status: "idle",
      votes_received: 0,
      revealed_author_name: null,
      results_payload: null,
      leaderboard_payload: null,
      timer_ends_at: null,
      show_leaderboard: false,
      show_vote_distribution: false,
    })
    .eq("id", gameId);
}

export async function deleteGame(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { error } = await client.from("games").delete().eq("id", gameId);
  if (error) throw error;
}

async function approvedAvailableFacts(client: Admin, gameId: string) {
  const { data, error } = await client
    .from("facts")
    .select("id, fact_text, participant_id, display_order, moderation_status, play_status")
    .eq("game_id", gameId)
    .eq("moderation_status", "approved")
    .eq("play_status", "available")
    .order("display_order");
  if (error) throw error;
  return data ?? [];
}

export async function startRound(
  userId: string,
  gameId: string,
  options: { factId?: string; random?: boolean } = {},
) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (game.status === "COMPLETED") throw new AppError("Game already completed", "CLOSED");
  if (game.status === "DRAFT" || game.status === "COLLECTING_FACTS") {
    assertTransition(game.status === "COLLECTING_FACTS" ? "COLLECTING_FACTS" : "DRAFT", "READY");
  }

  const available = await approvedAvailableFacts(client, gameId);
  const playable = available.filter((f) =>
    canPlayFact({ moderationStatus: f.moderation_status, playStatus: f.play_status }),
  );
  let fact = playable[0] ?? null;
  if (options.factId) {
    fact = playable.find((f) => f.id === options.factId) ?? fact;
  } else if (options.random) {
    fact = shuffleOrder(playable)[0] ?? null;
  }
  if (!fact) throw new AppError("No unused approved facts remain.", "VALIDATION");

  const nextNumber = game.current_round_number + 1;
  const { data: round, error } = await client
    .from("rounds")
    .insert({
      game_id: gameId,
      fact_id: fact.id,
      round_number: nextNumber,
      status: "voting",
      voting_opened_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  await client.from("facts").update({ play_status: "used" }).eq("id", fact.id);

  const ends = timerEndsAt(new Date(), game.timer_duration_seconds);
  await client
    .from("games")
    .update({
      status: "LIVE",
      current_round_id: round.id,
      current_round_number: nextNumber,
      current_fact_text: fact.fact_text,
      voting_status: "open",
      votes_received: 0,
      revealed_author_name: null,
      results_payload: null,
      timer_ends_at: ends?.toISOString() ?? null,
      show_leaderboard: false,
      show_vote_distribution: false,
    })
    .eq("id", gameId);

  return round;
}

export async function openVoting(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (!game.current_round_id) throw new AppError("No active round", "VALIDATION");
  const ends = timerEndsAt(new Date(), game.timer_duration_seconds);
  await client.from("rounds").update({ status: "voting", voting_opened_at: new Date().toISOString() }).eq("id", game.current_round_id);
  await client
    .from("games")
    .update({
      voting_status: "open",
      status: game.status === "PAUSED" ? "LIVE" : game.status,
      timer_ends_at: ends?.toISOString() ?? null,
    })
    .eq("id", gameId);
}

async function closeVotingInternal(client: Admin, game: GameRow) {
  if (!game.current_round_id) return;
  await client
    .from("rounds")
    .update({ status: "closed", voting_closed_at: new Date().toISOString() })
    .eq("id", game.current_round_id)
    .neq("status", "revealed");
  await client
    .from("games")
    .update({ voting_status: game.voting_status === "revealed" ? "revealed" : "closed", timer_ends_at: null })
    .eq("id", game.id)
    .neq("voting_status", "revealed");
}

export async function closeVoting(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  await closeVotingInternal(client, game);
}

export async function submitVote(input: {
  gameCode: string;
  clientToken: string;
  selectedParticipantId: string;
}) {
  const client = db();
  const game = await getGameByCode(input.gameCode, client);
  if (game.timer_ends_at && game.voting_status === "open" && isExpired(game.timer_ends_at)) {
    await closeVotingInternal(client, game);
    throw new AppError("Time is up. Voting is closed.", "CLOSED");
  }

  const { data: voter } = await client
    .from("participants")
    .select("*")
    .eq("game_id", game.id)
    .eq("client_token", input.clientToken)
    .maybeSingle();
  if (!voter || voter.is_removed) throw new AppError("Join the game before voting.", "FORBIDDEN");
  if (!game.current_round_id) throw new AppError("No active round", "VALIDATION");

  const { data: round } = await client.from("rounds").select("*").eq("id", game.current_round_id).single();
  const currentRound = requireRow(round, "No active round");
  const { data: fact } = await client.from("facts").select("participant_id").eq("id", currentRound.fact_id).single();
  const currentFact = requireRow(fact, "Fact not found");

  const { data: existing } = await client
    .from("votes")
    .select("*")
    .eq("round_id", currentRound.id)
    .eq("voting_participant_id", voter.id)
    .maybeSingle();

  validateVote({
    votingOpen: game.voting_status === "open" && currentRound.status === "voting",
    revealed: game.voting_status === "revealed" || currentRound.status === "revealed",
    voterId: voter.id,
    selectedId: input.selectedParticipantId,
    authorId: currentFact.participant_id,
    allowSelfVote: game.allow_self_vote,
    existingVoteId: existing?.id,
  });

  const opened = currentRound.voting_opened_at ? new Date(currentRound.voting_opened_at).getTime() : Date.now();
  const responseTime = Math.max(0, Date.now() - opened);

  if (existing) {
    const { error } = await client
      .from("votes")
      .update({
        selected_participant_id: input.selectedParticipantId,
        response_time_ms: responseTime,
      })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await client.from("votes").insert({
      game_id: game.id,
      round_id: currentRound.id,
      voting_participant_id: voter.id,
      selected_participant_id: input.selectedParticipantId,
      response_time_ms: responseTime,
    });
    if (error) {
      if (String(error.message).toLowerCase().includes("unique")) {
        throw new AppError("Your vote was already recorded.", "CONFLICT");
      }
      throw error;
    }
  }

  const { count } = await client
    .from("votes")
    .select("id", { count: "exact", head: true })
    .eq("round_id", currentRound.id);
  await client.from("games").update({ votes_received: count ?? 0 }).eq("id", game.id);
}

export async function revealAnswer(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (!game.current_round_id) throw new AppError("No active round", "VALIDATION");
  if (game.voting_status === "open") await closeVotingInternal(client, game);

  const { data: round } = await client.from("rounds").select("*").eq("id", game.current_round_id).single();
  const currentRound = requireRow(round, "No active round");
  if (currentRound.status === "revealed") return;

  const { data: fact } = await client
    .from("facts")
    .select("participant_id, fact_text, participants(display_name)")
    .eq("id", currentRound.fact_id)
    .single();
  const currentFact = requireRow(fact, "Fact not found");
  const authorId = currentFact.participant_id as string;
  const authorName = relationName(currentFact.participants);

  const { data: votes } = await client.from("votes").select("*").eq("round_id", currentRound.id);
  const { data: participants } = await client
    .from("participants")
    .select("id, display_name")
    .eq("game_id", gameId)
    .eq("is_removed", false);

  const voteList = votes ?? [];
  for (const vote of voteList) {
    const correct = vote.voting_participant_id !== authorId && vote.selected_participant_id === authorId;
    await client.from("votes").update({ is_correct: correct }).eq("id", vote.id);
  }

  if (game.scoring_enabled) {
    const { data: scoreRows } = await client.from("scores").select("*").eq("game_id", gameId);
    const current: Record<string, { score: number; correctGuesses: number; totalResponseTimeMs: number }> = {};
    for (const row of scoreRows ?? []) {
      current[row.participant_id] = {
        score: row.score,
        correctGuesses: row.correct_guesses,
        totalResponseTimeMs: row.total_response_time_ms,
      };
    }
    const deltas = voteList.map((vote) =>
      scoreVote(
        {
          votingParticipantId: vote.voting_participant_id,
          selectedParticipantId: vote.selected_participant_id,
          authorId,
          responseTimeMs: vote.response_time_ms,
        },
        {
          scoringEnabled: true,
          pointsForCorrect: 1,
          speedBonusEnabled: game.speed_bonus_enabled,
          speedBonusPoints: 1,
        },
      ),
    );
    const next = applyScoreDeltas(current, deltas);
    for (const [participantId, value] of Object.entries(next)) {
      await client
        .from("scores")
        .upsert(
          {
            game_id: gameId,
            participant_id: participantId,
            score: value.score,
            correct_guesses: value.correctGuesses,
            total_response_time_ms: value.totalResponseTimeMs,
          },
          { onConflict: "game_id,participant_id" },
        );
    }
  }

  const bars = aggregateVotes(
    voteList.map((v) => ({ selectedParticipantId: v.selected_participant_id })),
    (participants ?? []).map((p) => ({ id: p.id, displayName: p.display_name })),
    authorId,
  );
  const correctCount = voteList.filter(
    (v) => v.voting_participant_id !== authorId && v.selected_participant_id === authorId,
  ).length;
  const payload: ResultsPayload = {
    authorName,
    authorId,
    bars,
    totalVotes: voteList.length,
    correctCount,
    mostPopularName: bars[0] && bars[0].votes > 0 ? bars[0].displayName : null,
    message: revealFunMessage(correctCount, voteList.length),
  };

  const { data: scoreboard } = await client
    .from("scores")
    .select("participant_id, score, correct_guesses, total_response_time_ms, participants(display_name)")
    .eq("game_id", gameId);
  const leaderboard = buildLeaderboard(
    (scoreboard ?? []).map((row) => ({
      participantId: row.participant_id,
      displayName: relationName(row.participants),
      score: row.score,
      correctGuesses: row.correct_guesses,
      totalResponseTimeMs: row.total_response_time_ms,
    })),
  );

  await client
    .from("rounds")
    .update({ status: "revealed", revealed_at: new Date().toISOString(), voting_closed_at: new Date().toISOString() })
    .eq("id", currentRound.id);
  await client
    .from("games")
    .update({
      voting_status: "revealed",
      revealed_author_name: authorName,
      results_payload: payload,
      leaderboard_payload: leaderboard,
      show_vote_distribution: true,
      show_leaderboard: game.show_leaderboard_after_round,
      timer_ends_at: null,
    })
    .eq("id", gameId);
}

export async function skipCurrentFact(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (game.current_round_id) {
    const { data: round } = await client.from("rounds").select("fact_id").eq("id", game.current_round_id).single();
    await client.from("facts").update({ play_status: "skipped" }).eq("id", requireRow(round, "Round not found").fact_id);
  }
  await startRound(userId, gameId);
}

export async function previousRound(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (game.current_round_number <= 1) return;
  const { data: round } = await client
    .from("rounds")
    .select("*")
    .eq("game_id", gameId)
    .eq("round_number", game.current_round_number - 1)
    .maybeSingle();
  if (!round) return;
  const { data: fact } = await client
    .from("facts")
    .select("fact_text, participants(display_name)")
    .eq("id", round.fact_id)
    .single();
  const currentFact = requireRow(fact, "Fact not found");
  await client
    .from("games")
    .update({
      current_round_id: round.id,
      current_round_number: round.round_number,
      current_fact_text: currentFact.fact_text,
      voting_status: votingStatusFromRound(round.status),
      revealed_author_name:
        round.status === "revealed" ? relationName(currentFact.participants) : null,
      timer_ends_at: null,
    })
    .eq("id", gameId);
}

export async function pauseGame(userId: string, gameId: string, resume = false) {
  await setGameStatus(userId, gameId, resume ? "LIVE" : "PAUSED");
}

export async function endGame(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  await client
    .from("games")
    .update({
      status: "COMPLETED",
      voting_status: game.voting_status === "revealed" ? "revealed" : "closed",
      show_leaderboard: true,
      timer_ends_at: null,
    })
    .eq("id", gameId);
}

export async function resetCurrentRound(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  if (!game.current_round_id) return;
  await client.from("votes").delete().eq("round_id", game.current_round_id);
  const { data: round } = await client.from("rounds").select("fact_id").eq("id", game.current_round_id).single();
  await client.from("facts").update({ play_status: "available" }).eq("id", requireRow(round, "Round not found").fact_id);
  await client.from("rounds").delete().eq("id", game.current_round_id);
  await client
    .from("games")
    .update({
      current_round_id: null,
      current_round_number: Math.max(0, game.current_round_number - 1),
      current_fact_text: null,
      voting_status: "idle",
      votes_received: 0,
      revealed_author_name: null,
      results_payload: null,
      timer_ends_at: null,
    })
    .eq("id", gameId);
}

export async function togglePresenterFlag(
  userId: string,
  gameId: string,
  flag: "show_leaderboard" | "show_vote_distribution",
  value: boolean,
) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await client.from("games").update({ [flag]: value }).eq("id", gameId);
}

export async function adjustScore(userId: string, gameId: string, participantId: string, mode: "add" | "sub" | "set", value: number) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { data: row } = await client
    .from("scores")
    .select("*")
    .eq("game_id", gameId)
    .eq("participant_id", participantId)
    .maybeSingle();
  const current = row?.score ?? 0;
  const next = mode === "add" ? current + 1 : mode === "sub" ? current - 1 : value;
  await client.from("scores").upsert(
    {
      game_id: gameId,
      participant_id: participantId,
      score: next,
      correct_guesses: row?.correct_guesses ?? 0,
    },
    { onConflict: "game_id,participant_id" },
  );
  const { data: scoreboard } = await client
    .from("scores")
    .select("participant_id, score, correct_guesses, total_response_time_ms, participants(display_name)")
    .eq("game_id", gameId);
  const leaderboard = buildLeaderboard(
    (scoreboard ?? []).map((r) => ({
      participantId: r.participant_id,
      displayName: relationName(r.participants),
      score: r.score,
      correctGuesses: r.correct_guesses,
      totalResponseTimeMs: r.total_response_time_ms,
    })),
  );
  await client.from("games").update({ leaderboard_payload: leaderboard }).eq("id", gameId);
}

export async function resetScores(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await client.from("scores").update({ score: 0, correct_guesses: 0, total_response_time_ms: 0 }).eq("game_id", gameId);
  await client.from("games").update({ leaderboard_payload: [] }).eq("id", gameId);
}

export async function removeParticipant(userId: string, gameId: string, participantId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  await client.from("participants").update({ is_removed: true, is_active: false }).eq("id", participantId);
}

export async function getControlState(userId: string, gameId: string) {
  const client = db();
  const game = await requireFacilitator(userId, gameId, client);
  const facts = await listFacts(userId, gameId);
  const participants = await listParticipants(userId, gameId);
  let authorName: string | null = null;
  let upcoming: { id: string; preview: string } | null = null;
  const notVoted: string[] = [];

  if (game.current_round_id) {
    const { data: round } = await client.from("rounds").select("*").eq("id", game.current_round_id).single();
    const currentRound = requireRow(round, "No active round");
    const { data: fact } = await client
      .from("facts")
      .select("participant_id, participants(display_name)")
      .eq("id", currentRound.fact_id)
      .single();
    authorName = relationName(requireRow(fact, "Fact not found").participants);
    const { data: votes } = await client.from("votes").select("voting_participant_id").eq("round_id", currentRound.id);
    const voted = new Set((votes ?? []).map((v) => v.voting_participant_id));
    for (const p of participants) {
      if (!p.is_removed && !voted.has(p.id)) notVoted.push(p.display_name);
    }
  }

  const nextFact = facts.find((f) => f.moderation_status === "approved" && f.play_status === "available");
  if (nextFact) {
    upcoming = { id: nextFact.id, preview: `${String(nextFact.fact_text).slice(0, 40)}…` };
  }

  return { game, facts, participants, authorName, upcoming, notVoted };
}

export async function exportResultsCsv(userId: string, gameId: string) {
  const client = db();
  await requireFacilitator(userId, gameId, client);
  const { data } = await client
    .from("scores")
    .select("score, correct_guesses, participants(display_name)")
    .eq("game_id", gameId)
    .order("score", { ascending: false });
  const lines = ["rank,name,score,correct_guesses"];
  (data ?? []).forEach((row, i) => {
    const name = relationName(row.participants);
    lines.push(`${i + 1},"${name.replaceAll('"', '""')}",${row.score},${row.correct_guesses}`);
  });
  return lines.join("\n");
}

export { votingStatusFromRound };
