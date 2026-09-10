"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addFactAction, moderateFactAction, randomizeFactsAction, resetUsedFactsAction } from "@/actions/games";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

type FactRow = {
  id: string;
  fact_text: string;
  moderation_status: string;
  play_status: string;
  participants: { display_name: string } | { display_name: string }[] | null;
};

export function FactsManager({ gameId, facts }: { gameId: string; facts: FactRow[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const counts = facts.reduce<Record<string, number>>((acc, fact) => {
    const name = Array.isArray(fact.participants) ? fact.participants[0]?.display_name : fact.participants?.display_name;
    if (name) acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void randomizeFactsAction(gameId).then(() => router.refresh())}>
          Randomize order
        </Button>
        <Button variant="outline" onClick={() => void resetUsedFactsAction(gameId).then(() => router.refresh())}>
          Reset used facts
        </Button>
      </div>
      <Card>
        <h2 className="font-display text-xl">Add a fact manually</h2>
        <form
          className="mt-4 space-y-3"
          action={async (formData) => {
            await addFactAction(gameId, formData);
            router.refresh();
          }}
        >
          <div>
            <Label htmlFor="displayName">Participant name</Label>
            <Input id="displayName" name="displayName" required />
          </div>
          <div>
            <Label htmlFor="factText">Fact</Label>
            <Textarea id="factText" name="factText" required />
          </div>
          <Button type="submit">Add and approve</Button>
        </form>
      </Card>
      {facts.length === 0 && <EmptyState title="No facts yet" body="Share the PREP link so people can submit." />}
      {facts.map((fact) => {
        const name = Array.isArray(fact.participants) ? fact.participants[0]?.display_name : fact.participants?.display_name;
        return (
          <Card key={fact.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{name}</p>
                {(counts[name ?? ""] ?? 0) > 1 && <p className="text-xs text-muted">Multiple facts from this person</p>}
                <textarea
                  className="mt-2 w-full rounded-xl border p-2"
                  value={editing[fact.id] ?? fact.fact_text}
                  onChange={(e) => setEditing((s) => ({ ...s, [fact.id]: e.target.value }))}
                />
              </div>
              <div className="flex gap-2">
                <Badge tone={fact.moderation_status === "approved" ? "green" : fact.moderation_status === "rejected" ? "red" : "amber"}>
                  {fact.moderation_status}
                </Badge>
                <Badge>{fact.play_status}</Badge>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void moderateFactAction(gameId, fact.id, "approve", editing[fact.id]).then(() => router.refresh())}>
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateFactAction(gameId, fact.id, "reject").then(() => router.refresh())}>
                Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateFactAction(gameId, fact.id, "available").then(() => router.refresh())}>
                Available
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateFactAction(gameId, fact.id, "skipped").then(() => router.refresh())}>
                Skip
              </Button>
              <Button size="sm" variant="outline" onClick={() => void moderateFactAction(gameId, fact.id, "used").then(() => router.refresh())}>
                Used
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void moderateFactAction(gameId, fact.id, "approve", editing[fact.id] ?? fact.fact_text).then(() => router.refresh())}
              >
                Save edit
              </Button>
              <Button size="sm" variant="danger" onClick={() => setDeleteId(fact.id)}>
                Delete
              </Button>
            </div>
          </Card>
        );
      })}
      <ConfirmationDialog
        open={Boolean(deleteId)}
        title="Delete this fact?"
        message="This cannot be undone."
        danger
        confirmLabel="Delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) await moderateFactAction(gameId, deleteId, "delete");
          setDeleteId(null);
          router.refresh();
        }}
      />
    </div>
  );
}
