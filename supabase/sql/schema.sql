-- =====================================================================
-- Mindful Catalog — Schema (Idempotent)
-- Safe to re-run: creates only if missing; policies guarded.
-- =====================================================================

-- Extensions -----------------------------------------------------------
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- Enums ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'media_provider') then
    create type public.media_provider as enum ('YOUTUBE','VIMEO','FILE','AUDIO');
  end if;
end$$;

-- Tables --------------------------------------------------------------

create table if not exists public.topics (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.providers (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  name          text not null,
  description   text,
  calendly_url  text,
  rate          numeric(10,2),
  created_at    timestamptz not null default now()
);

create table if not exists public.videos (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text,
  media_provider   public.media_provider not null,
  embed_id         text,
  storage_path     text,
  duration_seconds integer,
  provider_id      bigint references public.providers(id) on delete set null,
  published        boolean not null default true,
  created_at       timestamptz not null default now()
);

create table if not exists public.videos_topics (
  video_id uuid   not null references public.videos(id) on delete cascade,
  topic_id bigint not null references public.topics(id) on delete cascade,
  primary key (video_id, topic_id)
);

create table if not exists public.providers_topics (
  provider_id bigint not null references public.providers(id) on delete cascade,
  topic_id    bigint not null references public.topics(id)    on delete cascade,
  primary key (provider_id, topic_id)
);

-- Profiles keyed to auth.users (don’t seed; depends on auth)
create table if not exists public.users (
  id                 uuid primary key references auth.users(id) on delete cascade,
  display_name       text,
  topics_of_interest text[] not null default '{}',
  created_at         timestamptz not null default now()
);

create table if not exists public.entitlements (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.users(id) on delete cascade,
  provider_id bigint references public.providers(id) on delete set null,
  video_id    uuid  references public.videos(id)    on delete set null,
  plan        text,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Indexes -------------------------------------------------------------
create index if not exists topics_slug_idx                 on public.topics(slug);
create index if not exists providers_slug_idx              on public.providers(slug);
create index if not exists videos_provider_idx             on public.videos(provider_id);
create index if not exists videos_topics_video_idx         on public.videos_topics(video_id);
create index if not exists videos_topics_topic_idx         on public.videos_topics(topic_id);
create index if not exists providers_topics_provider_idx   on public.providers_topics(provider_id);
create index if not exists providers_topics_topic_idx      on public.providers_topics(topic_id);
create index if not exists entitlements_user_idx           on public.entitlements(user_id);

-- Views ---------------------------------------------------------------
-- (CREATE OR REPLACE is already idempotent)
create or replace view public.videos_flat as
select
  v.id,
  v.title,
  v.description,
  v.media_provider,
  v.embed_id,
  v.storage_path,
  v.duration_seconds,
  v.provider_id,
  v.created_at,
  v.published as is_public,
  t.slug as topic_slug
from public.videos v
left join public.videos_topics vt on vt.video_id = v.id
left join public.topics t on t.id = vt.topic_id;

create or replace view public.provider_with_topics as
select
  p.*,
  coalesce(
    json_agg(t.* order by t.name) filter (where t.id is not null),
    '[]'
  ) as topics
from public.providers p
left join public.providers_topics pt on pt.provider_id = p.id
left join public.topics t on t.id = pt.topic_id
group by p.id;

-- Ensure privileges (idempotent)
grant select on public.videos_flat, public.provider_with_topics to anon, authenticated;

-- RLS -----------------------------------------------------------------
alter table public.topics            enable row level security;
alter table public.providers         enable row level security;
alter table public.videos            enable row level security;
alter table public.videos_topics     enable row level security;
alter table public.providers_topics  enable row level security;
alter table public.users             enable row level security;
alter table public.entitlements      enable row level security;

-- Policies (idempotent via DO/EXCEPTION blocks) ----------------------

-- Helper: create a policy if it doesn't exist
-- (We detect by name + table; if duplicate, we ignore.)
do $$
begin
  begin
    create policy "Public can read topics"
      on public.topics
      for select
      to anon, authenticated
      using (true);
  exception when duplicate_object then null;
  end;

  begin
    create policy "Public can read providers"
      on public.providers
      for select
      to anon, authenticated
      using (true);
  exception when duplicate_object then null;
  end;

  begin
    create policy "Public can read videos"
      on public.videos
      for select
      to anon, authenticated
      using (true);
  exception when duplicate_object then null;
  end;

  begin
    create policy "Public can read videos_topics"
      on public.videos_topics
      for select
      to anon, authenticated
      using (true);
  exception when duplicate_object then null;
  end;

  begin
    create policy "Public can read providers_topics"
      on public.providers_topics
      for select
      to anon, authenticated
      using (true);
  exception when duplicate_object then null;
  end;

  -- users (self-serve profile)
  begin
    create policy "Users can select own profile"
      on public.users
      for select
      to authenticated
      using (id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users can insert own profile"
      on public.users
      for insert
      to authenticated
      with check (id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users can update own profile"
      on public.users
      for update
      to authenticated
      using (id = auth.uid())
      with check (id = auth.uid());
  exception when duplicate_object then null;
  end;

  -- entitlements (owner-only)
  begin
    create policy "Users can read own entitlements"
      on public.entitlements
      for select
      to authenticated
      using (user_id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users can insert own entitlements"
      on public.entitlements
      for insert
      to authenticated
      with check (user_id = auth.uid());
  exception when duplicate_object then null;
  end;

  begin
    create policy "Users can update own entitlements"
      on public.entitlements
      for update
      to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  exception when duplicate_object then null;
  end;
end$$;

-- Final grants for base tables (safe if repeated)
grant select on public.topics, public.providers, public.videos, public.videos_topics, public.providers_topics to anon, authenticated;
