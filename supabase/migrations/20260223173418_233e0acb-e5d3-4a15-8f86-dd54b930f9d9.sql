-- Allow admin users to read ALL nodes (including unpublished) for preview
CREATE POLICY "Admins can read all nodes"
ON public.nodes
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
);