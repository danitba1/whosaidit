import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportResultsCsv } from "@/lib/services/game-engine";

export async function GET(_request: Request, context: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const csv = await exportResultsCsv(user.id, gameId);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="who-said-it-${gameId}.csv"`,
    },
  });
}
