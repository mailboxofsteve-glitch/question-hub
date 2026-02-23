CREATE VIEW public.user_roles_with_email AS
SELECT
  ur.id,
  ur.user_id,
  ur.role,
  p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id;