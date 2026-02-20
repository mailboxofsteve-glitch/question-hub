

## Add Markdown Rendering to Node Content

### What Changes

Install `react-markdown` and wrap 5 text output locations so that writers can use `*italic*` and `**bold**` in admin textareas and have it render properly for readers.

### Locations Updated

| File | Field | Current | After |
|---|---|---|---|
| `src/pages/NodeDetail.tsx` | `node.layer1` (line 166) | Plain `<p>` | `<ReactMarkdown>` |
| `src/pages/NodeDetail.tsx` | `bullet.summary` (line 202) | Plain `<p>` | `<ReactMarkdown>` |
| `src/pages/NodeDetail.tsx` | `bullet.detail` (line 209) | Plain `<p>` | `<ReactMarkdown>` |
| `src/pages/SearchResults.tsx` | `node.layer1` (line 128) | Plain `<p>` | `<ReactMarkdown>` |
| `src/components/admin/NodeForm.tsx` | No change | -- | -- |

### How It Works

- Add the `react-markdown` package (lightweight, ~30KB, built-in sanitization).
- Create a small wrapper component `src/components/MarkdownText.tsx` that renders inline Markdown (italic, bold) while inheriting the parent's text styles via `className` pass-through. This wrapper will strip block-level elements (no `<h1>`, `<hr>`, `<img>`, etc.) so content stays inline/paragraph-level.
- Replace the 4 plain text renders listed above with `<MarkdownText>`.
- Add minor CSS in `src/index.css` to ensure `em` and `strong` tags inside `.font-body` inherit proper styles.

### What Does NOT Change

- Admin form (NodeForm, Layer2Field, Layer3Field) -- writers just type `*italic*` in the existing textareas
- Database schema -- content stays as plain strings
- Edge functions (api-answer, admin-nodes) -- treat content as raw strings
- Search/scoring logic -- unaffected

### Admin Hint Text

Add small helper text beneath the Layer 1, Summary, and Detail textareas: "Use *italic* or **bold** for formatting." -- so writers know the syntax is available.

### Technical Details

**New dependency:** `react-markdown`

**New file:** `src/components/MarkdownText.tsx`
- Accepts `content: string` and `className?: string`
- Uses `react-markdown` with `allowedElements` restricted to `p`, `em`, `strong`, `a`, `br`
- Passes through className for consistent styling

**Modified files:**
- `src/pages/NodeDetail.tsx` -- import and use `MarkdownText` in 3 places
- `src/pages/SearchResults.tsx` -- import and use `MarkdownText` in 1 place
- `src/index.css` -- add minimal styles for `em`/`strong` if needed
- `src/components/admin/Layer2Field.tsx` -- add hint text below Summary and Detail textareas
- `src/components/admin/NodeForm.tsx` -- add hint text below Layer 1 textarea

