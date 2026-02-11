

# Fix: Search Broken by PostgREST Cast Syntax

## Root Cause
PostgREST does not support `::text` type casting inside `.or()` filter strings. The query `alt_phrasings::text.ilike.%term%` causes a 400 parse error on every search request.

## Solution
Remove the JSONB cast from the database query. Keep alt phrasing matching entirely client-side via the existing `scoreResult` function (which already scores +5 for alt phrasing hits).

### `src/hooks/use-node-search.ts`

**Change 1: Revert the `.or()` filter** (line ~59)

Remove `alt_phrasings::text.ilike.${term}` from the `.or()` call, restoring it to:
```typescript
q = q.or(`title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term}`);
```

The `alt_phrasings` field is still selected (for client-side scoring) and no other lines change.

## Trade-off
Nodes that match ONLY on an alt phrasing (and not on title, keywords, or layer1) will not be returned by the database query. This is acceptable for now because:
- Alt phrasings typically overlap with keywords or title content
- A proper fix for server-side JSONB search would require a Postgres function or a generated text column, which can be added later if needed

## What stays the same
- `alt_phrasings` remains in the `.select()` call
- `scoreResult` still gives +5 for alt phrasing matches (client-side ranking)
- All other search behavior unchanged
