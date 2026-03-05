

## Guided Diagnostic Flow: Start/Resume + Auto-Advance

### Overview
Transform the diagnostic journey from manual node-clicking into a guided flow: a prominent button over the graph auto-opens the next unresponded node, and after each submission the next node opens automatically. When multiple nodes are available, the user picks which route to take.

### Key Concepts

**Next available nodes**: unlocked nodes that have NOT been responded to. Computed from `unlockedIds` minus `respondedIds`.

**Ordering**: Spine nodes first (by number), then branch nodes. This gives a natural progression.

**Route choice**: When >1 node is available, show a selection dialog listing the options with their titles before opening one.

### Changes — `src/pages/Diagnostic.tsx`

1. **Compute `availableNodes`** (memo): filter `nodes` to those in `unlockedIds` but not in `respondedIds`, sorted spine-first then by ID.

2. **`journeyComplete`** flag: `availableNodes.length === 0 && respondedIds.size > 0`.

3. **Start/Resume button**: Render a centered overlay button on top of the graph container:
   - Label: `respondedIds.size === 0 ? "Start Diagnostic" : journeyComplete ? "Journey Complete" : "Resume Diagnostic"`
   - On click: if 1 available node → open it directly; if >1 → set `showRouteChoice = true`; if 0 → no-op (disabled).

4. **Route choice dialog**: A new `Dialog` listing available nodes as clickable options (title + ID). Selecting one sets `overlayNodeId` and closes the dialog.

5. **Auto-advance after submit**: In `handleResponse`, after calling `respond()`, instead of just closing the overlay, compute the next available nodes (post-response). If 1 → open it; if >1 → show route choice; if 0 → close overlay (journey complete or blocked).
   - Since state updates are async, use a `useEffect` that watches for when `overlayNodeId` is cleared after a response to trigger auto-advance.

6. **State additions**:
   - `showRouteChoice: boolean` — controls the route selection dialog
   - `justResponded: boolean` — flag to trigger auto-advance after response submission

### Flow Diagram
```text
Welcome Dialog → [Dismiss] → Graph + "Start Diagnostic" button
  → [Click] → (1 node available) → Open node modal
            → (>1 nodes available) → Route choice dialog → select → Open node modal
  → [Respond] → (next nodes available) → auto-open or route choice
             → (no next nodes) → back to graph + "Resume" or "Complete"
  → [Close modal] → Graph + "Resume Diagnostic" button
```

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Diagnostic.tsx` | Add availableNodes memo, Start/Resume button, route choice dialog, auto-advance logic |

