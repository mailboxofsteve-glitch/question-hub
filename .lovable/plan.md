

## Highlight Node Hierarchy on Click

### Behavior
1. **First click** on any node: highlights the full ancestor path to that node. For a branch node like `test-node`, this traces back through its `spine_gates` parent, then that parent's parent, and so on up to the root spine chain. All spine nodes in the chain up to the relevant ancestor are also highlighted.
2. **Second click** on the same (already-highlighted) node: navigates to `/node/:id` as before.
3. **Escape key** to deselect: clears the highlighted path and returns to normal view. This is intuitive — Escape universally means "cancel/dismiss" — and is not consumed by browsers for anything disruptive on a normal page.

### Visual treatment when a path is active
- All nodes and lines NOT in the path are dimmed (same `dimOpacity` used by search).
- Nodes and connection lines IN the path get full opacity + a gold highlight ring (similar to search match styling).
- The spine chain lines between spine nodes in the path are also highlighted.

### Technical approach (single file: `src/pages/SpineMap.tsx`)

1. **New state**: `selectedNodeId: string | null` — tracks which node's path is being shown.

2. **Compute ancestor path** (`useMemo`): Given `selectedNodeId` and the `nodes` array, walk up the `spine_gates` chain to build a `Set<string>` of all ancestor IDs. Also include all spine nodes from S-01 up to the highest spine node in the chain (since spine nodes form a sequential chain). Returns `null` when no node is selected.

3. **Modify click handlers**: Both spine and branch circle `.on("click")` handlers check if the clicked node is already selected → navigate. Otherwise → set `selectedNodeId`.

4. **Escape key listener**: `useEffect` that adds a `keydown` listener for Escape, calling `setSelectedNodeId(null)`. Cleanup on unmount.

5. **Modify rendering opacity logic**: The existing `isMatch` function already handles dimming. Add a similar `isInPath` check. When a path is active, it takes priority over search for dimming purposes. Nodes in the path get full opacity + gold stroke; others get dimmed.

6. **Update description text**: When a path is active, show a hint like "Press Esc to clear selection" in the subtitle area.

### File changed
- `src/pages/SpineMap.tsx`

