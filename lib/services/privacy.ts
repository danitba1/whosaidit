// Supabase surfaces network problems as plain objects whose fields are
// non-enumerable, so console logging them yields "{}". Flatten to strings.
export function describeError(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause as { code?: string; message?: string } | undefined;
    return [error.name, error.message, cause?.code, cause?.message].filter(Boolean).join(" | ");
  }
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    return [e.code, e.message, e.details, e.hint].filter(Boolean).join(" | ") || JSON.stringify(error);
  }
  return String(error);
}

export function hideAuthorUntilReveal<T>(
  votingStatus: "idle" | "open" | "closed" | "revealed",
  authorName: string | null,
  results: T | null,
) {
  if (votingStatus !== "revealed") {
    return { revealedAuthorName: null as string | null, results: null as T | null };
  }
  return { revealedAuthorName: authorName, results };
}
