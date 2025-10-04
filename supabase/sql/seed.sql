-- supabase/sql/seed.sql
-- Seed minimal catalog data: 3 topics, 2 providers, 2 videos, and junctions

-- Topics
insert into public.topics (slug, name, description) values
  ('mindfulness', 'Mindfulness', 'Awareness and presence practices'),
  ('productivity', 'Productivity', 'Tools and habits to get things done'),
  ('sleep', 'Sleep', 'Rest and recovery techniques')
on conflict (slug) do nothing;

-- Providers
insert into public.providers (slug, name, description, calendly_url, rate) values
  ('alex-lee', 'Alex Lee', 'Meditation coach and content creator', 'https://calendly.com/alex-lee/intro', 150.00),
  ('riley-kim', 'Riley Kim', 'Wellness educator', null, 120.00)
on conflict (slug) do nothing;

-- Videos
-- Get provider ids for consistency
with p as (
  select id, slug from public.providers where slug in ('alex-lee','riley-kim')
),
ins as (
  insert into public.videos (title, description, media_provider, embed_id, storage_path, duration_seconds, provider_id, published)
  values
    -- YouTube example
    ('Breathing Basics', 'A short guided breathing practice.', 'YOUTUBE', 'dQw4w9WgXcQ', null, 300,
      (select id from p where slug = 'alex-lee'), true),
    -- File (Storage) example
    ('Body Scan (Audio)', 'A calming full-body scan audio session.', 'FILE', null, 'audio/body-scan.mp3', 900,
      (select id from p where slug = 'riley-kim'), true)
  on conflict do nothing
  returning id, title
)
select * from ins;

-- Link videos to topics
-- Fetch ids
with v as (select id, title from public.videos),
t as (select id, slug from public.topics)
insert into public.videos_topics (video_id, topic_id)
select v.id, t.id
from v
join t on (
  (v.title = 'Breathing Basics' and t.slug in ('mindfulness','sleep')) or
  (v.title = 'Body Scan (Audio)' and t.slug in ('mindfulness'))
)
on conflict do nothing;
