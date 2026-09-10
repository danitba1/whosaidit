"use client";

import { adjustScoreAction, exportCsvAction, resetScoresAction } from "@/actions/games";
import { Leaderboard } from "@/components/game/leaderboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { buildLeaderboard } from "@/lib/services/scoring";
import { useState } from "react";

type P = {
  id: string;
  display_name: string;
  is_removed: boolean;
  scores: Array<{ score: number; correct_guesses: number }> | { score: number; correct_guesses: number } | null;
};

export function ResultsClient({ gameId, participants }: { gameId: string; participants: P[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const rows = buildLeaderboard(
    participants
      .filter((p) => !p.is_removed)
      .map((p) => {
        const score = Array.isArray(p.scores) ? p.scores[0] : p.scores;
        return {
          participantId: p.id,
          displayName: p.display_name,
          score: score?.score ?? 0,
          correctGuesses: score?.correct_guesses ?? 0,
          totalResponseTimeMs: 0,
        };
      }),
  );

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm">{msg}</p>}
      <Card>
        <Leaderboard rows={rows} />
      </Card>
      <div className="space-y-2">
        {participants
          .filter((p) => !p.is_removed)
          .map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-white p-3">
              <span>{p.display_name}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void adjustScoreAction(gameId, p.id, "sub")}>
                  −1
                </Button>
                <Button size="sm" variant="outline" onClick={() => void adjustScoreAction(gameId, p.id, "add")}>
                  +1
                </Button>
              </div>
            </div>
          ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void resetScoresAction(gameId).then(() => setMsg("Scores reset."))}>
          Reset scores
        </Button>
        <Button
          onClick={async () => {
            const csv = await exportCsvAction(gameId);
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "who-said-it-results.csv";
            a.click();
          }}
        >
          Export CSV
        </Button>
      </div>
    </div>
  );
}
