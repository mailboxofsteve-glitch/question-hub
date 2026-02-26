

## Accessibility Improvements for Blind Users

All of these are free — they use built-in HTML semantics and ARIA attributes with zero dependencies.

---

### 1. Skip Navigation Link
**File**: `src/components/layout/AppLayout.tsx`

Add a visually hidden "Skip to main content" link as the first child of the layout. On focus (Tab), it becomes visible and jumps past the header to `<main id="main-content">`.

### 2. Landmark Roles & Live Regions
**Files**: `src/pages/Index.tsx`, `src/pages/NodeDetail.tsx`, `src/components/layout/AppLayout.tsx`

- Add `id="main-content"` to `<main>` for skip-nav target
- Add `role="contentinfo"` to the footer in `Index.tsx`
- Add `aria-live="polite"` to search results count so screen readers announce result changes
- Add `aria-busy` to the search results container while loading

### 3. Heading Hierarchy Audit
**Files**: `src/pages/Index.tsx`, `src/pages/NodeDetail.tsx`

- Ensure headings follow a strict `h1 > h2 > h3` hierarchy (no skipped levels)
- Add visually hidden headings where sections lack them (e.g., "Search Results", "Features")

### 4. Focus Management
**Files**: `src/pages/NodeDetail.tsx`, `src/pages/Index.tsx`

- Add `tabIndex={-1}` and auto-focus to the `<h1>` on NodeDetail page load so screen readers announce the new page
- Add visible focus outlines via a global CSS rule (`focus-visible`) for all interactive elements

### 5. Improved Image & Icon Alt Text
**Files**: `src/pages/NodeDetail.tsx`, `src/components/layout/AppLayout.tsx`

- Add `aria-hidden="true"` to all decorative icons (ChevronRight, decorative dots, etc.)
- Ensure reasoning bullet images have descriptive `alt` text (already uses `bullet.title`)
- Add `alt=""` to purely decorative images
- Add `title` attribute to iframes for embedded videos

### 6. Announce Route Changes
**File**: `src/App.tsx` or new `src/components/RouteAnnouncer.tsx`

Create a visually hidden live region that announces page title changes on route navigation, so screen readers inform users they've moved to a new page.

### 7. Form & Interactive Element Labels
**Files**: `src/pages/Index.tsx`, `src/components/layout/AppLayout.tsx`

- Wrap category buttons with descriptive `aria-label` (e.g., `aria-label="Browse category: Theology"`)
- Add `aria-expanded` to the Reasoning collapsible trigger
- Add `aria-label` to the "Clear" search results button

---

### Summary of Files

| File | Changes |
|---|---|
| `src/components/layout/AppLayout.tsx` | Skip-nav link, `id="main-content"` on `<main>`, decorative icon `aria-hidden` |
| `src/pages/Index.tsx` | `aria-live` on results, `aria-busy`, hidden section headings, category button labels, footer role |
| `src/pages/NodeDetail.tsx` | Focus `h1` on load, iframe `title`, `aria-hidden` on decorative icons |
| `src/components/RouteAnnouncer.tsx` | New component — visually hidden live region announcing page changes |
| `src/App.tsx` | Include `RouteAnnouncer` |
| `src/index.css` | Global `focus-visible` outline style |

