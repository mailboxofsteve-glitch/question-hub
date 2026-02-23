
## Restrict Node Deletion to Editors Only

### Overview
Currently, both admins and editors can delete nodes. This change will restrict the delete action so that only users with the `editor` role can delete nodes. Admins will no longer see the delete button, and the server will reject delete requests from non-editors.

### Changes

**1. Edge function -- `supabase/functions/admin-nodes/index.ts`**
- In the `DELETE` case (line 160-165), add a check: if the user is not an editor, return a 403 Forbidden response.

```typescript
case "DELETE": {
  if (!isEditor) return json({ error: "Forbidden: only editors can delete nodes" }, 403);
  // ... existing delete logic
}
```

**2. Admin Dashboard UI -- `src/components/admin/AdminDashboard.tsx`**
- Pass a `canDelete` prop (or use the existing `isEditor` awareness) to conditionally hide the trash/delete button.
- Only render the delete button when the user has the editor role.
- The `isEditor` value is already being computed in the component via `useUserRole`. We just need to conditionally render the delete button based on it.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/admin-nodes/index.ts` | Guard DELETE handler with `isEditor` check |
| `src/components/admin/AdminDashboard.tsx` | Conditionally render delete button only for editors |

### Security
The restriction is enforced **server-side** in the edge function. Even if someone bypasses the UI, the backend will reject the request with a 403 error.
