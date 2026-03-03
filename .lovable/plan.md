

## Spine Map: Larger Tier Labels + Published-Only Filtering

### Changes (single file: `src/pages/SpineMap.tsx`)

**1. Larger tier labels**
- Line 263: Increase `font-size` from `12` to `18` and bump `font-weight` to `800`
- This makes the "T0: Epistemological Bedrock" etc. labels more prominent and readable

**2. Filter to published nodes only**
- Line 113: Add `.eq("published", true)` to the query so only published nodes are fetched
- This means the graph automatically updates as more nodes get published — unpublished nodes simply won't appear
- Remove the conditional radius logic (line 219: `branch.published ? 7 : 4`) since all nodes will be published; use a fixed radius of `7`

**3. Print view also reflects published-only**
- No extra changes needed — the print view already renders from the same `nodes` data, so filtering at the query level covers both views

### Technical Details
- The query filter `.eq("published", true)` runs server-side, so the graph is always current with the latest published state
- React Query's cache will refresh on remount, so publishing a node in admin and navigating to `/graph` will show the update

