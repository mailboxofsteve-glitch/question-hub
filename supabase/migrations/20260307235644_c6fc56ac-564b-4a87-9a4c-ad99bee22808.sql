
CREATE POLICY "Admins and editors can read events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'editor'::app_role)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
