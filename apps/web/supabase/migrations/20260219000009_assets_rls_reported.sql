-- Update assets select policy to exclude reported assets from public view
drop policy "assets_select" on public.assets;

create policy "assets_select" on public.assets
  for select using (
    auth.uid() = owner_id
    or (is_public = true and is_reported = false)
  );
