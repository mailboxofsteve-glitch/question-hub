

## Show Submitter Email on Node Admin Page

### Overview
Add a new column to the Node Admin table showing the email of the user who created each node. This requires a database schema change (new `created_by` column on the `nodes` table), updates to the edge function to record the creator, and a UI update to display the email.

### Changes

**1. Database migration**
- Add a `created_by` UUID column to the `nodes` table (nullable, so existing nodes are unaffected)

```sql
ALTER TABLE public.nodes ADD COLUMN created_by uuid REFERENCES auth.users(id);
```

**2. Edge function -- `supabase/functions/admin-nodes/index.ts`**
- On POST (create node): set `created_by` to the authenticated user's ID (`userId`)
- On GET (list nodes): join with the `profiles` table to include the creator's email in the response. Use a select like `*, profiles!created_by(email)` or do a manual lookup after fetching nodes

**3. Admin Dashboard UI -- `src/components/admin/AdminDashboard.tsx`**
- Add a "Submitted By" column to the table header
- Display the email from the joined profile data in each row (or show a dash for older nodes without a `created_by` value)

### Files Changed

| File | Change |
|---|---|
| New migration SQL | Add `created_by` UUID column to `nodes` table |
| `supabase/functions/admin-nodes/index.ts` | Set `created_by` on POST; join profiles on GET to include email |
| `src/components/admin/AdminDashboard.tsx` | Add "Submitted By" column displaying creator email |

### Notes
- Existing nodes will have `created_by` as null and will show a dash in the column
- The `created_by` column references `auth.users(id)` for referential integrity, but we read the email from the `profiles` table (which mirrors auth data)

