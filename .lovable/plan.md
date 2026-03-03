

## Fix Spine Node Sizing & Tooltip Titles

### Problem
1. **S-02 appears as a small branch node** — it's in S-01's `spine_gates`, so the code treats it as a branch of S-01. But S-02 is itself a spine node (ID pattern `s-XX`) and should render at the same large size as S-01.
2. **Gate tooltip shows ID + tier label, not the node's actual title** — e.g., hovering S-01 shows "S-01 — Epistemological Bedrock" instead of "Does truth exist, or is everything just perspective?"

### Root Cause
- Gates are synthetic hubs created from `spine_gates` string values. They have no link back to the actual node record, so there's no title to display.
- Branch nodes that happen to be spine nodes (like S-02) get the small branch radius because the code doesn't distinguish them.

### Changes (`src/pages/SpineMap.tsx`)

**1. Build a gate-to-title lookup** (in the `useMemo` or early in the `useEffect`):
- Create a map from gate name (e.g., `"S-01"`) to the matching node's title by checking if any node's `id` matches (case-insensitive, e.g., `s-01` → `S-01`)
- This lets the tooltip display the real title

**2. Fix tooltip text for gates** (~line 300):
- Change `d.isGate ? \`${d.label} — ${TIER_LABELS[d.tier]}\`` to use the looked-up title when available, falling back to the current format

**3. Render spine-patterned branch nodes at gate size** (~line 220):
- When creating branch `PosNode`, check if `branch.id` matches `/^s-\d+$/i`
- If yes, set `radius: 24` (same as gates) instead of `8`
- Also add the gate stroke styling for these nodes (handled in the rendering attributes by checking a new `isSpine` flag on PosNode, or simply checking the ID pattern)

**4. Add gate label text for spine-patterned branches** (~line 315):
- Currently only `isGate` nodes get a text label above them; spine-patterned branches should also get their ID label (e.g., "S-02") rendered above

