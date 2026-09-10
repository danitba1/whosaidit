"use client";

import { joinGameAction, publicStateAction, voteAction } from "@/actions/play";
import { CountdownTimer } from "@/components/game/countdown-timer";
import { ConnectionStatus } from "@/components/game/connection-status";
import { Leaderboard } from "@/components/game/leaderboard";
import { ResultsChart } from "@/components/game/results-chart";
import { VoteSelector } from "@/components/game/vote-selector";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/states";
import { useGameRealtime } from "@/hooks/use-game-realtime";
import { useParticipantIdentity } from "@/hooks/use-participant";
import type { PublicGameState } from "@/lib/services/game-engine";
import { use, useCallback, useEffect, useState } from "react";

export default function PlayPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = use(params);
  const identity = useParticipantIdentity(gameCode);
  const [joined, setJoined] = useState(false);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Waiting for the game to start.");

  const refresh = useCallback(async () => {
    if (!identity.clientToken) return;
    const result = await publicStateAction(gameCode, identity.clientToken);
    if (!result.ok) setError(result.error);
    else {
      setState(result.state);
      setSelected(result.state.myVoteSelectedId);
      if (result.state.status === "COMPLETED") setStatusMessage("Game completed.");
      else if (result.state.votingStatus === "revealed") setStatusMessage("Answer revealed.");
      else if (result.state.votingStatus === "closed") setStatusMessage("Voting closed.");
      else if (result.state.votingStatus === "open") setStatusMessage("Vote now.");
      else if (result.state.currentFactText) setStatusMessage("Waiting for the next fact.");
      else setStatusMessage("Waiting for the game to start.");
    }
  }, [gameCode, identity.clientToken]);

  const connection = useGameRealtime(state?.gameId ?? null, refresh);

  useEffect(() => {
    if (identity.ready && identity.clientToken) void refresh();
  }, [identity.ready, identity.clientToken, refresh]);

  if (error) {
    return (
      <main className="p-6">
        <ErrorState title="Can't join this game" body={error} />
      </main>
    );
  }

  if (!identity.ready) return <main className="p-6">Loading…</main>;

  if (!joined) {
    return (
      <main className="mx-auto max-w-md px-6 py-10">
        <h1 className="font-display text-4xl">Join the live game</h1>
        <form
          className="mt-8 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const token = identity.persist(identity.displayName);
            const result = await joinGameAction({
              gameCode,
              displayName: identity.displayName,
              clientToken: token,
            });
            if ("error" in result && result.error) setError(result.error);
            else {
              setJoined(true);
              await refresh();
            }
          }}
        >
          <div>
            <Label htmlFor="name">Display name</Label>
            <Input id="name" required value={identity.displayName} onChange={(e) => identity.setDisplayName(e.target.value)} />
          </div>
          <Button className="w-full" size="lg" type="submit">
            Join
          </Button>
        </form>
      </main>
    );
  }

  if (!state) return <main className="p-6">Connecting…</main>;

  const votingOpen = state.votingStatus === "open" && state.status === "LIVE";
  const selfId = state.allowSelfVote ? undefined : state.myParticipantId ? [state.myParticipantId] : undefined;

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted">{state.name}</p>
        <ConnectionStatus state={connection} />
      </div>
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>
      {state.status === "COMPLETED" && state.leaderboard && (
        <section>
          <h1 className="font-display text-3xl">Final leaderboard</h1>
          <div className="mt-4">
            <Leaderboard rows={state.leaderboard} />
          </div>
        </section>
      )}
      {state.status !== "COMPLETED" && (
        <>
          {state.currentFactText ? (
            <section>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Round {state.currentRoundNumber}</p>
              <h1 className="font-display mt-2 text-3xl">Who said it?</h1>
              <p className="mt-4 rounded-2xl bg-white p-5 text-xl shadow-sm">“{state.currentFactText}”</p>
              <div className="mt-4">
                <CountdownTimer endsAt={state.timerEndsAt} />
              </div>
              {state.votingStatus === "revealed" && state.revealedAuthorName && (
                <div className="mt-6">
                  <p className="text-sm uppercase tracking-widest">It was…</p>
                  <p className="font-display text-3xl">{state.revealedAuthorName}</p>
                  {state.results && <p className="mt-2 text-muted">{state.results.message}</p>}
                  {state.showVoteDistribution && state.results && (
                    <div className="mt-4 text-slate-900">
                      <ResultsChart bars={state.results.bars} total={state.results.totalVotes} />
                    </div>
                  )}
                </div>
              )}
              {votingOpen && (
                <div className="mt-6">
                  {state.myVoteSelectedId && (
                    <p className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm">Vote received. You can change it until voting closes.</p>
                  )}
                  <VoteSelector
                    participants={state.participants}
                    selectedId={selected}
                    disabledIds={selfId}
                    onSelect={setSelected}
                    hasVoted={Boolean(state.myVoteSelectedId)}
                    onSubmit={async () => {
                      if (!selected) return;
                      const result = await voteAction({
                        gameCode,
                        clientToken: identity.clientToken,
                        selectedParticipantId: selected,
                      });
                      if ("error" in result && result.error) setError(result.error);
                      else await refresh();
                    }}
                  />
                </div>
              )}
              {!votingOpen && state.votingStatus !== "revealed" && (
                <p className="mt-6 text-muted">{statusMessage}</p>
              )}
            </section>
          ) : (
            <p className="font-display text-3xl">{statusMessage}</p>
          )}
          {state.showLeaderboard && state.leaderboard && (
            <section className="mt-8">
              <h2 className="font-display text-2xl">Leaderboard</h2>
              <Leaderboard rows={state.leaderboard} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
