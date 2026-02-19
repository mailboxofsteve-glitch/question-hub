

## Scalable Semantic Search with Vector Embeddings

### Why Change the Approach

The previously approved plan sends ALL published nodes to the LLM when keyword search falls short. This works at 15 nodes but breaks down as the catalog grows:

| Catalog size | Full-catalog LLM call | Vector search |
|---|---|---|
| 15 nodes | Fine | Overkill |
| 100 nodes | Borderline (slow, costly) | Fast |
| 500+ nodes | Fails (context limits) | Fast |
| 10,000 nodes | Impossible | Still fast |

### How It Works

```text
User query: "Why do bad things happen?"
        |
        v
  [1] Convert query to embedding vector (one LLM call, cheap)
        |
        v
  [2] Database finds 5 closest nodes by vector similarity (milliseconds, no LLM)
        |
        v
  [3] Merge with keyword results (union of both sets, deduplicated)
        |
        v
  [4] Send top 5 nodes to LLM for explanation text (same as current flow)
        |
        v
  Response: { nodes: [{ id, title, layer1, explanation }], query_echo }
```

### Implementation Plan

**Step 1: Enable pgvector and add embedding column**

Database migration to:
- Enable the `vector` extension
- Add an `embedding` column (`vector(768)`) to the `nodes` table
- Create an index for fast similarity search (HNSW)
- Create a database function `match_nodes` that performs cosine similarity search

**Step 2: Create `generate-embeddings` backend function**

A new backend function that:
- Takes a node ID (or "all" to batch-process)
- Reads the node's title, layer1, keywords, and alt_phrasings
- Calls the embedding model to generate a vector
- Stores the vector in the `embedding` column
- Called automatically when nodes are created/updated via admin, and can be triggered manually for batch backfill

**Step 3: Update `api-answer` to use vector search as fallback**

Modified search flow:
1. Run keyword `ilike` search (unchanged)
2. If fewer than 3 keyword results, run vector similarity search instead of fetching all nodes
3. Merge and deduplicate results from both passes
4. Send top 5 to LLM for explanation (unchanged)

This replaces the "send all nodes to LLM" fallback with a database query that returns in milliseconds regardless of catalog size.

**Step 4: Update `admin-nodes` to trigger embedding generation**

When a node is created or updated, call the `generate-embeddings` function to keep the embedding in sync (similar to how `search_blob` is rebuilt on save).

### Files Changed

| File | Change |
|---|---|
| New migration SQL | Enable pgvector, add `embedding` column, create `match_nodes` function |
| `supabase/functions/generate-embeddings/index.ts` | New function: generates and stores embeddings |
| `supabase/functions/api-answer/index.ts` | Replace full-catalog LLM fallback with vector similarity query |
| `supabase/functions/admin-nodes/index.ts` | Trigger embedding generation on create/update |

### What Stays the Same

- Response contract: `{ nodes: [{ id, title, layer1, explanation }], query_echo }` -- no frontend changes
- Keyword search (Pass 1) -- still runs first, still useful for exact matches
- LLM explanation step -- still generates per-node explanations for the final top 5
- All AI logic stays server-side

### Scaling Profile

- Embedding generation: one-time cost per node (runs on save)
- Query time: ~50ms for vector search regardless of catalog size
- LLM cost per query: unchanged (always 5 nodes max)
- Storage: ~3KB per node for the embedding vector

