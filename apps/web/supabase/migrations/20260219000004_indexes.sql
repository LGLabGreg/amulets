-- assets
create index assets_owner_id_idx on public.assets (owner_id);
create index assets_owner_slug_idx on public.assets (owner_id, slug);
create index assets_tags_idx on public.assets using gin (tags);
create index assets_search_idx on public.assets using gin (
  to_tsvector('english', name || ' ' || coalesce(description, ''))
);

-- asset_versions
create index asset_versions_asset_id_idx on public.asset_versions (asset_id);
create index asset_versions_asset_version_idx on public.asset_versions (asset_id, version);

-- collections
create index collections_owner_id_idx on public.collections (owner_id);

-- collection_items
create index collection_items_collection_id_idx on public.collection_items (collection_id);
create index collection_items_asset_id_idx on public.collection_items (asset_id);
