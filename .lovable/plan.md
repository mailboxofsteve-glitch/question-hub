

## Add "Editor" Role with Exclusive Publish Control

### Overview
Introduce a new `editor` role that has all admin capabilities, plus exclusive control over the Draft/Published toggle. Admin users will still be able to create, edit, and delete nodes, but only editors can change a node's publication status.

### Changes

**1. Database migration**
- Add `'editor'` to the `app_role` enum
- Add an RLS policy so editors can also read all nodes (like admins)

```sql
ALTER TYPE public.app_role ADD VALUE 'editor';

CREATE POLICY "Editors can read all nodes"
ON public.nodes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'editor'));
```

**2. Update the edge function** -- `supabase/functions/admin-nodes/index.ts`
- Change the auth check from requiring specifically the `admin` role to accepting either `admin` or `editor`
- On PUT requests, if the user is `admin` (not `editor`), strip the `published` field from the update payload so admins cannot change publish status
- On POST requests, similarly prevent admins from setting `published: true` (force it to `false`)

**3. Update the Admin page gate** -- `src/pages/Admin.tsx`
- Allow access if the user has either the `admin` or `editor` role (check both, allow if either is true)

**4. Update the AppLayout nav** -- `src/components/layout/AppLayout.tsx`
- Show the "Node Admin" link if the user has either `admin` or `editor` role

**5. Update NodeForm** -- `src/components/admin/NodeForm.tsx`
- Accept a new prop `canPublish` (boolean)
- When `canPublish` is false, disable the Draft/Published switch and show a tooltip or helper text: "Only editors can change publication status"

**6. Update AdminDashboard** -- `src/components/admin/AdminDashboard.tsx`
- Detect whether the current user has the `editor` role using `useUserRole`
- Pass `canPublish={isEditor}` to `NodeForm`

**7. Update NodePreview** -- `src/pages/NodePreview.tsx`
- Allow access for both admin and editor roles (the RLS policy change handles the data access; no code change needed if it already queries without role filtering)

### Files Changed

| File | Change |
|---|---|
| New migration SQL | Add `editor` to `app_role` enum; add RLS policy for editors |
| `supabase/functions/admin-nodes/index.ts` | Accept `admin` or `editor`; restrict `published` field to editors only |
| `src/pages/Admin.tsx` | Allow access for `admin` or `editor` role |
| `src/components/layout/AppLayout.tsx` | Show admin link for `admin` or `editor` |
| `src/components/admin/NodeForm.tsx` | Add `canPublish` prop; conditionally disable the publish toggle |
| `src/components/admin/AdminDashboard.tsx` | Detect editor role; pass `canPublish` to NodeForm |

### How Editors Are Assigned
Same as admins today: a row is manually inserted into the `user_roles` table with `role = 'editor'`. The user signs up normally, then is granted the editor role by someone with database access.

### Security Notes
- The publish restriction is enforced **server-side** in the edge function, not just in the UI. Even if an admin user manipulates the request, the edge function will strip the `published` field.
- The `has_role` security-definer function already works with any `app_role` enum value, so it will work for `'editor'` without modification.

