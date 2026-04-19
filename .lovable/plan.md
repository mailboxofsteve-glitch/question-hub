
The user wants two new form fields wired to the `trigger_word` and `layer1_bold` columns already added to `nodes`. Straightforward NodeForm-only edit.

## Plan

### 1. Update `src/components/admin/NodeForm.tsx`

**State** — add two `useState` hooks near the existing ones:
- `triggerWord` initialized from `node?.trigger_word ?? ""`
- `layer1Bold` initialized from `node?.layer1_bold ?? ""`

**UI — Trigger Word**
Convert the existing 2-column grid (Category, Keywords) into a 3-column grid on `md+` so Trigger Word sits cleanly alongside them:
- `grid-cols-1 md:grid-cols-3`
- New `Input` with label "Trigger Word", placeholder `"e.g. truth"`
- Helper text: "One word. Displays bold and highlighted wherever it appears across all three layers."

**UI — Bold Statement**
Insert a new `Textarea` block directly above the existing "Layer 1 — Summary" block:
- Label: "Layer 1 — Bold Statement"
- Placeholder: "One punchy sentence that answers the question directly."
- `rows={2}`
- Helper text: "Displays in bold before the summary. Aim for something that provokes curiosity or a reaction."

**Submit payload** — extend the object passed to `onSubmit` with:
```ts
trigger_word: triggerWord.trim() || null,
layer1_bold: layer1Bold.trim() || null,
```
(cast through the existing `as any` already used for `tier`/`spine_gates`.)

### 2. Out of scope
- No changes to `Layer2Field`, `Layer3Field`, validation, Published toggle, download serializer, or any other component.
- No DB or types changes (columns already exist; types regenerated).

### Files changed
| File | Change |
|------|--------|
| `src/components/admin/NodeForm.tsx` | Add `triggerWord` + `layer1Bold` state, two new fields in UI, include both in submit payload |
