-- Add is_reported flag to assets
alter table public.assets add column is_reported boolean default false not null;

-- Reports table
create table public.asset_reports (
  id uuid default gen_random_uuid() primary key,
  asset_id uuid references public.assets (id) on delete cascade not null,
  reporter_id uuid references public.users (id) on delete set null,
  reason text not null,
  created_at timestamptz default now() not null
);

alter table public.asset_reports enable row level security;

create policy "reports_insert" on public.asset_reports
  for insert with check (auth.uid() = reporter_id);

create policy "reports_select_own" on public.asset_reports
  for select using (auth.uid() = reporter_id);
