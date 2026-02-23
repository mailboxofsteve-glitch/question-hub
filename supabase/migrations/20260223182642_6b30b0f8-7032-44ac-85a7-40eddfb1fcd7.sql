CREATE POLICY "Editors can read all nodes"
ON public.nodes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'editor'));