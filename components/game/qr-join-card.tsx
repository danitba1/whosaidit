"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Card } from "@/components/ui/card";

export function QRJoinCard({ url, label }: { url: string; label: string }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: "#152033", light: "#ffffff" } }).then(setSrc);
  }, [url]);

  return (
    <Card className="text-center">
      <p className="text-sm font-medium text-muted">{label}</p>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="QR code to join the game" className="mx-auto mt-3 h-48 w-48" />
      ) : (
        <div className="mx-auto mt-3 h-48 w-48 animate-pulse rounded-xl bg-slate-100" />
      )}
      <p className="mt-3 break-all text-xs text-muted">{url}</p>
    </Card>
  );
}
