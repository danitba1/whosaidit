"use client";

import { submitFactAction } from "@/actions/play";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/states";
import { useParticipantIdentity } from "@/hooks/use-participant";
import { publicStateAction } from "@/actions/play";
import { use, useEffect, useState } from "react";
import type { PublicGameState } from "@/lib/services/game-engine";

export default function SubmitPage({ params }: { params: Promise<{ gameCode: string }> }) {
  const { gameCode } = use(params);
  const identity = useParticipantIdentity(gameCode);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fact, setFact] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    void publicStateAction(gameCode).then((result) => {
      if (!result.ok) setLoadError(result.error);
      else setState(result.state);
    });
  }, [gameCode]);

  if (loadError) return <main className="p-8"><ErrorState title="Invalid game code" body={loadError} /></main>;
  if (!state || !identity.ready) return <main className="p-8">Loading…</main>;
  if (!state.submissionOpen) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <ErrorState title="Submission is closed" body="The facilitator is not collecting facts right now." />
      </main>
    );
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <Card>
          <h1 className="font-display text-3xl">You&apos;re all set</h1>
          <p className="mt-3 text-muted">See you in the live game. Keep your phone handy for voting.</p>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <p className="text-sm uppercase tracking-widest text-accent">{state.name}</p>
      <h1 className="font-display mt-2 text-4xl">Tell us something funny about yourself</h1>
      {state.welcomeMessage && <p className="mt-3 text-muted">{state.welcomeMessage}</p>}
      {message && (
        <div className="mt-6 rounded-2xl bg-emerald-50 p-4">
          <p>{message}</p>
          <div className="mt-3 flex gap-2">
            <Button
              onClick={() => {
                setFact("");
                setMessage(null);
              }}
            >
              Submit another fact
            </Button>
            <Button variant="outline" onClick={() => setDone(true)}>
              Done
            </Button>
          </div>
        </div>
      )}
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          const token = identity.persist(identity.displayName);
          const result = await submitFactAction({
            gameCode,
            displayName: identity.displayName,
            factText: fact,
            clientToken: token,
          });
          if ("error" in result && result.error) setError(result.error);
          else {
            setMessage("Your fact was submitted successfully. The facilitator will review it before the game.");
            setFact("");
          }
        }}
      >
        <div>
          <Label htmlFor="name">Your display name</Label>
          <Input id="name" required value={identity.displayName} onChange={(e) => identity.setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="fact">Funny or surprising fact</Label>
          <Textarea id="fact" required rows={4} maxLength={280} value={fact} onChange={(e) => setFact(e.target.value)} />
        </div>
        <p className="text-sm text-muted">
          Your fact is shown anonymously first. Your name is revealed later during the game. We only store a display name.
        </p>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" size="lg" type="submit">
          Submit
        </Button>
      </form>
    </main>
  );
}
