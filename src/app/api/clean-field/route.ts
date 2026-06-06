import { NextRequest, NextResponse } from "next/server";
import { cleanField } from "@/lib/ai";

// POST /api/clean-field { text, label } -> { text: cleanedText }
// Takes raw text (typically dictated) for ONE field and returns a tidied,
// medically-correct version: fixes spelling of drugs/terms, capitalization,
// punctuation and obvious dictation artifacts — WITHOUT inventing content.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body?.text ?? "").trim();
    const label = String(body?.label ?? "field");
    if (!text) {
      return NextResponse.json({ text: "" });
    }
    const cleaned = await cleanField(text, label);
    return NextResponse.json({ text: cleaned });
  } catch (e) {
    // On any AI failure, fall back to the original text so the doctor never
    // loses what they said.
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(
      { text: String(body?.text ?? ""), error: (e as Error).message },
      { status: 200 }
    );
  }
}
