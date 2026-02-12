

## Update `/api/answer` search logic to prioritize `search_blob`

### Overview

Two changes: (1) make the `answer` edge function use `search_blob` as the primary search field with fallback to individual columns, and (2) ensure `search_blob` is always populated server-side when nodes are created or updated via the admin API.

---

### Changes

**1. `supabase/functions/admin-nodes/index.ts` -- auto-build `search_blob` on create/update**

Add a helper function `buildSearchBlob(body)` that concatenates:
- `title`
- `keywords`
- `alt_phrasings` (joined from JSON array)
- `layer1`
- reasoning summaries from `layer2_json.reasoning[].summary` (optional, included if present)

On both POST (create) and PUT (update), compute and set `search_blob` automatically so it's always up to date. On PUT, if any of the constituent fields changed, re-fetch the full node first to rebuild the blob from complete data.

**2. `supabase/functions/answer/index.ts` -- simplify query to use `search_blob` primarily**

- Primary query: `search_blob.ilike.%term%` (covers nodes with a populated search_blob)
- Fallback: also include `title.ilike.%term%` in the OR to catch any nodes where search_blob might be null/empty
- Scoring stays the same (still extracts title, keywords, alt_phrasings individually for weighted scoring)
- Response shape unchanged: `{ id, title, layer1, score }`

---

### Technical details

**`buildSearchBlob` helper (in admin-nodes):**

```text
function buildSearchBlob(node):
  parts = [node.title, node.keywords]
  if node.alt_phrasings is array:
    parts.push(alt_phrasings.join(" "))
  parts.push(node.layer1)
  if node.layer2_json?.reasoning is array:
    for each bullet: parts.push(bullet.summary)
  return parts.filter(Boolean).join(" ")
```

On PUT, since only changed fields are sent, the function will fetch the existing node first, merge with incoming changes, then rebuild search_blob from the merged data.

**Updated answer query:**

```text
.or(`search_blob.ilike.%term%,title.ilike.%term%`)
```

This is simpler and faster than the current 4-column OR. The title fallback ensures nodes with empty search_blob are still findable. Scoring remains multi-field for proper ranking.

---

### Files to modify

| File | Change |
|------|--------|
| `supabase/functions/admin-nodes/index.ts` | Add `buildSearchBlob()`, call it on POST and PUT |
| `supabase/functions/answer/index.ts` | Simplify `.or()` query to use `search_blob` + `title` fallback |

No database migrations needed.

