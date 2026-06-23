CREATE POLICY "Lecture publique photos joueuses"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos-joueuses');

CREATE POLICY "Upload public photos joueuses"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos-joueuses');

CREATE POLICY "Update public photos joueuses"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'photos-joueuses');

CREATE POLICY "Delete public photos joueuses"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos-joueuses');