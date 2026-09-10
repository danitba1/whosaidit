import { loadGame, loadParticipants } from "@/actions/games";
import { GameAdminPanel } from "@/components/admin/game-admin-panel";
import { Card } from "@/components/ui/card";
import { ParticipantList } from "@/components/game/participant-list";

export default async function GameAdminPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const [game, participants] = await Promise.all([loadGame(gameId), loadParticipants(gameId)]);
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display text-4xl">{game.name}</h1>
      <p className="mt-1 text-muted">Manage collection, players, and playback.</p>
      <div className="mt-8">
        <GameAdminPanel game={game} />
      </div>
      <Card className="mt-6">
        <h2 className="font-display text-xl">Participants</h2>
        <div className="mt-3">
          <ParticipantList names={participants.filter((p) => !p.is_removed).map((p) => p.display_name)} />
        </div>
      </Card>
    </main>
  );
}
