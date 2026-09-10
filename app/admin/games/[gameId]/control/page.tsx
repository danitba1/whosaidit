import Link from "next/link";
import { loadControl } from "@/actions/games";
import { ControlClient } from "@/components/admin/control-client";

export default async function ControlPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const data = await loadControl(gameId);
  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href={`/admin/games/${gameId}`} className="text-sm text-accent">
        ← Game setup
      </Link>
      <h1 className="font-display mt-2 text-4xl">Control room</h1>
      <p className="text-muted">Keep this on a laptop. Put the presenter view on the projector.</p>
      <div className="mt-6">
        <ControlClient gameId={gameId} initial={data} />
      </div>
    </main>
  );
}
