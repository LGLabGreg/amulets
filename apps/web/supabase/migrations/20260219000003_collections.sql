create table public.collections (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users (id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  is_public boolean default true not null,
  created_at timestamptz default now() not null,
  unique (owner_id, slug)
);

alter table public.collections enable row level security;

create policy "collections_select" on public.collections
  for select using (is_public = true or auth.uid() = owner_id);

create policy "collections_insert" on public.collections
  for insert with check (auth.uid() = owner_id);

create policy "collections_update" on public.collections
  for update using (auth.uid() = owner_id);

create policy "collections_delete" on public.collections
  for delete using (auth.uid() = owner_id);

create table public.collection_items (
  id uuid default gen_random_uuid() primary key,
  collection_id uuid references public.collections (id) on delete cascade not null,
  asset_id uuid references public.assets (id) on delete cascade not null,
  pinned_version_id uuid references public.asset_versions (id) on delete set null,
  "order" integer default 0 not null,
  unique (collection_id, asset_id)
);

alter table public.collection_items enable row level security;

create policy "collection_items_select" on public.collection_items
  for select using (
    exists (
      select 1 from public.collections
      where collections.id = collection_items.collection_id
        and (collections.is_public = true or collections.owner_id = auth.uid())
    )
  );

create policy "collection_items_all" on public.collection_items
  for all using (
    exists (
      select 1 from public.collections
      where collections.id = collection_items.collection_id
        and collections.owner_id = auth.uid()
    )
  );
