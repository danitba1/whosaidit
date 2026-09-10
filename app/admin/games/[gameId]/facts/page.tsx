import Link from "next/link";
import { loadFacts } from "@/actions/games";
import { FactsManager } from "@/components/admin/facts-manager";

export default async function FactsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const facts = await loadFacts(gameId);
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link href={`/admin/games/${gameId}`} className="text-sm text-accent">
        ← Back to game
      </Link>
      <h1 className="font-display mt-3 text-4xl">Facts</h1>
      <div className="mt-6">
        <FactsManager gameId={gameId} facts={facts} />
      </div>
    </main>
  );
}
