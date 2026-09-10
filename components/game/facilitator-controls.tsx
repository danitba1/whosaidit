"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  closeVotingAction,
  endGameAction,
  nextFactAction,
  openVotingAction,
  pauseAction,
  previousFactAction,
  randomFactAction,
  resetRoundAction,
  revealAnswerAction,
  skipFactAction,
  startRoundAction,
  toggleFlagAction,
} from "@/actions/games";

export function FacilitatorControls({
  gameId,
  votingOpen,
  paused,
  showLeaderboard,
  showDistribution,
}: {
  gameId: string;
  votingOpen: boolean;
  paused: boolean;
  showLeaderboard: boolean;
  showDistribution: boolean;
}) {
  const [help, setHelp] = useState(false);
  const [confirm, setConfirm] = useState<null | "reveal" | "end" | "reset">(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<{ error?: string } | { ok?: boolean }>) => {
      const result = await fn();
      if (result && "error" in result && result.error) setMessage(result.error);
      else setMessage(null);
    },
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelp((v) => !v);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        if (votingOpen) setConfirm("reveal");
        else void run(() => revealAnswerAction(gameId));
      }
      if (e.key === "ArrowRight") void run(() => nextFactAction(gameId));
      if (e.key === "ArrowLeft") void run(() => previousFactAction(gameId));
      if (e.key.toLowerCase() === "r") void run(() => randomFactAction(gameId));
      if (e.key.toLowerCase() === "v") {
        void run(() => (votingOpen ? closeVotingAction(gameId) : openVotingAction(gameId)));
      }
      if (e.key.toLowerCase() === "l") void run(() => toggleFlagAction(gameId, "show_leaderboard", !showLeaderboard));
      if (e.key.toLowerCase() === "p") void run(() => pauseAction(gameId, paused));
      if (e.key.toLowerCase() === "f") void document.documentElement.requestFullscreen?.();
      if (e.key === "Escape" && document.fullscreenElement) void document.exitFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameId, paused, run, showLeaderboard, votingOpen]);

  const actions = [
    ["Start / next fact", () => startRoundAction(gameId)],
    [votingOpen ? "Close voting" : "Open voting", () => (votingOpen ? closeVotingAction(gameId) : openVotingAction(gameId))],
    ["Reveal answer", async () => {
      if (votingOpen) {
        setConfirm("reveal");
        return { ok: true };
      }
      return revealAnswerAction(gameId);
    }],
    ["Previous fact", () => previousFactAction(gameId)],
    ["Skip fact", () => skipFactAction(gameId)],
    ["Random fact", () => randomFactAction(gameId)],
    [paused ? "Resume" : "Pause", () => pauseAction(gameId, paused)],
    [showLeaderboard ? "Hide leaderboard" : "Show leaderboard", () => toggleFlagAction(gameId, "show_leaderboard", !showLeaderboard)],
    [showDistribution ? "Hide distribution" : "Show distribution", () => toggleFlagAction(gameId, "show_vote_distribution", !showDistribution)],
  ] as const;

  return (
    <div>
      {message && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-danger">{message}</p>}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {actions.map(([label, fn]) => (
          <Button key={label} variant="outline" onClick={() => void run(fn)}>
            {label}
          </Button>
        ))}
        <Button variant="outline" onClick={() => setConfirm("reset")}>
          Reset round
        </Button>
        <Button variant="danger" onClick={() => setConfirm("end")}>
          End game
        </Button>
        <Button variant="ghost" onClick={() => setHelp(true)}>
          Shortcuts
        </Button>
      </div>

      <ConfirmationDialog
        open={confirm === "reveal"}
        title="Reveal while voting is open?"
        message="Voting will close automatically and scores will be calculated."
        confirmLabel="Reveal"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => revealAnswerAction(gameId));
        }}
      />
      <ConfirmationDialog
        open={confirm === "end"}
        title="End this game?"
        message="Players will see the final leaderboard. You can still export results."
        danger
        confirmLabel="End game"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => endGameAction(gameId));
        }}
      />
      <ConfirmationDialog
        open={confirm === "reset"}
        title="Reset the current round?"
        message="Votes for this round will be deleted and the fact can be played again."
        danger
        confirmLabel="Reset round"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void run(() => resetRoundAction(gameId));
        }}
      />
      {help && (
        <ConfirmationDialog
          open
          title="Keyboard shortcuts"
          message="Space reveal · ← → facts · R random · V voting · L leaderboard · P pause · F fullscreen · Esc exit fullscreen"
          confirmLabel="Close"
          onCancel={() => setHelp(false)}
          onConfirm={() => setHelp(false)}
        />
      )}
    </div>
  );
}
