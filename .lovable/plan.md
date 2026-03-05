

## Fix Auto-Advance: React to Updated State

### Root Cause
When `handleResponse` runs, it calls `respond()` which updates localStorage/DB, but `unlockedIds` and `respondedIds` haven't recomputed yet. So `availableNodes.filter(n => n.id !== overlayNodeId)` returns an empty list because newly unlocked nodes aren't in `availableNodes` yet. The overlay closes, showing the graph.

### Fix
Use a ref (`pendingAdvanceRef`) to signal that we just responded and want to auto-advance. Then a `useEffect` watching `availableNodes` picks up the change once state has recomputed and opens the next node.

### Changes — `src/pages/Diagnostic.tsx`

1. **Add `pendingAdvanceRef = useRef(false)`** — signals auto-advance is needed.

2. **Update `handleResponse`**: Instead of computing next nodes inline, just set `pendingAdvanceRef.current = true` and set `overlayNodeId` to `null`. Don't show route choice here.

3. **Add `useEffect`** watching `availableNodes` and `pendingAdvanceRef`:
   - If `pendingAdvanceRef.current` is true and `availableNodes.length > 0`:
     - If 1 node: set `overlayNodeId` to it
     - If >1: set `showRouteChoice = true`
   - If `availableNodes.length === 0`: journey complete, do nothing
   - Reset `pendingAdvanceRef.current = false`

4. **Remove** the inline next-node computation from `handleResponse` (lines 131-140).

This ensures the overlay reopens only after React has recomputed the unlocked/available nodes from the new response.

