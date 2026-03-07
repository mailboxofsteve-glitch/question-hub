

## Analytics Dashboard

A new `/analytics` page accessible only to users with the `admin` or `editor` role, showing real-time application usage data from the `events` table.

### Database Changes

1. **Add SELECT policy on `events` table** for admin/editor roles so the dashboard can query event data directly:
```sql
CREATE POLICY "Admins and editors can read events"
  ON public.events FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'editor')
  );
```

No new tables needed — all data comes from the existing `events` table.

### New Page: `src/pages/Analytics.tsx`

Role-gated page (same pattern as `Admin.tsx`) with the following dashboard sections:

**Header Stats (cards across the top):**
- Total sessions (distinct `session_id` count)
- Total page views
- Unique nodes viewed
- Diagnostic completions

**Charts (using recharts, already installed):**
1. **Traffic Over Time** — line chart of events per day (last 30 days)
2. **Event Type Breakdown** — bar chart showing count per `event_type`
3. **Top Viewed Nodes** — horizontal bar chart of most-viewed nodes by `view_node` count
4. **Device Breakdown** — pie chart from `session_start` metadata (`is_mobile` true/false)
5. **Diagnostic Funnel** — bar chart showing `diagnostic_start` → `diagnostic_respond` → `diagnostic_complete` drop-off

**Live Events Feed:**
- A scrollable table of the most recent 50 events with timestamp, type, node_id, and session_id
- Uses Supabase realtime subscription on the `events` table for live updates

### Code Changes

| File | Change |
|------|--------|
| `src/pages/Analytics.tsx` | New page with role gate, stats cards, charts, live feed |
| `src/App.tsx` | Add route `/analytics` |
| `src/components/layout/AppLayout.tsx` | Add "Analytics" nav link for admin/editor users |
| Migration SQL | Add SELECT policy on `events` for admin/editor |

### Technical Notes
- Data fetching via `supabase.from('events').select(...)` with date filters
- Aggregation done client-side (events table should be manageable size)
- Realtime via `supabase.channel('events').on('postgres_changes', ...)` for the live feed
- Realtime requires: `ALTER PUBLICATION supabase_realtime ADD TABLE public.events;`

