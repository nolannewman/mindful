-- =========================
-- Storage: bucket + policies
-- =========================

-- 1) Create bucket 'media' if missing (works across Storage versions)
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'media') then
    begin
      -- Try function (positional args; avoids named-arg issues)
      perform storage.create_bucket('media', false);
    exception
      when undefined_function then
        -- Fallback: direct insert for older installs
        insert into storage.buckets (id, name, public) values ('media', 'media', false);
    end;
  end if;
end$$;

-- 2) Ensure RLS is on for objects
alter table storage.objects enable row level security;

-- 3) User can SELECT/INSERT/UPDATE/DELETE only their own prefix "user_id/..."
do $$
begin
  begin
    create policy "media_select_own" on storage.objects
    for select to authenticated
    using (bucket_id = 'media' and split_part(name,'/',1) = auth.uid()::text);
  exception when duplicate_object then null; end;

  begin
    create policy "media_insert_own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'media' and split_part(name,'/',1) = auth.uid()::text);
  exception when duplicate_object then null; end;

  begin
    create policy "media_update_own" on storage.objects
    for update to authenticated
    using (bucket_id = 'media' and split_part(name,'/',1) = auth.uid()::text)
    with check (bucket_id = 'media' and split_part(name,'/',1) = auth.uid()::text);
  exception when duplicate_object then null; end;

  begin
    create policy "media_delete_own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'media' and split_part(name,'/',1) = auth.uid()::text);
  exception when duplicate_object then null; end;
end$$;

-- =========================
-- Videos table: allow inserts
-- (RLS is already enabled in your schema)
-- =========================
do $$
begin
  begin
    create policy "videos_insert_authenticated"
      on public.videos
      for insert to authenticated
      with check (true);
  exception when duplicate_object then null; end;
end$$;
