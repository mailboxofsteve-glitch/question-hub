

## Add Sort & Filter to Admin Table

### Approach
Add client-side sorting and filtering to the existing table columns using local state — no backend changes needed.

### Changes (single file: `src/components/admin/AdminDashboard.tsx`)

**1. Add sort state**
- New state: `sortColumn` (one of `'id' | 'title' | 'tier' | 'category' | 'created_by_email' | 'published' | 'updated_at'`) and `sortDirection` (`'asc' | 'desc'`).
- Clicking a column header sets it as the sort column; clicking again toggles direction.
- Each sortable `TableHead` becomes a clickable button with an `ArrowUpDown` / `ArrowUp` / `ArrowDown` icon from lucide-react indicating current sort state.

**2. Add filter inputs**
- Add a row of filter inputs below the header row (or inline popovers per column — inline text inputs are simpler).
- New state: `filters` object with optional string values for `id`, `title`, `tier`, `category`, `created_by_email`.
- Each filter does a case-insensitive substring match on the corresponding field.
- A small `Input` rendered inside each `TableHead` cell (below the label) for the filterable columns.

**3. Apply sort + filter to `filteredNodes`**
- Chain: tab filter → column filters → sort → render.
- Sort comparator handles strings, numbers (tier), booleans (published), and dates (updated_at) appropriately.

**4. Imports**
- Add `ArrowUp`, `ArrowDown`, `ArrowUpDown` from lucide-react.
- Add `Input` from `@/components/ui/input`.

