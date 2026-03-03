

## Allow admins to edit unowned nodes & claim ownership on edit

### Problem
Currently, the PUT handler at line 173-176 blocks admins from editing nodes they didn't create. Nodes inserted via bulk migration have `created_by = null`, so no admin can edit them. The user wants:
1. If `created_by` is null, **any** admin (or editor) can edit the node
2. Upon editing, the editor's `created_by` is set to the editing user, claiming ownership
3. The "Submitted By" column in the dashboard updates accordingly

### Changes

**`supabase/functions/admin-nodes/index.ts`** — PUT handler (lines 172-178):
- Change the admin ownership check: only block if `existing.created_by` is **not null** AND differs from `userId`
- Always set `updateData.created_by = userId` when the node currently has no owner (`created_by` is null)
- For editors, also set `created_by = userId` when the node is unowned

**`src/components/admin/AdminDashboard.tsx`** — Edit button visibility (around line 175):
- Currently the edit button only shows for editors or if `created_by === session.user.id`
- Add a third condition: also show the edit button when `created_by` is null (unowned node), so any admin sees it

### No database or schema changes needed
The `created_by` column is already nullable UUID — this is purely edge function logic + frontend visibility.

