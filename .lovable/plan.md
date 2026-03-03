

## Space Out Spine Nodes with Staggered Offset

### Problem
Spine nodes (radius 28) within the same tier band overlap because the 180px band height isn't enough when multiple nodes share a tier. They're also all on the same X coordinate, creating a crowded column.

### Solution (single file: `src/pages/SpineMap.tsx`)

1. **Dynamic band height**: Instead of a fixed 180px, calculate each tier's expanded height based on how many spine nodes it contains. Use a minimum vertical spacing of ~70px per node (diameter + gap), with a floor of 180px for tiers with 0-2 nodes.

2. **Horizontal zigzag offset**: Alternate spine nodes left and right of center by ~30px, creating a subtle serpentine/DNA-helix effect along the vertebral column. Even-indexed nodes shift left, odd-indexed shift right (or vice versa). This visually separates overlapping nodes and adds visual interest.

3. **Update spine chain lines**: The connecting lines between sequential spine nodes already use each node's `(x, y)`, so the zigzag will automatically produce angled chain segments, reinforcing the vertebral aesthetic.

### Changes
- Add a pre-pass that counts spine nodes per tier and computes per-tier band heights before layout.
- In the spine positioning loop, apply `x = spineX + (i % 2 === 0 ? -1 : 1) * 30` for the zigzag.
- Increase minimum spacing so centers are at least 70px apart vertically.

