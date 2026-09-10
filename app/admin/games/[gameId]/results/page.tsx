import Link from "next/link";
import { loadParticipants } from "@/actions/games";
import { ResultsClient } from "@/components/admin/results-client";

export default async function ResultsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const participants = await loadParticipants(gameId);
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/admin/games/${gameId}`} className="text-sm text-accent">
        ← Back
      </Link>
      <h1 className="font-display mt-2 text-4xl">Results</h1>
      <div className="mt-6">
        <ResultsClient gameId={gameId} participants={participants} />
      </div>
    </main>
  );
}
