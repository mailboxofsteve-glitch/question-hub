

## Add Email Column to User Roles Database View

### Overview
Create a database view that joins the `user_roles` table with the `profiles` table so that when viewing user roles in the backend, you can see the email address associated with each user ID.

### Changes

**1. Database migration -- create a view**
- Create a new view called `user_roles_with_email` that joins `user_roles` with `profiles` on `user_id = profiles.id`
- This view will include all columns from `user_roles` plus the `email` column from `profiles`

```sql
CREATE VIEW public.user_roles_with_email AS
SELECT
  ur.id,
  ur.user_id,
  ur.role,
  p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id;
```

### Files Changed

| File | Change |
|---|---|
| New migration SQL | Create `user_roles_with_email` view joining user_roles with profiles |

### Notes
- Uses a `LEFT JOIN` so roles are still visible even if a profile record is missing
- The view is read-only and does not affect the underlying tables
- Existing RLS on `user_roles` and `profiles` still applies to direct table access

