import { cn } from "@/lib/utils";

export function ConnectionStatus({
  state,
}: {
  state: "connecting" | "connected" | "disconnected";
}) {
  const label =
    state === "connected" ? "Live" : state === "connecting" ? "Reconnecting…" : "Disconnected";
  return (
    <p className="inline-flex items-center gap-2 text-sm" aria-live="polite">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          state === "connected" && "bg-emerald-500",
          state === "connecting" && "bg-amber-400",
          state === "disconnected" && "bg-red-500",
        )}
      />
      <span>{label}</span>
    </p>
  );
}
