"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { gameCodeSchema } from "@/lib/validation/schemas";

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl">Join a game</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = gameCodeSchema.safeParse(code);
          if (!parsed.success) {
            setError("Enter a valid game code.");
            return;
          }
          router.push(`/game/${parsed.data}/play`);
        }}
      >
        <div>
          <Label htmlFor="code">Game code</Label>
          <Input
            id="code"
            value={code}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button className="w-full" size="lg" type="submit">
          Continue
        </Button>
      </form>
    </main>
  );
}
