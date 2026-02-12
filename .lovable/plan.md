

# Add `search_blob` to Search Query

## What changes

### `src/hooks/use-node-search.ts`

**1. Add `search_blob` to the `.or()` filter** (line 63)

```typescript
q = q.or(`title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term},search_blob.ilike.${term}`);
```

This means any node whose `search_blob` contains the search term will now be returned by the database query.

**2. Optionally add `search_blob` to client-side scoring** (in `scoreResult`, around line 26-41)

Add a small relevance weight (+2) for `search_blob` matches, so results that match on `search_blob` rank reasonably but below title/keyword matches:

```typescript
const searchBlob = (node.search_blob ?? '').toLowerCase();
if (searchBlob.includes(t)) score += 2;
```

**3. Update the `NodeSearchResult` interface and `.select()` call**

- Add `search_blob: string | null` to the `NodeSearchResult` interface
- Add `search_blob` to the `.select()` call so the field is available for client-side scoring

## Summary of changes

Only one file is modified: `src/hooks/use-node-search.ts`. Three small edits:
1. Add `search_blob` to the interface
2. Add it to the `.select()` and `.or()` filter
3. Add a +2 relevance weight in `scoreResult`

No database changes needed — the column already exists.

