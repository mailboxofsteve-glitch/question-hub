

# Fix: Admin Node Update "Failed to fetch" Error

## Problem
The edge function works correctly (confirmed by direct testing), but the browser request fails with "Failed to fetch." The NodeForm sends the **entire node** on every update — including massive `layer2_json` and `layer3_json` fields — even when only toggling the `published` switch. This causes the request to hit size or timeout limits on the gateway.

## Solution
Send only the fields that actually changed, rather than the entire node payload.

## Changes

### 1. `src/components/admin/AdminDashboard.tsx`
- Modify `handleUpdate` to compare the submitted data against `editingNode` and only send fields that differ, plus the `id` for identification.

### 2. `src/components/admin/NodeForm.tsx`
- Add a `dirty` tracking mechanism: compare each field against the original `node` prop and only include changed fields in the `onSubmit` call.
- Alternatively, keep the form as-is and let the dashboard handle the diff (simpler approach).

## Technical Details

The simplest fix is in `AdminDashboard.tsx`. Before calling `adminFetch`, diff the submitted data against `editingNode` and build a minimal update payload:

```text
// Pseudocode
const changes = {};
for (const key of Object.keys(data)) {
  if (JSON.stringify(data[key]) !== JSON.stringify(editingNode[key])) {
    changes[key] = data[key];
  }
}
// Send only changes (plus id)
```

This ensures that toggling just the `published` flag sends `{ "published": true }` instead of the entire multi-KB node object.

