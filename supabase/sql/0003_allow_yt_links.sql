alter table public.videos
  add column if not exists created_by uuid default auth.uid();

-- (optional) backfill old FILE rows where path is like 'media/<uid>/...'
update public.videos
set created_by = nullif(split_part(storage_path, '/', 2), '')::uuid
where created_by is null
  and storage_path like 'media/%'
  and split_part(storage_path, '/', 2) ~ '^[0-9a-f-]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

-- videos_topics: allow linking for videos the user owns
do $$
begin
  begin
    create policy "vt_insert_owner"
      on public.videos_topics
      for insert to authenticated
      with check (
        exists (
          select 1 from public.videos v
          where v.id = videos_topics.video_id
            and v.created_by = auth.uid()
        )
      );
  exception when duplicate_object then null; end;
end$$;
