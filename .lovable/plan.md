

## Show Branch Nodes on the Spine Map

### Problem
The Spine Map only renders spine nodes (IDs matching `S-01`, `S-02`, etc.). Branch nodes like `what-is-a-worldview` that reference a spine gate via `spine_gates: ["S-02"]` are never placed on the SVG. The data is fetched (it's in the query results), but no code positions or draws them.

### Solution
After positioning spine nodes, iterate over all non-spine published nodes that have `spine_gates`, and render them as smaller satellite circles radiating horizontally from their parent spine node.

### Changes (single file: `src/pages/SpineMap.tsx`)

**1. Collect and position branch nodes (after spine positioning, before rendering)**
- For each non-spine node with a `spine_gates` array, find the first matching spine node in `posNodes`
- Position branch nodes to the left and right of their parent spine node, offset horizontally (e.g. alternating sides), with slight vertical jitter to avoid overlap
- Use a smaller radius (12-14) and the same tier color as the parent

**2. Draw branch connection lines**
- For each branch node, draw a line from it to its parent spine node

**3. Draw branch circles and labels**
- Render branch nodes as smaller circles with hover tooltips and click-to-navigate (same interaction pattern as spine nodes)
- Show a truncated title label near each branch node

**4. Update posNodes sort**
- The current sort assumes all posNodes match `s-(\d+)` — this will crash when branch nodes are added. Fix by sorting spine nodes separately or by guarding the regex match.

### Visual layout
```text
              ┌──────────┐
   [branch]───│  S-03    │───[branch]
              └──────────┘
                   │
              ┌──────────┐
   [branch]───│  S-02    │───[branch]
              └──────────┘
                   │
              ┌──────────┐
              │  S-01    │
              └──────────┘
```

Branch nodes fan out horizontally from their parent gate, alternating left/right, within the same tier band.

