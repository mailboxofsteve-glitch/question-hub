

## Add "Node Admin" Link to Toolbar (Admin-Only)

### What Changes
A "Node Admin" link will appear in the top toolbar, next to the user's email, only when the logged-in user has the `admin` role. Non-admin users and visitors will not see it.

### Single File Change

**`src/components/layout/AppLayout.tsx`**
- Import `useUserRole` from `@/hooks/use-user-role`
- Call `useUserRole(user?.id, 'admin')` to check if the current user is an admin
- When the user is logged in AND has the admin role, render a "Node Admin" link to `/admin` between the divider and the user email
- Styled consistently with the existing "Explore" and "Graph" nav links

### Technical Details

```text
// Inside the logged-in user section (lines 41-49), add:
{hasRole && (
  <Link to="/admin" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
    Node Admin
  </Link>
)}
```

The `useUserRole` hook already exists and queries the `user_roles` table. It returns `{ hasRole, loading }`. The link will only render once both auth and role loading are complete and the user is confirmed as an admin.

### No other files need changes
The `/admin` route and role-checking hook are already implemented.
