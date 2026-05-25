-- Run this in Supabase SQL Editor if interview_sessions does not exist yet

create table if not exists interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  interview_type text not null,
  experience_level text not null,
  overall_score integer not null,
  technical_score integer not null,
  communication_score integer not null,
  problem_solving_score integer not null,
  confidence_score integer not null,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  detailed_feedback text,
  would_recommend boolean not null default false,
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_id_idx
  on interview_sessions (user_id);

create index if not exists interview_sessions_created_at_idx
  on interview_sessions (created_at desc);

alter table interview_sessions enable row level security;

create policy "Users can view own interview sessions"
  on interview_sessions for select
  using (auth.uid() = user_id);
