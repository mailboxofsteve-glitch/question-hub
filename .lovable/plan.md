
## Fix: Mobile UX Issues (Summary Truncation + Keyboard Overlap)

Two targeted fixes for iPhone usability.

---

### 1. Summary text getting cut off

The reasoning bullet summary has `line-clamp-2` applied, which hard-caps the visible text to two lines. On narrow mobile screens this cuts off even short summaries.

**Fix:** Remove `line-clamp-2` from the summary `<p>` tag in the AccordionTrigger section of `NodeDetail.tsx` (line 199). The summary should display in full since users need to read it before deciding to expand the detail.

**File:** `src/pages/NodeDetail.tsx` (line 199)
- Remove the `line-clamp-2` class from the summary paragraph

---

### 2. iPhone keyboard obscuring search results

When the iOS keyboard appears it covers roughly half the viewport, and the search results sit below it with no way to see them without manually scrolling.

**Fix:** When the search input receives focus on mobile, automatically scroll the input to the top of the visible area so results appear between the input and the keyboard. This uses a small `onFocus` handler that calls `scrollIntoView` with a slight delay (to let the keyboard finish animating).

**File:** `src/pages/Index.tsx`
- Add a ref to the search input
- Add an `onFocus` handler that, after a ~300ms delay, scrolls the search container to the top of the viewport using `scrollIntoView({ behavior: 'smooth', block: 'start' })`
- Optionally reduce top padding on the hero section when actively searching (the hero text and subtitle take up significant space above the search bar on mobile)

---

### Files to modify

| File | Change |
|------|--------|
| `src/pages/NodeDetail.tsx` | Remove `line-clamp-2` from reasoning summary text |
| `src/pages/Index.tsx` | Add `scrollIntoView` on search input focus; optionally collapse hero padding during active search |

No backend or database changes needed.
