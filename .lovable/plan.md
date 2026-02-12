

## API Boundary: POST /api/answer

This plan creates a new backend function that serves as the single entry point for all search (and future AI) queries, then rewires the frontend to use it exclusively.

---

### What changes

**1. New edge function: `supabase/functions/answer/index.ts`**

- Accepts `POST` with JSON body `{ "question": string, "max_results"?: number }`
- Treats `question` as a keyword search (same ilike logic currently in the frontend hook)
- Searches `title`, `keywords`, `alt_phrasings` (cast to text), and `search_blob` columns
- Filters to `published = true` only
- Applies client-side relevance scoring (same algorithm from `use-node-search.ts`) server-side
- Returns the specified response shape with `query`, `results` (id, title, layer1, score), and `meta` (took_ms, count)
- Logs the search to the `events` table: event_type `search`, with metadata containing query, result node IDs, count, and response time
- No admin password required (public endpoint)
- CORS headers included

**2. Update `supabase/config.toml`**

- Add `[functions.answer]` with `verify_jwt = false`

**3. New frontend hook: `src/hooks/use-answer-search.ts`**

- Replaces direct Supabase queries with a `POST` call to the `/functions/v1/answer` endpoint
- Debounces input at 300ms using a ref-based timer
- Returns the same shape the UI expects: results array, loading state, etc.
- Empty query returns no results (no API call)

**4. Update `src/pages/Index.tsx`**

- Switch from `useNodeSearch` to `useAnswerSearch`
- Results now come from the API response (id, title, layer1, score)
- Category browse tiles still use the existing `useNodeSearch` categories query (read-only, lightweight)

**5. Update `src/pages/SearchResults.tsx`**

- Switch from `useNodeSearch` to `useAnswerSearch`
- Same result card rendering, adapted to the API response shape

**6. Keep `src/hooks/use-node-search.ts` for now**

- Only used for category listing on the home page (no search through it)
- Can be removed later once categories also go through the API

---

### Technical details

**Edge function search logic:**

```text
POST /answer
  -> parse body.question, body.max_results (default 20, max 50)
  -> if question is empty/whitespace, return empty results
  -> query nodes table:
       SELECT id, title, layer1, keywords, alt_phrasings, search_blob
       WHERE published = true
       AND (title ilike %term% OR keywords ilike %term%
            OR layer1 ilike %term% OR search_blob ilike %term%)
       ORDER BY updated_at DESC
       LIMIT 50
  -> apply scoring algorithm server-side
  -> sort by score descending, slice to max_results
  -> insert event row (fire-and-forget)
  -> return JSON response
```

**Debounce approach (frontend):**

- `useEffect` with a `setTimeout` of 300ms on query changes
- Clears previous timer on each keystroke
- Uses `useQuery` with the debounced value as the query key, `enabled` only when non-empty

**Response shape matches spec exactly:**

```json
{
  "query": "string",
  "results": [
    { "id": "string", "title": "string", "layer1": "string", "score": 0.0 }
  ],
  "meta": { "took_ms": 0, "count": 0 }
}
```

---

### Files to create/modify

| File | Action |
|------|--------|
| `supabase/functions/answer/index.ts` | Create |
| `supabase/config.toml` | Add answer function config |
| `src/hooks/use-answer-search.ts` | Create |
| `src/pages/Index.tsx` | Switch to `useAnswerSearch` |
| `src/pages/SearchResults.tsx` | Switch to `useAnswerSearch` |

No database changes required -- the existing `nodes` and `events` tables are sufficient.

