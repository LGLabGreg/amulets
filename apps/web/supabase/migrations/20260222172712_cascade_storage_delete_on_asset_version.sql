CREATE OR REPLACE FUNCTION delete_storage_object_on_version_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.storage_path IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'packages'
      AND name = OLD.storage_path;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_asset_version_delete
AFTER DELETE ON asset_versions
FOR EACH ROW
EXECUTE FUNCTION delete_storage_object_on_version_delete();
