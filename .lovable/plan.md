

## Enhance the Vertebrae of Truth Graph

Four improvements to the interactive graph, all within `src/pages/SpineMap.tsx`, preserving the existing tier/spine/branch structure.

---

### 1. Animated Transitions
- **On load**: Fade-in spine nodes sequentially (bottom to top) using D3 transitions with staggered delays, then fade in branch nodes.
- **On hover**: Smooth radius scaling via D3 `.transition().duration(150)` instead of the current instant resize.
- **Zoom/pan**: Already smooth via D3 zoom; no changes needed.

### 2. Tier Collapse/Expand
- Add a `collapsedTiers` state (`Set<number>`).
- Make each tier label clickable. Clicking toggles that tier in the set.
- When a tier is collapsed, reduce its band height to ~40px (just showing the label + a chevron icon), hide all spine and branch nodes within that tier, and skip their connection lines.
- Recalculate `tierBandY` dynamically based on which tiers are collapsed, so the layout compresses smoothly.

### 3. Search & Highlight
- Add a small search input above the graph (next to the Print View button).
- On typing, filter `nodes` by title match. Nodes that don't match get reduced opacity (0.15) on both circles and labels. Matching nodes get a bright stroke highlight ring.
- Connection lines to non-matching nodes also dim. Clearing the input restores full opacity.
- Uses local state only; no backend calls.

### 4. Node Count Badges
- For each spine node, count how many branch nodes reference it via `spine_gates`.
- Render a small text element (or circle + text) offset to the upper-right of each spine circle showing the count (e.g., "3").
- Only show the badge when count > 0. Style with a small filled circle background matching the tier color.

---

### Technical notes
- All changes are in `src/pages/SpineMap.tsx` (the D3 `useEffect` and the JSX above/around the SVG).
- New React state: `collapsedTiers: Set<number>`, `searchQuery: string`.
- The `useEffect` dependency array will include `collapsedTiers` and `searchQuery` so the SVG re-renders when they change.
- Badge counts are derived from `branchesByGate` (already computed in `useMemo`).

