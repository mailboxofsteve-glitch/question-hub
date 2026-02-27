

## Plan: Create 193 Spine Map Placeholder Nodes

### Overview
Add two new metadata columns to the `nodes` table, then bulk-insert all 25 spine gates and 168 branch nodes as unpublished draft placeholders visible in the admin dashboard.

---

### Step 1 — Database Migration: Add `tier` and `spine_gates` columns

Add to the `nodes` table:
- `tier` (integer, nullable) — 0 through 6
- `spine_gates` (jsonb, default `'[]'`) — array of gate IDs like `["S-01","S-04"]`

This lets each node carry its spine architecture metadata without overloading `category` or `keywords`.

---

### Step 2 — Bulk-Insert All 193 Placeholder Nodes

Use direct SQL inserts to create all nodes as unpublished drafts:

**25 Spine Gate nodes** (e.g.):
- `id`: `s-01` through `s-25`
- `title`: The gate question (e.g. "Does truth exist, or is everything just perspective?")
- `category`: Tier label (e.g. "Tier 0 — Epistemological Bedrock")
- `tier`: 0–6
- `spine_gates`: `[]` (gates are roots, not branches)
- `published`: false

**168 Branch nodes** (e.g.):
- `id`: slug derived from question (e.g. `q42-moral-intuitions-brain-chemistry`)
- `title`: The full question text
- `category`: Tier label
- `tier`: corresponding tier number
- `spine_gates`: array of parent gates (e.g. `["S-04","S-16"]`)
- `keywords`: spine gate references as text for search
- `published`: false

All layer1, layer2_json, layer3_json fields left empty — these are placeholders for future content writing.

---

### Step 3 — Update Admin Dashboard & Edge Function

- Update the `admin-nodes` edge function to handle the new `tier` and `spine_gates` fields on create/update
- Update the `NodeForm` component to display tier and spine gates fields (read-only or editable)
- Update the admin table to show a "Tier" column and optionally a "Gate" column
- Update the Supabase types (automatic after migration)

---

### Step 4 — Update NodeDetail & Search

- Include `tier` and `spine_gates` in the node detail breadcrumb (show tier name)
- Include `spine_gates` in the `search_blob` builder so gates are searchable

---

### Files Changed

| File | Change |
|---|---|
| Database migration | Add `tier` int + `spine_gates` jsonb columns |
| Database insert | 193 INSERT statements for all placeholder nodes |
| `supabase/functions/admin-nodes/index.ts` | Handle `tier` and `spine_gates` in POST/PUT |
| `src/components/admin/NodeForm.tsx` | Add tier + spine_gates display/edit fields |
| `src/components/admin/AdminDashboard.tsx` | Add Tier column to table |

