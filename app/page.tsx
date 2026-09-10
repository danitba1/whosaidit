import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-accent">Team icebreaker</p>
      <h1 className="font-display mt-3 text-5xl leading-tight md:text-7xl">Who Said It?</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Collect surprising facts before the meeting. During the game, one anonymous line lights up the
        big screen, everyone votes from their phone, and the facilitator reveals the author.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/join">
          <Button size="lg">Join a game</Button>
        </Link>
        <Link href="/admin/login">
          <Button size="lg" variant="secondary">
            Facilitator login
          </Button>
        </Link>
      </div>
    </main>
  );
}
