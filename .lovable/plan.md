

## Update Writer's Guide with Permissions & Workflow

### Change

Add a new section **8. Roles & Permissions** to the Writer's Guide dialog, placed after the existing "Publishing" section. This section will explain:

- **Admin role**: Can create new nodes and edit only their own submissions. Any edit by an admin automatically reverts the node to "Draft" status, requiring editor review before republication. Admins cannot edit nodes created by other users and cannot delete any nodes.
- **Editor role**: Full permissions — can create, edit, and delete any node regardless of who submitted it. Editors are the only role that can publish nodes or toggle publication status. Editors can also re-publish nodes that were reverted to draft by an admin edit.
- **Workflow summary**: A concise step-by-step describing the typical process: (1) Admin creates/edits a node (saved as draft), (2) Editor reviews the draft, (3) Editor publishes or requests changes.

### File Changed

| File | Change |
|---|---|
| `src/components/admin/WriterGuideDialog.tsx` | Add section 8 with roles, permissions table, and workflow after the existing "Publishing" section |

