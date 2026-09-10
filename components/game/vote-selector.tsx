"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function VoteSelector({
  participants,
  selectedId,
  disabledIds,
  onSelect,
  onSubmit,
  disabled,
  hasVoted,
}: {
  participants: Array<{ id: string; displayName: string }>;
  selectedId: string | null;
  disabledIds?: string[];
  onSelect: (id: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  hasVoted?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return participants.filter((p) => p.displayName.toLowerCase().includes(needle));
  }, [participants, q]);

  return (
    <div className="space-y-4">
      {participants.length > 8 && (
        <Input
          placeholder="Search names"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search participants"
        />
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {filtered.map((p) => {
          const blocked = disabledIds?.includes(p.id);
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled || blocked}
              onClick={() => onSelect(p.id)}
              className={cn(
                "min-h-12 rounded-xl border px-3 text-left font-medium",
                selectedId === p.id ? "border-accent bg-teal-50 ring-2 ring-accent" : "border-slate-200 bg-white",
                blocked && "opacity-40",
              )}
            >
              {p.displayName}
            </button>
          );
        })}
      </div>
      <Button className="w-full" size="lg" disabled={disabled || !selectedId} onClick={onSubmit}>
        {hasVoted ? "Update vote" : "Submit vote"}
      </Button>
    </div>
  );
}
