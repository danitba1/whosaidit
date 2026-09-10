import { publicStateAction } from "@/actions/play";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });
  const result = await publicStateAction(code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  const { state } = result;
  return NextResponse.json({
    name: state.name,
    status: state.status,
    currentFactText: state.currentFactText,
    votingStatus: state.votingStatus,
    revealedAuthorName: state.revealedAuthorName,
    votesReceived: state.votesReceived,
  });
}
