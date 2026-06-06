import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client. Used only inside API routes.
// Uses the anon key (this is a single-tenant internal tool gated by a shared
// password; RLS is disabled per supabase.sql).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabase() {
  if (!url || !anon) {
    throw new Error(
      "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}
