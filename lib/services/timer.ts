export function timerEndsAt(now: Date, durationSeconds: number | null) {
  if (!durationSeconds) return null;
  return new Date(now.getTime() + durationSeconds * 1000);
}

export function remainingSeconds(endsAt: Date | string | null, now = new Date()) {
  if (!endsAt) return null;
  const end = typeof endsAt === "string" ? new Date(endsAt) : endsAt;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 1000));
}

export function isExpired(endsAt: Date | string | null, now = new Date()) {
  const remaining = remainingSeconds(endsAt, now);
  return remaining !== null && remaining <= 0;
}

export function isWarningWindow(secondsLeft: number | null) {
  return secondsLeft !== null && secondsLeft > 0 && secondsLeft <= 5;
}
