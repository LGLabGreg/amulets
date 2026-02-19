create table public.users (
  id uuid references auth.users (id) on delete cascade primary key,
  github_id bigint unique,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

alter table public.users enable row level security;

create policy "users_select" on public.users
  for select using (true);

create policy "users_insert" on public.users
  for insert with check (auth.uid() = id);

create policy "users_update" on public.users
  for update using (auth.uid() = id);
