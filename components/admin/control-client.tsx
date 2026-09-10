"use client";

import { loadControl, startRoundAction } from "@/actions/games";
import { FacilitatorControls } from "@/components/game/facilitator-controls";
import { ConnectionStatus } from "@/components/game/connection-status";
import { SpinWheel } from "@/components/game/spin-wheel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGameRealtime, usePresence } from "@/hooks/use-game-realtime";
import { useCallback, useEffect, useState } from "react";

type Control = Awaited<ReturnType<typeof loadControl>>;

export function ControlClient({ initial, gameId }: { initial: Control; gameId: string }) {
  const [data, setData] = useState(initial);
  const refresh = useCallback(() => {
    void loadControl(gameId).then(setData);
  }, [gameId]);
  const connection = useGameRealtime(gameId, refresh);
  const connected = usePresence(gameId, "facilitator");
  const unused = data.facts.filter((f) => f.moderation_status === "approved" && f.play_status === "available");

  useEffect(() => {
    setData(initial);
  }, [initial]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge>{data.game.status}</Badge>
        <ConnectionStatus state={connection} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">Correct author (private)</p>
          <p className="font-display text-3xl">{data.authorName ?? "—"}</p>
          <p className="mt-2 text-sm">Round {data.game.current_round_number}</p>
          <p className="text-sm">Votes {data.game.votes_received} · Connected {connected}</p>
          <p className="mt-2 text-sm">Upcoming: {data.upcoming?.preview ?? "None"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Not yet voted</p>
          <p>{data.notVoted.length ? data.notVoted.join(", ") : "Everyone who joined has voted, or voting is idle."}</p>
        </Card>
      </div>
      <FacilitatorControls
        gameId={gameId}
        votingOpen={data.game.voting_status === "open"}
        paused={data.game.status === "PAUSED"}
        showLeaderboard={data.game.show_leaderboard}
        showDistribution={data.game.show_vote_distribution}
      />
      {data.game.wheel_enabled && (
        <Card>
          <h2 className="font-display text-xl">Spin wheel</h2>
          <p className="text-sm text-muted">Generic numbered entries only — no names or fact text.</p>
          <SpinWheel
            count={unused.length}
            onSelectIndex={(index) => {
              const fact = unused[index];
              if (fact) void startRoundAction(gameId, { factId: fact.id });
            }}
          />
        </Card>
      )}
    </div>
  );
}
