

## Fix Diagnostic Journey — 5 Issues

### Issues and Solutions

**1. Disagree/I Don't Know not gated by engagement**
The buttons have `disabled={false}` hardcoded (lines 518, 532 in Diagnostic.tsx). Need to implement actual engagement tracking in `NodeDetailContent.tsx`:
- Track whether the Reasoning collapsible has been opened
- Track which accordion items have been expanded (all must be opened)
- Track scroll position to confirm user scrolled to bottom of Layer 1
- Report readiness via `onDiagnosticReady` callback
- Store `diagnosticReady` state in Diagnostic.tsx and pass it as `disabled` to the Disagree/IDK buttons

**2. Modal content not scrollable**
The `ScrollArea` wrapping the content (line 473) needs a fixed height constraint. Currently `max-h-[85vh]` is on the outer `DialogContent` but the `ScrollArea` itself has no explicit height. Fix: give ScrollArea an explicit `max-h-[70vh]` (leaving room for the external buttons).

**3. Page bottom cut off — IDK button not visible**
The Dialog with `overflow-visible` and buttons positioned outside via negative offsets get clipped. Fix: add padding/margin to the dialog wrapper to ensure space for the external buttons, and ensure the page itself can scroll if needed. Also reduce the dialog max-height slightly to leave room for the bottom button.

**4. Only "Agree" unlocks progression**
Currently `computeUnlocked` in `use-diagnostic-progress.ts` uses `respondedIds` (any response unlocks). Change to only consider entries where `response === 'agree'` — create an `agreedIds` set and use that for unlock computation instead.

**5. Allow re-entering a node to change response to Agree**
Currently the response buttons are hidden when `respondedIds.has(overlayNodeId)` (line 501). Change this to: show buttons if the node hasn't been agreed to yet (i.e., `responseMap.get(id) !== 'agree'`). This lets users who previously disagreed or said IDK go back and agree.

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/use-diagnostic-progress.ts` | Change `computeUnlocked` to only use agreed IDs |
| `src/components/NodeDetailContent.tsx` | Add engagement tracking (scroll + accordion state), call `onDiagnosticReady` |
| `src/pages/Diagnostic.tsx` | Wire up `diagnosticReady` state to disable buttons; fix scroll/layout; show buttons unless agreed |

