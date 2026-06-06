import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DischargeSummary } from "@/lib/schema";

// GET  /api/summaries  -> list (newest first)
// POST /api/summaries  -> insert one { data: DischargeSummary }
export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("discharge_summaries")
      .select("id, patient_name, ip_no, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return NextResponse.json({ summaries: data ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = body?.data as DischargeSummary;
    if (!data) {
      return NextResponse.json({ error: "Missing data." }, { status: 400 });
    }
    const supabase = getSupabase();
    const { data: row, error } = await supabase
      .from("discharge_summaries")
      .insert({
        data,
        patient_name: data.name || null,
        ip_no: data.ip_no || null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 }
    );
  }
}
