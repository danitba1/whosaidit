"use client";

import { remainingSeconds, isWarningWindow } from "@/lib/services/timer";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function CountdownTimer({ endsAt }: { endsAt: string | null }) {
  const [left, setLeft] = useState<number | null>(remainingSeconds(endsAt));

  useEffect(() => {
    setLeft(remainingSeconds(endsAt));
    if (!endsAt) return;
    const id = window.setInterval(() => setLeft(remainingSeconds(endsAt)), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (left === null) return null;
  const warn = isWarningWindow(left);

  return (
    <p
      aria-live="polite"
      className={cn(
        "font-display text-4xl tabular-nums",
        warn && "text-amber-400",
      )}
    >
      {left}s
    </p>
  );
}
