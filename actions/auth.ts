"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppError, createGame, listGames } from "@/lib/services/game-engine";
import { createGameSchema } from "@/lib/validation/schemas";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("Please sign in.", "UNAUTHORIZED");
  return user;
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Invalid email or password." };
  redirect("/admin/games");
}

export async function signUpAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "Facilitator");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message };
  return { ok: true, message: "Check your email if confirmation is required, then sign in." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function createGameAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = createGameSchema.safeParse({
    name: formData.get("name"),
    welcomeMessage: formData.get("welcomeMessage") ?? "",
  });
  if (!parsed.success) {
    throw new AppError(parsed.error.issues[0]?.message ?? "Invalid game details.", "VALIDATION");
  }
  const game = await createGame(user.id, parsed.data.name, parsed.data.welcomeMessage || undefined);
  revalidatePath("/admin/games");
  redirect(`/admin/games/${game.id}`);
}

export async function getMyGames() {
  const user = await requireUser();
  return listGames(user.id);
}
