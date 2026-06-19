-- Puzzles backend schema (Supabase Postgres).
--
-- Tables live in the `public` schema with a `puzzles_` prefix so the edge
-- function reaches them through PostgREST without exposing a custom schema.
-- RLS is enabled with no policies: the anon/publishable key can't read or write
-- them, while the Edge Function uses the service-role key and bypasses RLS.

create extension if not exists "pgcrypto";

create table if not exists public.puzzles_users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text not null default 'Player',
  token text unique not null,
  sync_state jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.puzzles_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.puzzles_users(id) on delete cascade,
  type text not null check (type in ('sudoku', 'zip')),
  difficulty text not null,
  size int,
  seed bigint not null,
  time_sec int not null check (time_sec >= 0),
  errors int not null default 0,
  hints int not null default 0,
  is_daily boolean not null default false,
  date_iso text,
  created_at timestamptz not null default now()
);

create index if not exists puzzles_results_board_idx on public.puzzles_results (type, difficulty, time_sec);
create index if not exists puzzles_results_daily_idx on public.puzzles_results (type, difficulty, is_daily, date_iso, time_sec);
create index if not exists puzzles_results_user_idx on public.puzzles_results (user_id);

alter table public.puzzles_users enable row level security;
alter table public.puzzles_results enable row level security;
