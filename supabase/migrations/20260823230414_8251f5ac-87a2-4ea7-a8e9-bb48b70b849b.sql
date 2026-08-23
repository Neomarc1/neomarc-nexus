
CREATE POLICY "feedback_screenshot_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'feedback' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "feedback_screenshot_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'feedback' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin(auth.uid())));
