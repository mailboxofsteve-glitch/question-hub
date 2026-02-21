
INSERT INTO storage.buckets (id, name, public) VALUES ('node-images', 'node-images', true);

-- Anyone can view images (public site)
CREATE POLICY "Public read node images" ON storage.objects
  FOR SELECT USING (bucket_id = 'node-images');

-- Only admins can upload images
CREATE POLICY "Admins can upload node images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'node-images'
    AND public.has_role(auth.uid(), 'admin')
  );

-- Only admins can delete images
CREATE POLICY "Admins can delete node images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'node-images'
    AND public.has_role(auth.uid(), 'admin')
  );
