

## Node Detail Overlay on Graph Page

### Approach
Instead of navigating to `/node/:id` on second click, open a modal overlay on the graph page that displays the node's full content. This keeps the user in context of the graph with their current zoom/selection intact.

### Implementation

**1. Extract reusable `NodeDetailContent` component**
- Create `src/components/NodeDetailContent.tsx` — extract the inner content from `NodeDetail.tsx` (the query, rendering of layer1/layer2/layer3, sources, related questions) into a standalone component that accepts an `id` prop.
- Remove `AppLayout` wrapper, reading progress bar, and breadcrumb from this extracted version (those are page-level concerns).
- Keep the share button, title, category badge, layer content, reasoning accordion, next steps, and sources.
- `NodeDetail.tsx` then imports and wraps `NodeDetailContent` with `AppLayout` + progress bar + breadcrumb (preserving existing page behavior).

**2. Add overlay state to `SpineMap.tsx`**
- New state: `overlayNodeId: string | null`.
- On second click (when `selectedNodeId === d.navigateId`), set `overlayNodeId = d.navigateId` instead of calling `navigate()`.
- Render a `Dialog` (from existing `@radix-ui/react-dialog` UI component) containing `NodeDetailContent` when `overlayNodeId` is set.
- The Dialog's built-in X close button handles dismissal. On close, clear `overlayNodeId` but keep `selectedNodeId` so the path stays highlighted.
- Escape key: when overlay is open, Dialog captures Escape to close itself (Radix default). When overlay is closed, the existing Escape handler clears the path selection — no conflict.

**3. Dialog styling**
- Use `DialogContent` with custom sizing: `max-w-2xl max-h-[85vh]` with `overflow-y-auto` for scrollable content.
- The existing Dialog component already includes the X close button in the top-right corner.

### Files changed
- **New**: `src/components/NodeDetailContent.tsx` — extracted node content component
- **Modified**: `src/pages/NodeDetail.tsx` — refactored to use `NodeDetailContent`
- **Modified**: `src/pages/SpineMap.tsx` — add overlay state, Dialog rendering, modify second-click behavior

