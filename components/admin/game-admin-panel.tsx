"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteGameAction,
  resetGameAction,
  setStatusAction,
  updateSettingsAction,
} from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { GameCodeCard } from "@/components/game/game-code-card";
import { QRJoinCard } from "@/components/game/qr-join-card";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { GameRow } from "@/lib/services/game-engine";
import type { GameStatus } from "@/lib/constants";
import { gamePlayUrl, gamePresentUrl, gameSubmitUrl } from "@/lib/utils";

export function GameAdminPanel({ game }: { game: GameRow }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<null | "reset" | "delete">(null);
  const [message, setMessage] = useState<string | null>(null);
  const submitUrl = gameSubmitUrl(game.game_code);
  const playUrl = gamePlayUrl(game.game_code);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setMessage("Copied to clipboard.");
  }

  return (
    <div className="space-y-6">
      {message && <p className="rounded-xl bg-emerald-50 p-3 text-sm">{message}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        <GameCodeCard code={game.game_code} />
        <QRJoinCard url={submitUrl} label="QR for fact submission" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => copy(submitUrl)}>
          Copy PREP link
        </Button>
        <Button variant="outline" onClick={() => copy(playUrl)}>
          Copy play link
        </Button>
        <Link href={gamePresentUrl(game.game_code)} target="_blank">
          <Button variant="secondary">Open presenter</Button>
        </Link>
        <Link href={`/admin/games/${game.id}/control`}>
          <Button>Control room</Button>
        </Link>
        <Link href={`/admin/games/${game.id}/facts`}>
          <Button variant="outline">Facts</Button>
        </Link>
        <Link href={`/admin/games/${game.id}/results`}>
          <Button variant="outline">Results</Button>
        </Link>
      </div>
      <Card>
        <h2 className="font-display text-xl">Status: {game.status}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["COLLECTING_FACTS", "READY", "LIVE", "PAUSED", "COMPLETED"] as GameStatus[]).map((status) => (
            <Button
              key={status}
              size="sm"
              variant="outline"
              onClick={async () => {
                const result = await setStatusAction(game.id, status);
                setMessage("error" in result && result.error ? result.error : `Status set to ${status}`);
                router.refresh();
              }}
            >
              {status.replaceAll("_", " ")}
            </Button>
          ))}
        </div>
      </Card>
      <Card>
        <h2 className="font-display text-xl">Settings</h2>
        <form
          className="mt-4 space-y-3"
          action={async (formData) => {
            const result = await updateSettingsAction(game.id, formData);
            setMessage("error" in result && result.error ? result.error : "Settings saved.");
            router.refresh();
          }}
        >
          <div>
            <Label htmlFor="name">Game name</Label>
            <Input id="name" name="name" defaultValue={game.name} />
          </div>
          <div>
            <Label htmlFor="welcomeMessage">Welcome message</Label>
            <Textarea id="welcomeMessage" name="welcomeMessage" defaultValue={game.welcome_message ?? ""} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="scoringEnabled" defaultChecked={game.scoring_enabled} /> Scoring enabled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="speedBonusEnabled" defaultChecked={game.speed_bonus_enabled} /> Speed bonus
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="allowSelfVote" defaultChecked={game.allow_self_vote} /> Allow self-voting
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showVoteDetails" defaultChecked={game.show_vote_details} /> Show who voted for whom
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="showLeaderboardAfterRound" defaultChecked={game.show_leaderboard_after_round} /> Leaderboard after each round
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="wheelEnabled" defaultChecked={game.wheel_enabled} /> Spin wheel
          </label>
          <div>
            <Label htmlFor="timerDurationSeconds">Timer seconds (blank = none)</Label>
            <Input
              id="timerDurationSeconds"
              name="timerDurationSeconds"
              type="number"
              defaultValue={game.timer_duration_seconds ?? ""}
            />
          </div>
          <Button type="submit">Save settings</Button>
        </form>
      </Card>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setConfirm("reset")}>
          Reset entire game
        </Button>
        <Button variant="danger" onClick={() => setConfirm("delete")}>
          Delete all game data
        </Button>
      </div>
      <ConfirmationDialog
        open={confirm === "reset"}
        title="Reset this game?"
        message="Votes, rounds, and scores will be cleared. Facts stay for another playthrough."
        danger
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await resetGameAction(game.id);
          router.refresh();
        }}
      />
      <ConfirmationDialog
        open={confirm === "delete"}
        title="Delete all game data?"
        message="This permanently deletes the game, facts, votes, and scores."
        danger
        confirmLabel="Delete"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setConfirm(null);
          await deleteGameAction(game.id);
          router.push("/admin/games");
        }}
      />
    </div>
  );
}
