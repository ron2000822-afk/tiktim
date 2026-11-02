import { NextResponse } from "next/server";
import { autocomplete } from "@/lib/queries/autocomplete";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await autocomplete(q);
  return NextResponse.json({ suggestions });
}
