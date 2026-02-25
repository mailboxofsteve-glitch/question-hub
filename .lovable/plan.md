

## Restrict Admin Edits to Own Nodes & Auto-Draft on Edit

### Overview
Admins will only be able to edit nodes they created. When an admin edits a node, it will automatically revert to "Draft" status. Editors retain full permissions unchanged.

### Changes

**1. Edge Function — `supabase/functions/admin-nodes/index.ts`**

In the `PUT` handler, after fetching the existing node:
- If the user is an admin (not editor), check that `existing.created_by === userId`. If not, return `403 Forbidden`.
- If the user is an admin (not editor), force `updateData.published = false` regardless of what was sent.

```typescript
// After fetching existing node...
if (!isEditor) {
  // Admin can only edit their own nodes
  const { data: fullNode } = await supabase
    .from("nodes").select("created_by").eq("id", nodeId).single();
  if (fullNode?.created_by !== userId) {
    return json({ error: "Forbidden: you can only edit nodes you created" }, 403);
  }
  // Auto-revert to draft on admin edit
  updateData.published = false;
}
```

**2. Frontend — `src/components/admin/AdminDashboard.tsx`**

- Pass `session.user.id` to determine ownership on the client side.
- Hide the edit (pencil) button for admin users on nodes they did not create (`created_by` !== current user id).
- Show a visual indicator (e.g., tooltip or disabled state) so admins understand why they can't edit certain nodes.

The edit button condition changes from always-visible to:
```tsx
{(isEditor || (node as any).created_by === session.user.id) && (
  <Button variant="ghost" size="icon" onClick={...}>
    <Pencil />
  </Button>
)}
```

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/admin-nodes/index.ts` | PUT: ownership check for admins, auto-set `published = false` for admin edits |
| `src/components/admin/AdminDashboard.tsx` | Hide edit button for admins on nodes they didn't create |

### Notes
- The server-side check is the authoritative enforcement; the frontend change is UX only.
- Editors are completely unaffected — they keep all existing permissions.
- When an admin edits their own node, the node reverts to draft so an editor must re-publish it.

