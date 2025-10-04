insert into topics (slug, name) values
  ('stress', 'Stress'),
  ('sleep', 'Sleep'),
  ('focus', 'Focus')
on conflict do nothing;

insert into providers (name, calendly_url) values
  ('Calm Collective', null),
  ('Mindful Pro', null)
on conflict do nothing;

-- Example public YT video
insert into videos (title, provider_type, embed_id, is_public)
values ('Intro to Mindfulness', 'YOUTUBE', 'dQw4w9WgXcQ', true)
on conflict do nothing;
