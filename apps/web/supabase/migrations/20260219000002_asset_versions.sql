create table public.asset_versions (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets (id) on delete cascade not null,
  version text not null,
  message text,
  content text,
  storage_path text,
  file_manifest jsonb,
  created_at timestamptz default now() not null,
  unique (asset_id, version)
);

alter table public.asset_versions enable row level security;

create policy "asset_versions_select" on public.asset_versions
  for select using (
    exists (
      select 1 from public.assets
      where assets.id = asset_versions.asset_id
        and (assets.is_public = true or assets.owner_id = auth.uid())
    )
  );

create policy "asset_versions_insert" on public.asset_versions
  for insert with check (
    exists (
      select 1 from public.assets
      where assets.id = asset_versions.asset_id
        and assets.owner_id = auth.uid()
    )
  );

create policy "asset_versions_delete" on public.asset_versions
  for delete using (
    exists (
      select 1 from public.assets
      where assets.id = asset_versions.asset_id
        and assets.owner_id = auth.uid()
    )
  );
