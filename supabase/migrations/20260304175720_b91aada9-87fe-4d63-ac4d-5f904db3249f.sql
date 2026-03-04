
CREATE TABLE public.diagnostic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  node_id text NOT NULL,
  response text NOT NULL,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, node_id)
);

ALTER TABLE public.diagnostic_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own progress"
ON public.diagnostic_progress
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own progress"
ON public.diagnostic_progress
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own progress"
ON public.diagnostic_progress
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
