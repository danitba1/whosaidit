"use client";

import { signInAction, signUpAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useState } from "react";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl">Facilitator {mode === "in" ? "sign in" : "sign up"}</h1>
      <form
        className="mt-8 space-y-4"
        action={async (formData) => {
          setError(null);
          setInfo(null);
          const result = mode === "in" ? await signInAction(formData) : await signUpAction(formData);
          if (!result) return;
          if ("error" in result && result.error) {
            setError(result.error);
            return;
          }
          if ("message" in result) setInfo(result.message);
        }}
      >
        {mode === "up" && (
          <div>
            <Label htmlFor="displayName">Display name</Label>
            <Input id="displayName" name="displayName" defaultValue="Facilitator" />
          </div>
        )}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {info && <p className="text-sm text-accent">{info}</p>}
        <Button className="w-full" size="lg" type="submit">
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
      </form>
      <button className="mt-4 text-sm text-accent underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Need an account?" : "Already have an account?"}
      </button>
    </main>
  );
}
