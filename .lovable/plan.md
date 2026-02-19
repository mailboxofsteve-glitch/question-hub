

## Upgrade `/api-answer` to Navigation Assistant Spec

The existing edge function already has the search + LLM pipeline. This upgrade aligns it precisely with the requested contract.

---

### Changes

**1. `supabase/functions/api-answer/index.ts`** -- Update edge function

- Change default `limit` from 10 to 5 (top 3-5 nodes for LLM context)
- Rename `relevance` to `explanation` in the tool-calling schema and LLM result interface
- Rename response field `query` to `query_echo`
- Remove the `summary` field from the response (not in spec)
- Update the model to `google/gemini-3-flash-preview`
- When search returns zero results, skip the LLM call and return: `{ nodes: [], query_echo: "...", message: "No results found. Try rephrasing your question or using different keywords." }`
- Tighten the system prompt to match the spec exactly: "You are a navigation assistant. Using only the node content provided, write 1-2 sentences explaining why each node is relevant to the user's question. Do not add claims, arguments, or information not present in the node text."
- Remove `search_blob`, `keywords`, `alt_phrasings`, and `category` from the response nodes -- only return `id`, `title`, `layer1`, `explanation`

**2. `src/hooks/use-node-search.ts`** -- Update hook types and mapping

- Update `SearchResponse` interface to match new shape: `{ nodes: [{ id, title, layer1, explanation }], query_echo, message? }`
- Update `NodeSearchResult` to include `explanation` instead of `relevance`
- Map the response correctly for the UI (keep `category` available from the node data for display by re-querying if needed, or accept it won't be in the API response)

**3. No UI changes** -- Index.tsx and SearchResults.tsx already consume `results` from the hook and display `node.title`, `node.layer1`, and `node.category`. Since `category` will no longer be in the API response, the category badge won't render in search results (acceptable -- the data is still on the node detail page). The `explanation` field will be available for future UI display.

---

### Technical details

- The edge function still supports `category` as a filter parameter -- it just won't return category in the response nodes
- LLM graceful degradation remains: if the LLM call fails, nodes are returned without `explanation`
- The hook continues to send `limit: 50` for category-only browsing but the edge function caps LLM context at 5 nodes
- CORS headers unchanged
- All AI logic stays server-side per architecture rules
