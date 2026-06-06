import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { DischargeSummary } from "@/lib/schema";

// GET    /api/summaries/:id -> one full record
// PUT    /api/summaries/:id -> update { data }
// DELETE /api/summaries/:id -> delete
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("discharge_summaries")
      .select("id, data, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = body?.data as DischargeSummary;
    if (!data) {
      return NextResponse.json({ error: "Missing data." }, { status: 400 });
    }
    const supabase = getSupabase();
    const { error } = await supabase
      .from("discharge_summaries")
      .update({
        data,
        patient_name: data.name || null,
        ip_no: data.ip_no || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabase();
    const { error } = await supabase
      .from("discharge_summaries")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
