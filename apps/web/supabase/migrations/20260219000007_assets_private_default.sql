-- Change is_public default to false — assets are private by default
alter table public.assets alter column is_public set default false;
