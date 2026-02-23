

## Add Node Preview for Unpublished Nodes

### Overview
Allow writers and editors to preview how a question node will look to readers before publishing it. A "Preview" button will be added to both the node list and the edit form, opening the full Node Detail view -- but without requiring the node to be published.

### How It Works

A new route `/node/:id/preview` will render the same Node Detail layout but without the `published = true` filter, so draft nodes are visible. This route will show a banner at the top indicating the node is in preview/draft mode. The existing public `/node/:id` route remains unchanged (published only).

### Changes

**1. New preview page** -- `src/pages/NodePreview.tsx`
- A copy-light version of `NodeDetail` that queries the node by ID without filtering on `published = true`
- Shows a colored banner at the top: "Preview -- This node is not yet published"
- Skips analytics tracking (no `view_node` event for previews)
- Related nodes query also removes the `published` filter so editors can see the full picture

**2. Register the route** -- `src/App.tsx`
- Add route: `/node/:id/preview` pointing to `NodePreview`

**3. Add Preview button to the admin node list** -- `src/components/admin/AdminDashboard.tsx`
- Add an "Eye" icon button in the Actions column (next to Edit and Delete)
- Clicking it opens `/node/{id}/preview` in a new tab via `window.open`

**4. Add Preview button to the edit form** -- `src/components/admin/NodeForm.tsx`
- Add an "Eye" icon button in the header (next to Download and Writer's Guide), visible only when editing
- Opens `/node/{id}/preview` in a new tab

### Header layout when editing:

```text
[Back]  Edit Node          [Preview] [Download] [?]
```

### Files Changed

| File | Change |
|---|---|
| `src/pages/NodePreview.tsx` | New file -- Node Detail view without published filter, with draft banner |
| `src/App.tsx` | Add `/node/:id/preview` route |
| `src/components/admin/AdminDashboard.tsx` | Add Preview (eye) icon button in table actions |
| `src/components/admin/NodeForm.tsx` | Add Preview (eye) icon button in form header |

### Technical Details

**NodePreview query (no published filter):**
```text
const { data, error } = await supabase
  .from('nodes')
  .select('*')
  .eq('id', id)
  .single();
```

**Draft banner:**
```text
{!node.published && (
  <div className="bg-amber-100 text-amber-800 text-sm font-medium px-4 py-2 rounded-md mb-6 text-center">
    Preview -- This node is not published yet
  </div>
)}
```

**Security consideration:** The preview route queries directly from the client. Since the `nodes` table data is already accessible via the admin edge function and the public endpoint only shows published nodes, no RLS changes are needed. The preview URL is not discoverable by regular users, and even if accessed, it only shows node content (which is intended to be public once published). If stricter access control is desired later, an admin-only guard can be added.

