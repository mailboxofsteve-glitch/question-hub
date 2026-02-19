

## Fix: Search Not Finding Alt Phrasings

### Problem

When you search "Is there a God?", zero results appear even though `node-001-does-god-exist` has that exact phrase as an alternative phrasing. This happens because:

1. The `search_blob` field for this node is **empty** (`null`). The admin form never populates it.
2. `alt_phrasings` is stored as a JSON array, which the database text search (`ilike`) cannot match against.
3. The CSV and Markdown importers correctly build `search_blob` from title + layer1 + keywords + alt phrasings, but the admin API does not.

### Solution

Auto-generate `search_blob` in the **admin-nodes** backend function whenever a node is created or updated. This is a single change to one file.

---

### Changes

**File: `supabase/functions/admin-nodes/index.ts`**

Add a helper function that builds `search_blob` from the node fields (same logic used by the CSV/Markdown parsers):

```
function buildSearchBlob(data): string {
  return [title, layer1, keywords, altPhrasings.join(' ')]
    .filter(Boolean).join(' ')
}
```

Then call it in both the **POST** (create) and **PUT** (update) handlers so that `search_blob` is always written alongside the other fields.

For **PUT** (update), since only changed fields are sent, the function will first fetch the existing node, merge in the updates, then rebuild `search_blob` from the merged data.

**File: `supabase/functions/api-answer/index.ts`**

No changes needed -- the search query already filters on `search_blob.ilike`, and the `scoreNode` function already scores `alt_phrasings` text. Once `search_blob` is populated, both will work correctly.

---

### What this fixes

- All nodes created or edited via the admin panel will have a complete `search_blob`
- Searching "Is there a God?" will match `node-001-does-god-exist` because `search_blob` will contain that phrase
- Existing nodes with `null` search_blob will be fixed the next time they are saved through the admin panel

### Backfill existing nodes

After deploying, a one-time SQL update can backfill `search_blob` for all existing nodes that have it as `null`. This will be run as a database migration:

```sql
UPDATE nodes
SET search_blob = CONCAT_WS(' ',
  title,
  layer1,
  keywords,
  ARRAY_TO_STRING(
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(alt_phrasings, '[]'::jsonb))),
    ' '
  )
)
WHERE search_blob IS NULL;
```

---

### Summary of files changed

| File | Change |
|------|--------|
| `supabase/functions/admin-nodes/index.ts` | Add `buildSearchBlob` helper; use it in POST and PUT |
| Database migration | Backfill `search_blob` for existing nodes |

No frontend changes needed.

