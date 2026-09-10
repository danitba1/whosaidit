import type { LeaderboardRow } from "@/lib/services/scoring";
import { cn } from "@/lib/utils";

export function Leaderboard({ rows, highlightTop = true }: { rows: LeaderboardRow[]; highlightTop?: boolean }) {
  if (!rows.length) {
    return <p className="text-muted">Scores will appear after the first reveal.</p>;
  }
  return (
    <ol className="space-y-2">
      {rows.map((row) => (
        <li
          key={row.participantId}
          className={cn(
            "flex items-center justify-between rounded-xl px-3 py-2",
            highlightTop && row.rank === 1 && "bg-amber-100",
            highlightTop && row.rank === 2 && "bg-slate-100",
            highlightTop && row.rank === 3 && "bg-orange-50",
          )}
        >
          <span className="font-medium">
            {row.rank}. {row.displayName}
          </span>
          <span>
            {row.score} pts · {row.correctGuesses} correct
          </span>
        </li>
      ))}
    </ol>
  );
}
