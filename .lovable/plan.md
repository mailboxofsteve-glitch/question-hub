

## Implement All UI/UX Improvements

This is a substantial set of changes across 6 areas. Here is the implementation plan broken into discrete tasks.

---

### 1. Dark Mode Toggle

**Files**: `src/App.tsx`, `src/main.tsx`, `src/components/layout/AppLayout.tsx`

- Wrap the app with `ThemeProvider` from `next-themes` (already installed) in `App.tsx`
- Add a sun/moon toggle button to the header in `AppLayout.tsx` next to the sign-in/user section
- Uses the existing `.dark` CSS variables already defined in `index.css`

---

### 2. Mobile-Responsive Navigation

**Files**: `src/components/layout/AppLayout.tsx`

- Hide desktop nav links on small screens (`hidden md:flex`)
- Add a hamburger `Menu` icon button visible only on mobile (`md:hidden`)
- On click, open a `Sheet` (side drawer) containing all nav links vertically stacked
- Include the dark mode toggle and sign-in/sign-out in the mobile drawer as well

---

### 3. Search UX Improvements

**Files**: `src/hooks/use-node-search.ts`, `src/pages/Index.tsx`

- **Debounce**: Add a 300ms debounce to the search query before triggering the API call (debounce the queryKey value, not the input)
- **Keyboard shortcuts**: Add `useEffect` in `Index.tsx` to listen for `/` (focus search) and `Escape` (clear search)
- **Skeleton loading**: Show 3 skeleton result cards while `isSearching` is true instead of just "Searching..." text

---

### 4. NodeDetail Enhancements

**Files**: `src/pages/NodeDetail.tsx`

- **Breadcrumb**: Replace the "Back" link with a breadcrumb: Home > Category > Title
- **Copy link button**: Add a "Share" icon button next to the title that copies `window.location.href` to clipboard with a toast confirmation
- **Reading progress**: Add a thin fixed progress bar at the top of the page that fills based on scroll position within the article

---

### 5. Recently Viewed (localStorage)

**Files**: `src/hooks/use-recently-viewed.ts` (new), `src/pages/Index.tsx`, `src/pages/NodeDetail.tsx`

- Create a hook `useRecentlyViewed()` that reads/writes an array of `{ id, title, category }` to `localStorage` (max 10 items)
- In `NodeDetail.tsx`, call `addRecentlyViewed(node)` when node loads
- In `Index.tsx`, show a "Recently Viewed" section below the hero when not searching and when there are recent items

---

### 6. Accessibility Improvements

**Files**: `src/components/layout/AppLayout.tsx`, `src/pages/Index.tsx`, `src/pages/NodeDetail.tsx`

- Add `aria-label` to the search input, nav links, and icon buttons
- Add `role="search"` to the search form wrapper
- Ensure the dark mode toggle and hamburger menu have proper `aria-label` attributes
- Add `sr-only` labels to icon-only buttons (sign out, theme toggle)

---

### Summary of Files

| File | Changes |
|---|---|
| `src/main.tsx` | No change needed (ThemeProvider goes in App) |
| `src/App.tsx` | Wrap with `ThemeProvider` from next-themes |
| `src/components/layout/AppLayout.tsx` | Mobile hamburger + sheet drawer, dark mode toggle, aria labels |
| `src/hooks/use-node-search.ts` | Debounced search query state |
| `src/pages/Index.tsx` | Keyboard shortcuts, skeleton loading, recently viewed section, aria |
| `src/pages/NodeDetail.tsx` | Breadcrumb, copy link, reading progress bar, save to recently viewed |
| `src/hooks/use-recently-viewed.ts` | New hook for localStorage recently viewed |

