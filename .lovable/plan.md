

## Diagnostic Journey — Plan

This is a substantial feature spanning database, backend, and frontend. Here is a phased plan focused on the MVP.

### Core Concept

A guided, sequential walkthrough of the Spine Map graph where users progress node-by-node starting from S-01. Each node opens in a modal overlay with three response buttons (Agree / Disagree / I Don't Know). Authenticated users get their progress saved; anonymous users can still participate but lose progress on page close.

### Database Changes

**New table: `diagnostic_progress`**
```sql
CREATE TABLE public.diagnostic_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  node_id text NOT NULL,
  response text NOT NULL CHECK (response IN ('agree', 'disagree', 'dont_know')),
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, node_id)
);
ALTER TABLE public.diagnostic_progress ENABLE ROW LEVEL SECURITY;
```

RLS: Users can SELECT/INSERT/UPDATE their own rows only.

### New Page: `src/pages/Diagnostic.tsx`

- Route: `/diagnostic`
- Reuses the same D3 graph rendering logic from `SpineMap.tsx` (extracted into a shared hook or duplicated with modifications).
- Key differences from the free-explore graph:
  - **Locked progression**: Only S-01 is initially "unlocked." Once a user responds to a node, its children (connected nodes) become unlocked. Locked nodes are visually dimmed and non-clickable.
  - **No free navigation**: The two-click pattern still applies (highlight path → open modal), but only on unlocked nodes.
  - **Progress indicators**: Responded nodes show a colored ring (green for agree, red for disagree, yellow for don't know).

### Modified Component: `NodeDetailContent.tsx`

Add an optional `diagnosticMode` prop that, when true, renders the three response buttons outside the modal borders:
- **Agree** (green) — positioned outside the right edge of the dialog
- **Disagree** (red) — positioned outside the left edge
- **I Don't Know** (yellow) — positioned below the dialog

Disagree and I Don't Know are disabled until the user has expanded and scrolled through all Layer 1 and Layer 2 content. This requires:
- Tracking which accordion items have been opened (Layer 2 reasoning bullets)
- Tracking scroll position within the modal to confirm the user has reached the bottom of Layer 1 content
- A callback prop like `onResponse: (response: 'agree' | 'disagree' | 'dont_know') => void`

### Progression Logic

The "unlock" algorithm determines which nodes are available next:
1. Start: S-01 is always unlocked.
2. When a user responds to a spine node (e.g., S-01), unlock its direct branch children AND the next sequential spine node (S-02).
3. When a user responds to a branch node, unlock any nodes that list it as a `spine_gates` parent (if such nodes exist).
4. This naturally handles the expanding graph — new nodes added later will become reachable once their parent gate is responded to.

For anonymous users, this state lives in React state (or localStorage). For authenticated users, it is persisted in `diagnostic_progress`.

### Future-Proofing

- The `note` column on `diagnostic_progress` will store the user's typed response for the future AI chatbot integration.
- The response buttons are designed to be extensible — the text field below "I Don't Know" can be added later without restructuring.
- Unwritten spine nodes simply won't appear as unlockable targets until they are published, so partial content is handled gracefully.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Diagnostic.tsx` | **Create** — diagnostic journey page with locked-progression graph |
| `src/components/NodeDetailContent.tsx` | **Modify** — add `diagnosticMode` prop + response buttons + scroll/expand tracking |
| `src/App.tsx` | **Modify** — add `/diagnostic` route |
| `src/pages/Index.tsx` | **Modify** — update "Start Diagnostic" link to point to `/diagnostic` |
| Database migration | **Create** — `diagnostic_progress` table + RLS policies |

### Dialog Button Positioning

The three buttons sit outside the dialog using absolute positioning relative to a wrapper div:
```text
                    ┌─────────────────────┐
   [Disagree]  ◄──  │                     │  ──►  [Agree]
                    │   Node Detail Modal  │
                    │                      │
                    └─────────────────────┘
                           [I Don't Know]
```

This is achieved by wrapping `DialogContent` in a relative container and placing the buttons with `absolute` + negative offsets.

