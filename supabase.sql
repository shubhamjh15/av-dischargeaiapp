-- AV Discharge Summary — run this once in the Supabase SQL Editor
-- (Dashboard > SQL Editor > New query > paste > Run)

create extension if not exists "pgcrypto";

create table if not exists public.discharge_summaries (
  id           uuid primary key default gen_random_uuid(),
  data         jsonb not null,
  patient_name text,
  ip_no        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists discharge_summaries_created_at_idx
  on public.discharge_summaries (created_at desc);

-- This app gates access with a single shared password at the app layer and
-- talks to Supabase only from server-side API routes using the anon key.
-- We keep RLS OFF for this single-tenant internal tool to stay simple.
-- (If you later add real per-user auth, enable RLS and add policies.)
alter table public.discharge_summaries disable row level security;
