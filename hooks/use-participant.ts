"use client";

import { useCallback, useEffect, useState } from "react";

const keyFor = (gameCode: string) => `who-said-it:${gameCode.toUpperCase()}`;

export function getOrCreateToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useParticipantIdentity(gameCode: string) {
  const [displayName, setDisplayName] = useState("");
  const [clientToken, setClientToken] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(keyFor(gameCode));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { displayName?: string; clientToken?: string };
        setDisplayName(parsed.displayName ?? "");
        setClientToken(parsed.clientToken || getOrCreateToken());
      } catch {
        setClientToken(getOrCreateToken());
      }
    } else {
      setClientToken(getOrCreateToken());
    }
    setReady(true);
  }, [gameCode]);

  const persist = useCallback(
    (name: string, token = clientToken) => {
      const nextToken = token || getOrCreateToken();
      setDisplayName(name);
      setClientToken(nextToken);
      localStorage.setItem(keyFor(gameCode), JSON.stringify({ displayName: name, clientToken: nextToken }));
      return nextToken;
    },
    [clientToken, gameCode],
  );

  return { displayName, clientToken, ready, persist, setDisplayName };
}
