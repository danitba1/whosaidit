import { NextResponse } from "next/server";
import { describeError } from "@/lib/services/privacy";

function hostOf(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return "invalid-url";
  }
}

// Diagnostic only: reports whether config is present and whether the database
// answers. Never returns key material.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const env = {
    supabaseUrlSet: Boolean(url),
    supabaseUrlHost: hostOf(url),
    anonKeySet: Boolean(anonKey),
    anonKeyLength: anonKey?.length ?? 0,
    serviceRoleKeySet: Boolean(serviceKey),
    serviceRoleKeyLength: serviceKey?.length ?? 0,
    appUrlHost: hostOf(process.env.NEXT_PUBLIC_APP_URL),
  };

  let database: { ok: boolean; error?: string } = {
    ok: false,
    error: "not attempted",
  };

  if (url && anonKey) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/games?select=id&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        cache: "no-store",
      });
      database = response.ok
        ? { ok: true }
        : { ok: false, error: `HTTP ${response.status}: ${(await response.text()).slice(0, 200)}` };
    } catch (error) {
      database = { ok: false, error: describeError(error) };
    }
  } else {
    database = { ok: false, error: "missing url or anon key" };
  }

  return NextResponse.json({ env, database }, { headers: { "cache-control": "no-store" } });
}
