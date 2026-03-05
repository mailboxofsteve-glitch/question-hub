

## Fix: Move Response Buttons Below Modal on Mobile

The three response buttons (Agree, Disagree, Don't Know) are currently absolutely positioned outside the modal borders (left, right, bottom). On mobile, the side buttons get clipped off-screen since there's no room.

### Solution
Replace the absolute-positioned layout with a **row of buttons below the modal card**, inside the same relative container. This works on all screen sizes and is simpler.

### Changes — `src/pages/Diagnostic.tsx` (lines 499-539)

Replace the three absolutely-positioned buttons with a horizontal flex row placed after the modal card (inside the relative wrapper, but after the card div closes):

```text
┌─────────────────────┐
│   Node Detail Modal  │
│                      │
└─────────────────────┘
 [Disagree] [Don't Know] [Agree]
```

- Use `flex justify-center gap-4 mt-4 pb-4` for the button row
- Keep the same circular button styling and colors
- Keep the disabled logic (`!diagnosticReady` for Disagree/Don't Know)
- Remove all absolute positioning, negative offsets, and `overflow-visible` hacks
- Adjust `DialogContent` — remove `my-24` (no longer needed for side buttons), use standard padding

This single layout works on both mobile and desktop without breakpoint-specific positioning.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/Diagnostic.tsx` | Replace absolute-positioned buttons with a flex row below the modal card |

