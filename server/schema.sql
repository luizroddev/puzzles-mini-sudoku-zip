-- Puzzles backend schema (Supabase Postgres).
-- The Netlify Functions use the service-role key and bypass RLS; RLS is enabled
-- with no public policies so the anon key cannot read/write these tables directly.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  name text not null default 'Player',
  token text unique not null,
  sync_state jsonb,
  created_at timestamptz not null default now()
);

create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
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

create index if not exists results_board_idx on results (type, difficulty, time_sec);
create index if not exists results_daily_idx on results (type, difficulty, is_daily, date_iso, time_sec);
create index if not exists results_user_idx on results (user_id);

alter table users enable row level security;
alter table results enable row level security;
