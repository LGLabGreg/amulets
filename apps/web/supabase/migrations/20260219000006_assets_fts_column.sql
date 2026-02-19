-- Drop the manual expression index from migration 4
drop index if exists assets_search_idx;

-- Add a stored generated tsvector column for full-text search
alter table public.assets
  add column fts tsvector generated always as (
    to_tsvector('english', name || ' ' || coalesce(description, ''))
  ) stored;

create index assets_fts_idx on public.assets using gin (fts);
