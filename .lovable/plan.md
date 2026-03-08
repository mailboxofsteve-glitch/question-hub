

## Diagnostic Feedback Review Page

A new `/feedback` page accessible only to admin and editor roles, displaying all diagnostic journey comments (disagree/don't-know responses with notes) for review and resolution tracking.

### Database Changes

**New table: `feedback_reviews`** — tracks review/resolution status per diagnostic comment:

```sql
CREATE TABLE public.feedback_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_progress_id uuid NOT NULL REFERENCES public.diagnostic_progress(id) ON DELETE CASCADE,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  addressed boolean NOT NULL DEFAULT false,
  addressed_by uuid REFERENCES auth.users(id),
  addressed_at timestamptz,
  resolution_note text,
  UNIQUE (diagnostic_progress_id)
);

ALTER TABLE public.feedback_reviews ENABLE ROW LEVEL SECURITY;

-- Admin and editor can read
CREATE POLICY "Admins and editors can read feedback reviews"
  ON public.feedback_reviews FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Admin and editor can insert
CREATE POLICY "Admins and editors can insert feedback reviews"
  ON public.feedback_reviews FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

-- Admin and editor can update (addressed checkbox restricted in code)
CREATE POLICY "Admins and editors can update feedback reviews"
  ON public.feedback_reviews FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
```

**RLS update on `diagnostic_progress`** — admin/editor need to read all users' progress:

```sql
CREATE POLICY "Admins and editors can read all progress"
  ON public.diagnostic_progress FOR SELECT
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
```

### New Page: `src/pages/Feedback.tsx`

Role-gated page (same pattern as Admin.tsx) with a table showing:

| Column | Source |
|--------|--------|
| Date | `diagnostic_progress.created_at` |
| Session | `diagnostic_progress` → join with `events` by user_id for session info |
| User | `profiles.email` via `diagnostic_progress.user_id` |
| Node ID | `diagnostic_progress.node_id` |
| Response | `diagnostic_progress.response` (disagree / dont_know only) |
| Comment | `diagnostic_progress.note` |
| Reviewed ✓ | `feedback_reviews.reviewed` — checkbox, admin or editor can toggle |
| Addressed ✓ | `feedback_reviews.addressed` — checkbox, **editor only** |
| Resolution Note | `feedback_reviews.resolution_note` — text field, editor only |

**Query**: Fetch `diagnostic_progress` rows where `response IN ('disagree', 'dont_know') AND note IS NOT NULL`, joined with `profiles` for email and `feedback_reviews` for status. Lazy-create `feedback_reviews` rows on first interaction.

**Behavior**:
- "Reviewed" checkbox: clickable by admin or editor, upserts `feedback_reviews` with `reviewed = true`, `reviewed_by`, `reviewed_at`
- "Addressed" checkbox: clickable by editor only (disabled for admin), upserts with `addressed = true`, `addressed_by`, `addressed_at`
- Resolution note: editable text field for editor only, saved on blur/enter

### Routing & Nav

- Add `/feedback` route in `App.tsx`
- Add "Feedback" nav link in `AppLayout.tsx` for admin/editor roles

### Files Changed

| File | Change |
|------|--------|
| Migration SQL | New `feedback_reviews` table + RLS, new SELECT policy on `diagnostic_progress` |
| `src/pages/Feedback.tsx` | New page |
| `src/App.tsx` | Add route |
| `src/components/layout/AppLayout.tsx` | Add nav link |

