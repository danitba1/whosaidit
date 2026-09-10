"use client";

import { publicStateAction } from "@/actions/play";
import { ConnectionStatus } from "@/components/game/connection-status";
import { CountdownTimer } from "@/components/game/countdown-timer";
import { FactCard } from "@/components/game/fact-card";
import { GameCodeCard } from "@/components/game/game-code-card";
import { Leaderboard } from "@/components/game/leaderboard";
import { QRJoinCard } from "@/components/game/qr-join-card";
import { RevealCard } from "@/components/game/reveal-card";
import { ResultsChart } from "@/components/game/results-chart";
import { VoteProgress } from "@/components/game/vote-progress";
import { ErrorState } from "@/components/ui/states";
import { useGameRealtime, usePresence } from "@/hooks/use-game-realtime";
import type { PublicGameState } from "@/lib/services/game-engine";
import { gamePlayUrl } from "@/lib/utils";
import confetti from "canvas-confetti";
import { use, useCallback, useEffect, useRef, useState } from "react";

export default function PresentPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = use(params);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastReveal = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await publicStateAction(gameCode);
    if (!result.ok) setError(result.error);
    else setState(result.state);
  }, [gameCode]);

  const connection = useGameRealtime(state?.gameId ?? null, refresh);
  const connected = usePresence(state?.gameId ?? null, "presenter");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (state?.votingStatus === "revealed" && state.revealedAuthorName && lastReveal.current !== state.revealedAuthorName) {
      lastReveal.current = state.revealedAuthorName;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduce) void confetti({ particleCount: 120, spread: 70, origin: { y: 0.7 } });
    }
  }, [state]);

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <ErrorState title="Presenter view unavailable" body={error} />
      </main>
    );
  }
  if (!state) return <main className="min-h-screen bg-slate-950 p-8 text-white">Loading presenter…</main>;

  const lobby = !state.currentFactText && state.status !== "COMPLETED";

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
        <p>{state.name}</p>
        <div className="flex items-center gap-4">
          <VoteProgress received={state.votesReceived} connected={connected} />
          <span className="rounded-full bg-white/10 px-3 py-1">
            Voting {state.votingStatus.toUpperCase()}
          </span>
          <ConnectionStatus state={connection} />
        </div>
      </div>

      {state.status === "COMPLETED" && (
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-6xl">And the winners are…</h1>
          <div className="mt-8 rounded-3xl bg-white p-6 text-left text-slate-900">
            <Leaderboard rows={state.leaderboard ?? []} />
          </div>
        </section>
      )}

      {lobby && state.status !== "COMPLETED" && (
        <section className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          <div>
            <h1 className="font-display text-6xl">Who Said It?</h1>
            <p className="mt-4 text-2xl text-amber-200">Scan to join the game</p>
            <div className="mt-8 max-w-xs">
              <GameCodeCard code={state.gameCode} />
            </div>
            <p className="mt-4 text-slate-300">{connected} connected player{connected === 1 ? "" : "s"}</p>
            <p className="mt-6 text-sm text-slate-400">The facilitator starts the game from the control panel.</p>
          </div>
          <QRJoinCard url={gamePlayUrl(state.gameCode)} label="Join on your phone" />
        </section>
      )}

      {!lobby && state.status !== "COMPLETED" && state.currentFactText && (
        <section className="mx-auto max-w-5xl">
          <div className="mb-4 flex items-end justify-between">
            <p className="text-lg text-slate-300">Round {state.currentRoundNumber}</p>
            <CountdownTimer endsAt={state.timerEndsAt} />
          </div>
          <FactCard fact={state.currentFactText} />
          {state.votingStatus === "revealed" && state.revealedAuthorName && (
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <RevealCard author={state.revealedAuthorName} />
              <div>
                {state.results && <p className="mb-4 text-xl text-amber-200">{state.results.message}</p>}
                {state.showVoteDistribution && state.results && (
                  <ResultsChart bars={state.results.bars} total={state.results.totalVotes} />
                )}
              </div>
            </div>
          )}
          {state.showLeaderboard && state.leaderboard && (
            <div className="mt-8 rounded-3xl bg-white p-6 text-slate-900">
              <h2 className="font-display mb-3 text-2xl">Leaderboard</h2>
              <Leaderboard rows={state.leaderboard} />
            </div>
          )}
          <p className="mt-8 text-right text-xs text-slate-500">{gamePlayUrl(state.gameCode)}</p>
        </section>
      )}
    </main>
  );
}
