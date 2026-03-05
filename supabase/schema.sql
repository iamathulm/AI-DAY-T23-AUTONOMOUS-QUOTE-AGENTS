-- Supabase schema for Autonomous Quote Agents
-- Apply in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.quote_runs (
  id uuid primary key default gen_random_uuid(),
  quote_num text not null,
  decision text,
  risk_tier text,
  bind_score integer,
  agent_type text,
  region text,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_runs_created_at on public.quote_runs (created_at desc);
create index if not exists idx_quote_runs_decision on public.quote_runs (decision);
create index if not exists idx_quote_runs_quote_num on public.quote_runs (quote_num);

-- No auth requirement: keep RLS disabled for hackathon demo speed.
alter table public.quote_runs disable row level security;
