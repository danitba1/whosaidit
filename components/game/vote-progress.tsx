export function VoteProgress({ received, connected }: { received: number; connected?: number }) {
  return (
    <p className="text-sm">
      Votes received: <strong>{received}</strong>
      {typeof connected === "number" ? ` · Players connected: ${connected}` : null}
    </p>
  );
}
