

## Spine Map: Vertical Stacked Tier Layout

### Current Problem
The graph uses a force-directed simulation where nodes float freely with only a weak `forceY` pulling them toward tier bands. This creates a scattered, organic layout rather than the structured "spine" format with clear horizontal tier rows stacked vertically.

### Proposed Changes (single file: `src/pages/SpineMap.tsx`)

**Replace the force-directed D3 simulation with a deterministic, structured layout:**

1. **Invert tier order** -- Tier 0 at the bottom, Tier 6 at the top (lower to higher, bottom to top).

2. **Render each tier as a distinct horizontal row/band** with:
   - A colored background strip spanning the full width
   - A tier label on the left side (e.g., "T0: Epistemological Bedrock")
   - Spine gate circles arranged in a row within each band
   - Branch nodes rendered as smaller dots clustered around their parent gate

3. **Layout approach**: Drop D3 force simulation entirely. Instead, compute fixed x/y positions:
   - Each tier gets a fixed y-band (height divided into 7 rows, bottom-up)
   - Gates within a tier are evenly spaced horizontally
   - Branch nodes are positioned in a small arc or cluster around their parent gate

4. **Keep existing interactivity**: zoom/pan via D3 zoom, hover tooltips, click-to-navigate on branches, and dragging.

5. **Draw vertical "spine" connector lines** between adjacent tier bands to reinforce the stacked structure.

6. **Keep links** from gates to their branch nodes as subtle curved lines.

### Technical Details

- Replace `forceSimulation` with a manual position calculator that assigns `x, y` to each node based on tier index and gate index within that tier
- Use `d3.zoom` on the SVG for pan/zoom (same as current)
- Render tier background rectangles as `<rect>` elements behind the nodes
- Render a vertical center line ("the spine") connecting tier bands
- Keep drag behavior but constrain it to not disrupt the overall layout structure (optional: remove drag entirely for cleaner UX)
- SVG height should be taller to accommodate 7 stacked rows (~1200px or dynamic based on node count)

