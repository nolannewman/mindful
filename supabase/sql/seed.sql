-- =====================================================================
-- Sleep Hypnosis Catalog — Seed (Idempotent-ish with ON CONFLICT)
-- =====================================================================

-- Topics ---------------------------------------------------------------
insert into public.topics (slug, name, description) values
  ('sleep-hypnosis',  'Sleep Hypnosis',  'Guided hypnotic inductions for sleep onset'),
  ('insomnia-relief', 'Insomnia Relief', 'Tools and suggestions to quiet a racing mind'),
  ('deep-sleep',      'Deep Sleep',      'Long-form tracks for consolidated deep rest'),
  ('nap-reset',       'Nap Reset',       'Short sessions to refresh mid-day'),
  ('anxiety-calm',    'Anxiety Calm',    'Breathing and hypnosis to downshift the nervous system')
on conflict (slug) do nothing;

-- Providers ------------------------------------------------------------
insert into public.providers (slug, name, description, calendly_url, rate) values
  ('dr-sage-hart',   'Dr. Sage Hart',   'Clinical hypnotherapist specializing in sleep onset and parasomnias.', 'https://calendly.com/dr-sage-hart/intro', 180.00),
  ('mara-velasquez', 'Mara Velasquez',  'Mind–body coach blending hypnotic language with breathing and sound.',  null,                                      140.00)
on conflict (slug) do nothing;

-- Provider ↔ Topic tags -----------------------------------------------
with p as (select id, slug from public.providers where slug in ('dr-sage-hart','mara-velasquez')),
     t as (select id, slug from public.topics  where slug in ('sleep-hypnosis','insomnia-relief','deep-sleep','nap-reset','anxiety-calm'))
insert into public.providers_topics (provider_id, topic_id)
select (select id from p where slug = 'dr-sage-hart'), (select id from t where slug = 'sleep-hypnosis') union all
select (select id from p where slug = 'dr-sage-hart'), (select id from t where slug = 'insomnia-relief') union all
select (select id from p where slug = 'dr-sage-hart'), (select id from t where slug = 'deep-sleep')     union all
select (select id from p where slug = 'mara-velasquez'), (select id from t where slug = 'sleep-hypnosis') union all
select (select id from p where slug = 'mara-velasquez'), (select id from t where slug = 'nap-reset')      union all
select (select id from p where slug = 'mara-velasquez'), (select id from t where slug = 'anxiety-calm')
on conflict do nothing;

-- Videos ---------------------------------------------------------------
with p as (
  select id, slug from public.providers where slug in ('dr-sage-hart','mara-velasquez')
),
ins as (
  insert into public.videos
    (title,                      description,                                  media_provider, embed_id,        storage_path,                 duration_seconds, provider_id, published, pro)
  values
    ('Gentle Sleep Induction',   'Progressive relaxation with hypnotic imagery to drift to sleep.',
                                  'AUDIO',          null,           'audio/gentle-sleep-induction.mp3', 1200,
                                  (select id from p where slug = 'dr-sage-hart'), true,  false),

    ('Insomnia Relief — 3-2-1',  'Cue-based hypnosis for middle-of-the-night awakenings.',
                                  'AUDIO',          null,           'audio/insomnia-relief-321.mp3',    900,
                                  (select id from p where slug = 'dr-sage-hart'), true,  true),   -- pro

    ('Deep Sleep Ocean Night',   'Long-form ocean soundscape with slow hypnotic suggestions.',
                                  'AUDIO',          null,           'audio/deep-sleep-ocean-night.mp3', 3600,
                                  (select id from p where slug = 'mara-velasquez'), true,  true),  -- pro

    ('Nap Reset — 20 Minutes',   'Short induction + emergence designed for a crisp 20-minute reset.',
                                  'AUDIO',          null,           'audio/nap-reset-20m.mp3',          1200,
                                  (select id from p where slug = 'mara-velasquez'), true,  false),

    ('Calm the Storm',           'Breath pacing + hypnotic language to lower anxiety before bed.',
                                  'AUDIO',          null,           'audio/anxiety-calm-storm.mp3',     600,
                                  (select id from p where slug = 'mara-velasquez'), true,  false),

    -- Dev/Test: Rick Astley (YouTube) — keep non-public so it doesn’t show in prod
    ('[DEV] Player Test — Rick Astley', 'Non-public test item for YouTube embedding.',
                                  'YOUTUBE',        'dQw4w9WgXcQ',  null,                                 213,
                                  (select id from p where slug = 'dr-sage-hart'), false, false)
  on conflict do nothing
  returning id, title
)
select * from ins;

-- Link videos ↔ topics -----------------------------------------------
with v as (select id, title from public.videos),
     t as (select id, slug from public.topics)
insert into public.videos_topics (video_id, topic_id)
-- Gentle Sleep Induction → sleep-hypnosis, deep-sleep
select (select id from v where title = 'Gentle Sleep Induction'),
       (select id from t where slug = 'sleep-hypnosis')
union all
select (select id from v where title = 'Gentle Sleep Induction'),
       (select id from t where slug = 'deep-sleep')
-- Insomnia Relief — 3-2-1 → insomnia-relief, sleep-hypnosis
union all
select (select id from v where title = 'Insomnia Relief — 3-2-1'),
       (select id from t where slug = 'insomnia-relief')
union all
select (select id from v where title = 'Insomnia Relief — 3-2-1'),
       (select id from t where slug = 'sleep-hypnosis')
-- Deep Sleep Ocean Night → deep-sleep
union all
select (select id from v where title = 'Deep Sleep Ocean Night'),
       (select id from t where slug = 'deep-sleep')
-- Nap Reset — 20 Minutes → nap-reset
union all
select (select id from v where title = 'Nap Reset — 20 Minutes'),
       (select id from t where slug = 'nap-reset')
-- Calm the Storm → anxiety-calm, sleep-hypnosis
union all
select (select id from v where title = 'Calm the Storm'),
       (select id from t where slug = 'anxiety-calm')
union all
select (select id from v where title = 'Calm the Storm'),
       (select id from t where slug = 'sleep-hypnosis')
-- [DEV] Rickroll test → tagged for convenience; remains unpublished
union all
select (select id from v where title = '[DEV] Player Test — Rick Astley'),
       (select id from t where slug = 'sleep-hypnosis')
on conflict do nothing;
