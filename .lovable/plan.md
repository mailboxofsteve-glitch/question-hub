

## Fix Hub/Branch Node Positioning

### Two bugs to fix in `src/pages/SpineMap.tsx`

**Bug 1: Hub nodes lose their own parent connections**
`what-is-a-worldview` has `spine_gates: ["S-05"]` — it's a branch of S-05. But because `test-node` references it as a gate, the code reclassifies it as a "hub" and removes it from the branch candidate list (line 375). It gets positioned in tier 0 but loses its connection line to S-05.

**Fix**: Don't separate hub nodes from branch processing. Instead, use a two-step approach:
- First, process ALL non-spine nodes as branches (existing logic), positioning them relative to their parents and adding connection lines.
- After all branches are positioned, add each branch to `posById` so other branches can reference them as parents.
- Then do a second pass for any branch whose gates weren't found in the first pass (because the gate was itself a branch that needed positioning first).

**Bug 2: Branch nodes positioned at parent's Y instead of own tier**
Currently line 401: `y: parentPos.y + yJitter` — this places the branch at the parent's vertical position. For cross-tier connections (test-node in tier 3 → what-is-a-worldview in tier 0), the branch should be in its OWN tier band, with a connection line drawn back to the parent.

**Fix**: Position branch nodes in their own tier band's Y range, not at the parent's Y. Use the parent's position only for the connection line endpoint, and for X offset calculation. The Y position should come from `tierBandY(bTier)`.

### Revised approach (simpler)

Replace the 3-pass system with:

1. **Pass 1 — Spine nodes** (unchanged): Position spine nodes, add to `posById`.

2. **Pass 2 — All non-spine nodes, multi-round**: 
   - Round 1: Try to position every non-spine node. For each, look up its `spine_gates` in `posById`. If found, position it in its **own tier band** (Y from tier band, X offset from parent), draw connection line to parent, and add it to `posById`.
   - Round 2: Retry any nodes that failed in round 1 (their gate may now be in `posById` after round 1 positioned it). Repeat until no more nodes can be placed or all are placed.
   
   This naturally handles chains: S-05 → what-is-a-worldview → test-node. Round 1 places what-is-a-worldview (gate S-05 exists). Round 2 places test-node (gate what-is-a-worldview now exists).

3. **Y positioning for branches**: Use the node's own tier band for vertical placement. Calculate Y within `tierBandY(bTier)` range. X offset still relative to parent for visual grouping, but with the connection line spanning tiers if needed.

### Key details
- Remove the separate hub node concept entirely — all non-spine nodes are branches
- Each branch is placed in its own tier's Y band
- Connection lines are drawn from the branch to whichever parent node it references (can cross tiers)
- After positioning each branch, add it to `posById` so downstream nodes can find it
- Use iterative rounds (max ~5) to resolve chains

### File changed
- `src/pages/SpineMap.tsx` — replace Pass 2 (hub nodes) and Pass 3 (branch nodes) with the unified multi-round branch positioning system

