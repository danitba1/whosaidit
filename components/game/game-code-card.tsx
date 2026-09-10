"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function GameCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="text-center">
      <p className="text-sm text-muted">Game code</p>
      <p className="font-display mt-1 text-4xl tracking-[0.3em]">{code}</p>
      <Button
        className="mt-4"
        variant="outline"
        onClick={async () => {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? "Copied" : "Copy code"}
      </Button>
    </Card>
  );
}
