import { NextRequest, NextResponse } from "next/server";
import { extractSummary } from "@/lib/ai";

// POST /api/autofill  { text: string } -> { summary: DischargeSummary }
// Parses free-form dictation into structured discharge fields via Groq.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "No dictation text provided." },
        { status: 400 }
      );
    }
    const summary = await extractSummary(text);
    return NextResponse.json({ summary });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "Auto-fill failed." },
      { status: 500 }
    );
  }
}
