

## Spine Map: Tooltip Fix + Printable Version

### Issue 1: Tooltips not showing correctly

The tooltip uses raw SVG coordinates (`d.x`, `d.y`) for positioning, but these don't account for the D3 zoom/pan transform applied to the `<g>` group. When the user zooms or pans, tooltips appear at incorrect positions (or off-screen), making them seem like they don't work for many nodes.

**Fix**: Capture the current zoom transform and apply it to the tooltip coordinates. Use `d3.zoomTransform(svgRef.current)` to convert SVG-space coordinates to screen-space coordinates before positioning the tooltip div.

### Issue 2: Printable Version

Add a "Print View" button that toggles between the interactive SVG map and a clean, printer-friendly HTML listing of all nodes organized by tier.

**Print view layout**:
- Grouped by tier (T0–T6), each with its label and color accent
- Under each tier, spine gates listed as subheadings
- Branch nodes listed under their parent gate with titles
- Uses `@media print` CSS to hide the interactive map, navigation, and legend
- A "Print" button triggers `window.print()`

### Changes (single file: `src/pages/SpineMap.tsx`)

1. Store the current D3 zoom transform in a ref; update it in the zoom handler
2. In `mouseover`, apply the transform to `d.x`/`d.y` before setting tooltip state
3. Add a `showPrintView` state toggle
4. When active, render an HTML list (tier → gates → branches) instead of the SVG, with a print button
5. Add `print:` Tailwind variants to hide nav/legend in print mode

