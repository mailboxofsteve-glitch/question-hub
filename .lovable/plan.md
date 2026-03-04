

## Allow Non-Spine Nodes as Parent Connection Points

### Root Cause
The graph code only adds nodes matching the `s-\d+` pattern to the parent position lookup map (`spinePosById`). When `test-node` lists `what-is-a-worldview` in its `spine_gates`, the lookup fails, zero parents are found, and the node is silently dropped.

Your tier and publish settings are correct — the data is fine. This is purely a code logic gap.

### Solution (single file: `src/pages/SpineMap.tsx`)

Refactor the D3 rendering logic into a multi-pass system:

1. **Pass 1 — Spine nodes** (unchanged): Position all `s-\d+` nodes in their tier bands with the existing zigzag layout. Add them to a shared `posById` map.

2. **Pass 2 — Hub nodes**: Scan all branch candidates' `spine_gates` arrays. For any gate ID not already in `posById`, find that node in the fetched data, position it within its own tier band (using a slightly larger radius than regular branches, e.g. 20px), and add it to `posById`. This makes `what-is-a-worldview` (tier 0) a valid connection target.

3. **Pass 3 — Branch nodes** (mostly unchanged): Position remaining branch nodes using the now-complete `posById` map. `test-node` will find `what-is-a-worldview` in the map and connect to it with a dashed line, appearing in tier 3.

Hub nodes will be visually distinct — slightly larger than branch nodes but smaller than spine nodes — so users can see they serve as intermediate connection points.

### What this fixes
- `test-node` (tier 3) will appear on the graph, connected to `what-is-a-worldview` (tier 0)
- Any future node referencing a non-spine node as its gate will also work automatically
- No database changes needed

