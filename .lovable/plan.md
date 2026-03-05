

## Fix Auto-Advance: Keep Overlay Open Between Nodes

The current issue is that `handleResponse` clears `overlayNodeId` to `null` (closing the modal), then a `useEffect` with a 100ms timeout tries to reopen the next node. This causes a visible flash back to the graph with the Resume button.

### Root Cause
The timeout-based approach is unreliable — `availableNodes` may not have recomputed yet since the DB query invalidation is async (for authenticated users).

### Fix

**In `handleResponse`**: Instead of clearing `overlayNodeId` to `null`, compute the next available nodes inline by filtering `availableNodes` to exclude the node just responded to. Then:
- If 1 next node: set `overlayNodeId` directly to it (no flash)
- If >1 next nodes: clear overlay, show route choice dialog
- If 0 next nodes: clear overlay (journey complete)

**Remove the `justResponded` state and its `useEffect`** — no longer needed since we handle advancement synchronously.

### Changes — `src/pages/Diagnostic.tsx`

| What | Detail |
|------|--------|
| `handleResponse` | Compute `nextAvailable = availableNodes.filter(n => n.id !== overlayNodeId)`. Branch on length: set next overlay directly, show route choice, or close. |
| Remove `justResponded` state | No longer needed |
| Remove auto-advance `useEffect` | Lines 136-150 deleted |

