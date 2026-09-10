import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sanitizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function gameSubmitUrl(gameCode: string) {
  return `${appUrl()}/game/${gameCode}/submit`;
}

export function gamePlayUrl(gameCode: string) {
  return `${appUrl()}/game/${gameCode}/play`;
}

export function gamePresentUrl(gameCode: string) {
  return `${appUrl()}/game/${gameCode}/present`;
}

export function formatPercent(part: number, whole: number) {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
