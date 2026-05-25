-- Run in Supabase SQL Editor if session_usage does not exist yet

create table if not exists session_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  sessions_used integer not null default 0,
  week_start date not null,
  updated_at timestamptz not null default now()
);

create index if not exists session_usage_user_id_idx on session_usage (user_id);
