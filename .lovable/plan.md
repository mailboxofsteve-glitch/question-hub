

## Understanding

Yes — I understand exactly what you're describing. Right now, the code treats each gate (S-01, S-02, S-03) as an independent hub within its tier band, and when S-02 appears in S-01's `spine_gates`, it gets drawn *again* as a branch satellite. This creates duplicates and loses the sequential chain structure.

What you want is a **vertical spine column** — like vertebrae stacked bottom-to-top:

```text
        S-03    ← top
          |
        S-02    ← middle  
          |
        S-01    ← bottom (foundational)
```

Each spine node (S-01 through S-25) is a single disk positioned along a central vertical axis, ordered by its number. The tier bands still exist as colored background regions, but spine nodes are placed sequentially up the column regardless of how many fall in the same tier. Branch nodes will later radiate horizontally outward from their parent spine node.

The key insight: the spine is **one continuous vertical chain**, not scattered hubs per tier. S-02 references S-01 not because it's a "branch" of S-01, but because S-01 is its prerequisite — so S-02 sits directly above S-01 on the spine.

---

## Plan (`src/pages/SpineMap.tsx`)

### 1. Deduplicate spine nodes
- Currently spine nodes can appear both as a gate hub AND as a branch of another gate. Instead, collect all unique spine nodes (matching `s-\d+`) into a single ordered list sorted by their numeric suffix.
- Each spine node gets **one** position on the vertical axis — no duplicates.

### 2. Layout spine as a vertical column
- Position all spine nodes along a single X coordinate (center of the content area).
- Stack them vertically bottom-to-top by spine number: S-01 at the bottom, S-25 at the top.
- Space them evenly within the total chart height so they span across the tier bands naturally.
- Draw connecting lines between consecutive spine nodes (S-01→S-02→S-03…) to form the vertebral chain.

### 3. Keep tier bands as background context
- The colored horizontal tier bands remain, providing visual context for which tier each spine node falls in.
- Spine nodes are colored by their tier as before, so you can see which tier region they belong to.

### 4. Exclude spine nodes from branch rendering
- When rendering branches around a gate, skip any branch whose ID matches the spine pattern (`s-\d+`) — those are already on the spine column.
- Non-spine branches will later radiate outward from their parent spine node (not implemented yet, but the structure supports it).

### 5. Labels and tooltips unchanged
- Spine node labels (S-01, S-02…) render above each disk.
- Tooltips still show the node's actual title on hover.
- Click-to-navigate still works for all nodes.

