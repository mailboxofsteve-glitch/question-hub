
-- New table for tracking review/resolution of diagnostic feedback
CREATE TABLE public.feedback_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_progress_id uuid NOT NULL REFERENCES public.diagnostic_progress(id) ON DELETE CASCADE,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  addressed boolean NOT NULL DEFAULT false,
  addressed_by uuid REFERENCES auth.users(id),
  addressed_at timestamptz,
  resolution_note text,
  UNIQUE (diagnostic_progress_id)
);

ALTER TABLE public.feedback_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and editors can read feedback reviews"
  ON public.feedback_reviews FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can insert feedback reviews"
  ON public.feedback_reviews FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE POLICY "Admins and editors can update feedback reviews"
  ON public.feedback_reviews FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Allow admin/editor to read all diagnostic_progress for the feedback page
CREATE POLICY "Admins and editors can read all progress"
  ON public.diagnostic_progress FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Allow admin/editor to read all profiles for user email display
CREATE POLICY "Admins and editors can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
