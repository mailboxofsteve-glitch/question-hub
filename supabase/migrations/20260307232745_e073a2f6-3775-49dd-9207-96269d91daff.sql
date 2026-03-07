
DROP POLICY IF EXISTS "Admins can upload node images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete node images" ON storage.objects;

CREATE POLICY "Admins and editors can upload node images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'node-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete node images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'node-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'editor')
    )
  );
