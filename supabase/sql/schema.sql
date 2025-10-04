create type media_provider as enum ('YOUTUBE','VIMEO','FILE','AUDIO');

create table if not exists topics(
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  name text not null
);

create table if not exists providers(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  calendly_url text
);

create table if not exists videos(
  id uuid primary key default gen_random_uuid(),
  title text,
  provider_type media_provider not null default 'YOUTUBE',
  embed_id text,
  storage_path text,
  provider_id uuid references providers(id),
  owner_id uuid,
  is_public boolean default true,
  created_at timestamptz default now()
);

create table if not exists videos_topics(
  video_id uuid references videos(id) on delete cascade,
  topic_id uuid references topics(id) on delete cascade
);

create table if not exists users(
  id uuid primary key,
  email text
);

create table if not exists entitlements(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  tier text
);

-- RLS examples (adjust in Supabase UI if needed)
alter table topics enable row level security;
create policy topics_public on topics for select using (true);

alter table providers enable row level security;
create policy providers_public on providers for select using (true);

alter table videos enable row level security;
create policy videos_public on videos for select using (true);

alter table videos_topics enable row level security;
create policy videos_topics_public on videos_topics for select using (true);

alter table users enable row level security;
create policy users_self on users for select using (auth.uid() = id);
create policy users_upsert on users for insert with check (auth.uid() = id);
create policy users_update on users for update using (auth.uid() = id);

alter table entitlements enable row level security;
create policy entitlements_self on entitlements for select using (auth.uid() = user_id);
