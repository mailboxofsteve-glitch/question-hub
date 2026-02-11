

# Collapsible Layer 2 "Reasoning" Section

## Overview
Wrap the entire Layer 2 section in a Radix Collapsible so users see only a "Reasoning" button by default. Clicking it reveals the existing accordion bullets (title, summary, expandable detail) unchanged. No database or data structure changes required.

## Changes

### `src/pages/NodeDetail.tsx`
- Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible`
- Wrap the Layer 2 `<section>` contents in a `<Collapsible>` root
- Replace the current static heading row with a `<CollapsibleTrigger>` styled as a clickable button showing the BookOpen icon, "Reasoning" label, and a chevron that rotates on open
- Move the `<Accordion>` block inside `<CollapsibleContent>` so it only renders when expanded
- Add a subtle open/close animation via Tailwind classes

### Visual Behavior
```text
COLLAPSED (default):
+--------------------------------------+
|  [icon] Reasoning            [chevron]|
+--------------------------------------+

EXPANDED (after click):
+--------------------------------------+
|  [icon] Reasoning            [chevron]|
|                                      |
|  > Bullet 1 title + summary         |
|  > Bullet 2 title + summary         |
|  > Bullet 3 title + summary         |
+--------------------------------------+
```

Each bullet inside still expands individually via the existing accordion to show its detail text. The two levels nest naturally: Collapsible controls visibility of the whole section, Accordion controls individual bullets.

## What Does NOT Change
- Database schema / `nodes` table
- `layer2_json` structure
- Layer 1 (always visible)
- Layer 3 ("Next Steps")
- Individual accordion bullet behavior
