

## Upgrade: `POST /api/answer` Navigation Assistant

Create a new edge function that accepts a user query, searches the database for relevant published nodes, sends the matched content to an LLM for summarization, and returns suggested nodes with short explanations grounded strictly in existing content.

---

### How it works

1. **User sends a query** (e.g. "Why does evil exist?")
2. **Edge function searches the `nodes` table** using `ilike` across title, keywords, layer1, search_blob (same logic as the current client-side search)
3. **Applies relevance scoring** server-side (the same weighted algorithm currently in `use-node-search.ts`) to rank and select the top results
4. **Sends the top node content to Lovable AI** with a strict system prompt that says: "You are a navigation assistant. Summarize ONLY the provided node content to explain why each node is relevant to the user's query. Do NOT generate new claims, arguments, or information."
5. **Returns JSON** with the list of suggested nodes and the LLM-generated explanation

---

### What gets created / changed

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/api-answer/index.ts` | **Create** | New edge function: search + LLM summarization |
| `supabase/config.toml` | **Update** | Add `[functions.api-answer]` with `verify_jwt = false` |
| `src/hooks/use-node-search.ts` | **Update** | Replace direct Supabase queries with a call to the new endpoint |
| `src/pages/Index.tsx` | No change | Already consumes hook results |
| `src/pages/SearchResults.tsx` | No change | Already consumes hook results |

---

### Edge function: `api-answer`

**Endpoint:** `POST /api-answer`

**Request body:**
```json
{
  "query": "Why does evil exist?",
  "category": "Theology",   // optional filter
  "limit": 10               // optional, default 10
}
```

**Response:**
```json
{
  "query": "Why does evil exist?",
  "nodes": [
    {
      "id": "problem-of-evil",
      "title": "What is the problem of evil?",
      "category": "Theology",
      "layer1": "The problem of evil asks how...",
      "relevance": "This node directly addresses your question by explaining..."
    }
  ],
  "summary": "Based on the available content, your question relates to several nodes covering theodicy and the nature of suffering..."
}
```

**Logic flow inside the function:**
1. Parse request, validate `query` is non-empty
2. Query `nodes` table (using service role key to bypass RLS, but filtering `published = true` explicitly) with `ilike` matching across title, keywords, layer1, search_blob
3. Apply the same weighted relevance scoring server-side
4. Take the top N results (default 10)
5. Build an LLM prompt containing only the matched nodes' titles, layer1 summaries, and keywords
6. Call Lovable AI (`google/gemini-3-flash-preview`) with a strict system prompt forbidding new claims
7. Parse the LLM response (using tool calling to get structured output with per-node relevance explanations and an overall summary)
8. Return the combined result

**System prompt (key constraint):**
> You are a navigation assistant for a faith-based Q&A knowledge base. Given a user's question and a set of existing content nodes, explain why each node is relevant. You may ONLY summarize or reference information that appears in the provided node content. Do not generate new claims, arguments, theological positions, or information of any kind.

---

### Hook update: `use-node-search.ts`

The hook will call the edge function instead of querying the database directly:
- `POST` to `/functions/v1/api-answer` with `{ query, category, limit: 50 }`
- Map the response `nodes` array to the existing `NodeSearchResult` shape (adding a `relevance` field)
- The LLM summary and per-node relevance text will be available for the UI to display (initially unused, but ready)
- Category fetching stays as a separate direct query (lightweight, no LLM needed)
- Analytics tracking remains client-side with the same debounce logic

---

### Technical details

- **No streaming needed** -- the response is a single JSON payload, not a chat conversation
- **LLM is optional graceful degradation** -- if the LLM call fails (rate limit, timeout), the function still returns the search results without the summary/relevance fields
- **Secrets used:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY` (all already configured)
- **CORS headers** follow the same pattern as `admin-nodes`
- Uses Lovable AI structured output (tool calling) to get clean per-node relevance strings

