"use client";

import { motion } from "framer-motion";
import type { VoteBar } from "@/lib/services/scoring";
import { formatPercent } from "@/lib/utils";

export function ResultsChart({ bars, total }: { bars: VoteBar[]; total: number }) {
  if (total === 0) {
    return <p className="text-center text-slate-200">No votes this round.</p>;
  }
  return (
    <ul className="space-y-3">
      {bars
        .filter((b) => b.votes > 0 || b.isAuthor)
        .map((bar) => (
          <li key={bar.participantId}>
            <div className="mb-1 flex justify-between text-sm">
              <span>
                {bar.displayName}
                {bar.isAuthor ? " (correct)" : ""}
              </span>
              <span>
                {bar.votes} · {formatPercent(bar.votes, total)}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${total ? (bar.votes / total) * 100 : 0}%` }}
                className={bar.isAuthor ? "h-full rounded-full bg-amber-400" : "h-full rounded-full bg-teal-300"}
              />
            </div>
          </li>
        ))}
    </ul>
  );
}
