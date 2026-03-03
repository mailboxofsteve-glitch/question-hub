

## Fix Duplicate Branch Nodes on Spine Map

### Problem
The current code iterates over each spine gate reference and creates a separate branch node entry per gate. A node like `what-is-a-worldview` with `spine_gates: ["S-01", "S-02"]` appears twice — once under S-01 and once under S-02.

### Solution (single file: `src/pages/SpineMap.tsx`)

Change the branch collection logic so each branch node appears only once, but can have **multiple parent connections**.

1. **Deduplicate branch nodes**: Instead of grouping by gate and pushing duplicates, iterate over non-spine nodes once. For each node, collect all matching spine parent positions. Position the node relative to its **first** parent gate (or the midpoint of its parents). Track all parent coordinates.

2. **Update the BranchNode type**: Change `parentX`/`parentY` to an array of parent positions: `parents: { x: number; y: number }[]`.

3. **Draw multiple connection lines**: When rendering branch connection lines, iterate over `bn.parents` and draw a line from each parent to the branch node.

4. **Result**: One circle per branch node, with dashed lines fanning out to each referenced spine gate.

