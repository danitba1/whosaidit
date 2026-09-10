"use client";

import { createGameAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useState } from "react";

export default function NewGamePage() {
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-4xl">Create a game</h1>
      <form
        className="mt-8 space-y-4"
        action={async (formData) => {
          setError(null);
          try {
            await createGameAction(formData);
          } catch (err) {
            const digest = typeof err === "object" && err && "digest" in err ? String(err.digest) : "";
            if (digest.startsWith("NEXT_REDIRECT")) throw err;
            setError(err instanceof Error ? err.message : "Could not create the game.");
          }
        }}
      >
        <div>
          <Label htmlFor="name">Game name</Label>
          <Input id="name" name="name" required placeholder="Leadership offsite" />
        </div>
        <div>
          <Label htmlFor="welcomeMessage">Welcome message (optional)</Label>
          <Textarea id="welcomeMessage" name="welcomeMessage" rows={3} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button size="lg" type="submit">
          Create game
        </Button>
      </form>
    </main>
  );
}
