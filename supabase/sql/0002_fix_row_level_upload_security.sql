-- Allow authenticated users to link topics only for videos they "own"
-- (ownership = their userId is in storage_path: 'media/<uid>/...')
do $$
begin
  begin
    create policy "vt_insert_own_video"
      on public.videos_topics
      for insert to authenticated
      with check (
        exists (
          select 1
          from public.videos v
          where v.id = videos_topics.video_id
            and split_part(v.storage_path, '/', 2) = auth.uid()::text
        )
      );
  exception when duplicate_object then null; end;
end$$;

do $$
begin
  begin
    create policy "vt_delete_own_video"
      on public.videos_topics
      for delete to authenticated
      using (
        exists (
          select 1
          from public.videos v
          where v.id = videos_topics.video_id
            and split_part(v.storage_path, '/', 2) = auth.uid()::text
        )
      );
  exception when duplicate_object then null; end;

  begin
    create policy "vt_update_own_video"
      on public.videos_topics
      for update to authenticated
      using (
        exists (
          select 1
          from public.videos v
          where v.id = videos_topics.video_id
            and split_part(v.storage_path, '/', 2) = auth.uid()::text
        )
      )
      with check (
        exists (
          select 1
          from public.videos v
          where v.id = videos_topics.video_id
            and split_part(v.storage_path, '/', 2) = auth.uid()::text
        )
      );
  exception when duplicate_object then null; end;
end$$;

