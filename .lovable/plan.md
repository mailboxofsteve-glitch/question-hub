

## Fix: Preserve Zoom Position on Node Click

### Root Cause
The D3 rendering `useEffect` (line 645) includes `selectedNodeId` and `ancestorPathIds` in its dependency array. When a user clicks a node, `setSelectedNodeId` fires, the entire SVG is torn down and rebuilt, and the zoom resets to the identity transform — snapping back to the default view.

The `zoomTransformRef` already saves the current transform on every zoom event (line 450), but after the graph rebuilds, this saved transform is never applied.

### Fix (single file: `src/pages/SpineMap.tsx`)

After `svg.call(zoom)` (line 452), add one line to restore the saved zoom transform:

```ts
svg.call(zoom.transform, zoomTransformRef.current);
```

This tells D3 to apply the previously saved transform to the new SVG/group, so the graph stays at the user's current pan and zoom position after a click-triggered re-render.

Additionally, skip the initial fade-in transitions when restoring a zoom (i.e., when the transform is not the identity). This prevents the jarring effect of elements fading in while the user is zoomed into a specific area. This can be done by checking `!zoomTransformRef.current.k || zoomTransformRef.current.k === 1` to decide whether to apply `.transition().duration(400)` or set elements to full opacity immediately.

### Summary
- One line added after `svg.call(zoom)` to restore the saved transform
- Conditional skip of fade-in animations on re-renders (not initial load)
- No structural changes to the rendering logic

