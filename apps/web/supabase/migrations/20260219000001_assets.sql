create table public.assets (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.users (id) on delete cascade not null,
  name text not null,
  slug text not null,
  description text,
  asset_format text not null check (asset_format in ('file', 'package')),
  type text,
  tags text[] default '{}' not null,
  is_public boolean default true not null,
  created_at timestamptz default now() not null,
  unique (owner_id, slug)
);

alter table public.assets enable row level security;

create policy "assets_select" on public.assets
  for select using (is_public = true or auth.uid() = owner_id);

create policy "assets_insert" on public.assets
  for insert with check (auth.uid() = owner_id);

create policy "assets_update" on public.assets
  for update using (auth.uid() = owner_id);

create policy "assets_delete" on public.assets
  for delete using (auth.uid() = owner_id);
