import Link from "next/link";
import { signOutAction } from "@/actions/auth";
import { getMyGames } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

export default async function GamesPage() {
  const games = await getMyGames();
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl">Your games</h1>
        <div className="flex gap-2">
          <Link href="/admin/games/new">
            <Button>New game</Button>
          </Link>
          <form action={signOutAction}>
            <Button variant="outline" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
      <div className="mt-8 space-y-3">
        {games.length === 0 && <EmptyState title="No games yet" body="Create a game to get a code and collect facts." />}
        {games.map((game) => (
          <Link key={game.id} href={`/admin/games/${game.id}`}>
            <Card className="flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="font-semibold">{game.name}</p>
                <p className="text-sm text-muted">{game.game_code}</p>
              </div>
              <Badge>{game.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
