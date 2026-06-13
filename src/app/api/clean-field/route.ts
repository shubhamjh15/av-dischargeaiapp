import { NextRequest, NextResponse } from "next/server";
import { cleanField } from "@/lib/ai";
import { DischargeSummary } from "@/lib/schema";

// POST /api/clean-field { text, fieldKey, label, currentSummary? } -> { text }
export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ text: "" });
  }

  const text    = String(body?.text     ?? "").trim();
  const fieldKey = String(body?.fieldKey ?? "");
  const label   = String(body?.label    ?? fieldKey ?? "field");
  const currentSummary = (body?.currentSummary ?? undefined) as Partial<DischargeSummary> | undefined;

  if (!text) return NextResponse.json({ text: "" });

  try {
    const cleaned = await cleanField(text, fieldKey, label, currentSummary);
    return NextResponse.json({ text: cleaned });
  } catch {
    // Never lose the doctor's text — fallback to raw on any AI error
    return NextResponse.json({ text });
  }
}
