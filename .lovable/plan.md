

## Spine Map: Larger Spine Nodes + Fix Tooltip Display

### Problem
1. Spine gate nodes (S-01, S-02, etc.) are currently radius `18` — user wants them slightly larger and prominently sized
2. Branch nodes at radius `7` are fine but could be slightly more visible
3. Tooltips are not displaying on hover — the tooltip div is positioned relative to the container but the coordinates come from the SVG's zoom transform, which doesn't account for the container's offset in the page

### Changes (single file: `src/pages/SpineMap.tsx`)

**1. Increase spine gate node size**
- Line 206: Change gate `radius` from `18` to `24`
- Line 298: The hover scale (`radius * 1.4`) will automatically scale with the larger size
- Line 322: Adjust gate label y-offset from `-24` to `-32` so text doesn't overlap the bigger circle

**2. Adjust branch node size**
- Line 220: Keep branch radius at `7` (or bump to `8`) — already visible relative to the larger gates

**3. Fix tooltip positioning**
- The tooltip div is `position: absolute` inside the container div, but `t.applyX(d.x)` gives coordinates in the full SVG viewBox space, not relative to the container
- Lines 297-306: In the `mouseover` handler, use the mouse event's `offsetX`/`offsetY` (relative to the SVG element) instead of computing from node coordinates. Change `_event` to `event` and use `event.offsetX` / `event.offsetY` for tooltip position
- This reliably positions the tooltip near the cursor regardless of zoom/pan state

