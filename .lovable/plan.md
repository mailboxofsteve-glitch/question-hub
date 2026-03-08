

## Diagnostic Journey: 7 UX Improvements

### 1. Progress Indicator
Add a progress bar and counter ("3 of 14 answered") to the header area, visible at all times. Uses `respondedIds.size` / total published node count. Renders a `Progress` component + text below the page title.

**File**: `src/pages/Diagnostic.tsx` — add progress bar between the subtitle text and legend section.

### 2. Smooth Node Transitions
When auto-advancing between nodes, apply a CSS fade transition instead of an instant swap. Track a `transitioning` state: when switching nodes, briefly set it to trigger a fade-out, update `overlayNodeId`, then fade-in.

**File**: `src/pages/Diagnostic.tsx` — add `transitioning` state, wrap the modal content div with a CSS class that toggles `opacity-0`/`opacity-100` with `transition-opacity duration-300`. Show a "Next: [title]" label briefly during transition.

### 3. Mobile Card List View
On mobile (`useIsMobile()`), replace the D3 SVG graph with a vertical scrollable list of nodes grouped by tier. Each card shows: node title, ID, lock/response status icon, and is tappable. The Start/Resume button remains at the top.

**File**: `src/pages/Diagnostic.tsx` — import `useIsMobile`, conditionally render either the SVG graph or a new `MobileNodeList` section. Each tier is a collapsible group with node cards inside.

### 4. Accessibility Enhancements
- Wrap SVG container with `role="img"` and `aria-label="Diagnostic journey graph"`
- Add `aria-live="polite"` region that announces the current node title when overlay opens
- Focus management: auto-focus the close button when modal opens; return focus to the Start/Resume button on close
- Response buttons get explicit `role="button"` and `aria-describedby` linking to helper text

**File**: `src/pages/Diagnostic.tsx` — add ARIA attributes, ref for start button, manage focus in overlay open/close handlers.

### 5. Feedback & Guidance
- Below disabled Disagree/Don't Know buttons, show helper text: "Scroll through all content & expand reasoning to unlock" (only when `!diagnosticReady`)
- After a response is saved, show a brief toast: "Response saved — advancing..."
- The helper text fades away once `diagnosticReady` becomes true

**File**: `src/pages/Diagnostic.tsx` — add conditional helper text below the response button row, add toast call in `handleResponse`.

### 6. Response Editing
Currently, the condition `responseMap.get(overlayNodeId.toLowerCase()) !== 'agree'` hides response buttons for agreed nodes. Change this to:
- Always show the previous response when reopening a responded node (e.g., "You responded: Agree ✓")
- Add a "Change Response" button that reveals the response buttons again
- Track `editingResponse` state to toggle between "view previous" and "edit" mode

**File**: `src/pages/Diagnostic.tsx` — add `editingResponse` state, render previous-response banner with change button, conditionally show response buttons.

### 7. Contextual "Next Up" Banner
During auto-advance, show a brief banner at the top of the modal content: "Next: [node title]" with the tier color accent. This orients the user that the content has changed. The banner auto-dismisses after 2 seconds.

**File**: `src/pages/Diagnostic.tsx` — add `nextUpTitle` state set during advance, render a dismissible banner inside the modal card, clear via setTimeout.

---

### Summary of State Additions
| State | Purpose |
|-------|---------|
| `transitioning: boolean` | Controls fade animation between nodes |
| `editingResponse: boolean` | Toggles response-editing mode for responded nodes |
| `nextUpTitle: string \| null` | Shows "Next: ..." banner during auto-advance |

### Files Modified
| File | Changes |
|------|---------|
| `src/pages/Diagnostic.tsx` | All 7 features: progress bar, transitions, mobile view, a11y, guidance, editing, next-up banner |

