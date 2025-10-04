-- supabase/sql/schema.sql
-- Schema & RLS for topics, providers, videos, videos_topics, users, entitlements

-- Extensions
create extension if not exists "pgcrypto";

-- =========
-- Types
-- =========
do $$
begin
  if not exists (select 1 from pg_type where typname = 'media_provider') then
    create type media_provider as enum ('YOUTUBE','VIMEO','FILE','AUDIO');
  end if;
end $$;

-- =========
-- Tables
-- =========

-- Public catalog: topics
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Public catalog: providers (content providers / mentors)
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null,
  description text,
  calendly_url text, -- optional
  rate numeric(10,2), -- optional hourly/session rate
  created_at timestamptz not null default now()
);

-- Public catalog: videos
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  media_provider media_provider not null, -- enum: YOUTUBE, VIMEO, FILE, AUDIO
  embed_id text,        -- for YOUTUBE/VIMEO
  storage_path text,    -- for FILE/AUDIO in Supabase Storage
  duration_seconds integer,
  provider_id uuid references public.providers(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now(),

  -- Ensure a valid source is present that matches media_provider
  constraint videos_source_check check (
    (media_provider in ('YOUTUBE','VIMEO') and embed_id is not null and storage_path is null)
    or
    (media_provider in ('FILE','AUDIO') and storage_path is not null and embed_id is null)
  )
);

-- Public catalog: videos_topics junction
create table if not exists public.videos_topics (
  video_id uuid not null references public.videos(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (video_id, topic_id)
);

-- Protected: users (app profile tied to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  topics_of_interest uuid[], -- simple list of topic ids (no PHI; no FK on arrays)
  created_at timestamptz not null default now()
);

-- Protected: entitlements (what a user can access)
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  can_watch boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),

  unique (user_id, video_id)
);

-- =========
-- Row Level Security
-- =========

-- Enable RLS (catalog tables still readable via explicit policy)
alter table public.topics enable row level security;
alter table public.providers enable row level security;
alter table public.videos enable row level security;
alter table public.videos_topics enable row level security;
alter table public.users enable row level security;
alter table public.entitlements enable row level security;

-- ---- Public read policies for catalog tables ----
-- topics: anyone (including anon) can select
drop policy if exists "Public read topics" on public.topics;
create policy "Public read topics"
  on public.topics
  for select
  to anon, authenticated
  using (true);

-- providers: anyone can select
drop policy if exists "Public read providers" on public.providers;
create policy "Public read providers"
  on public.providers
  for select
  to anon, authenticated
  using (true);

-- videos: anyone can select only published videos
drop policy if exists "Public read videos (published only)" on public.videos;
create policy "Public read videos (published only)"
  on public.videos
  for select
  to anon, authenticated
  using (published = true);

-- videos_topics: anyone can select
drop policy if exists "Public read videos_topics" on public.videos_topics;
create policy "Public read videos_topics"
  on public.videos_topics
  for select
  to anon, authenticated
  using (true);

-- ---- Protected tables: users & entitlements (self read/upsert) ----

-- users: a user can see and manage only their own profile
drop policy if exists "Users: self select" on public.users;
create policy "Users: self select"
  on public.users
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Users: self insert" on public.users;
create policy "Users: self insert"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users: self update" on public.users;
create policy "Users: self update"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- entitlements: a user can see and upsert only their own entitlements
drop policy if exists "Entitlements: self select" on public.entitlements;
create policy "Entitlements: self select"
  on public.entitlements
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Entitlements: self insert" on public.entitlements;
create policy "Entitlements: self insert"
  on public.entitlements
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Entitlements: self update" on public.entitlements;
create policy "Entitlements: self update"
  on public.entitlements
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Optionally, prevent deletes except by same user (or admins via future role)
drop policy if exists "Users: self delete" on public.users;
create policy "Users: self delete"
  on public.users
  for delete
  to authenticated
  using (id = auth.uid());

drop policy if exists "Entitlements: self delete" on public.entitlements;
create policy "Entitlements: self delete"
  on public.entitlements
  for delete
  to authenticated
  using (user_id = auth.uid());
