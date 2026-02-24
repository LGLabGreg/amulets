-- Supabase blocks direct DELETE FROM storage.objects in SQL triggers.
-- Storage cleanup is now handled in the API route before deleting the asset row.
DROP TRIGGER IF EXISTS on_asset_version_delete ON asset_versions;
DROP FUNCTION IF EXISTS delete_storage_object_on_version_delete();
