
Straightforward update to two render components. The tricky bit: `MarkdownText` runs ReactMarkdown on the raw string, so highlighting trigger words inside markdown content requires a different approach than for plain strings (titles are plain, but summaries/details/descriptions go through MarkdownText).

## Approach

### 1. New shared helper
Create `src/lib/highlight-trigger.tsx` exporting:
```ts
export function highlightTriggerWord(text: string, triggerWord: string | null): React.ReactNode
```
- Returns `text` unchanged when `triggerWord` is null/empty/whitespace or no match
- Escapes regex special chars in the trigger word
- Splits with case-insensitive global regex (capturing group), maps matches to `<span style={{ fontWeight: 700, color: 'hsl(38, 92%, 50%)' }}>`
- Returns array of strings + spans (suitable as React children)

### 2. Plain-string fields (titles)
Apply `highlightTriggerWord(...)` directly inside JSX where plain strings are rendered:
- Reasoning bullet `<h4>{bullet.title}</h4>` → wrap children with helper

### 3. Markdown fields
For `MarkdownText` calls on `layer1`, `bullet.summary`, `bullet.detail`, `res.title`, `res.description`, `src.title`, `src.description`: extend `MarkdownText` with an optional `triggerWord?: string | null` prop. In its `components` map, override `text` renderer (react-markdown supports this) to run the highlight helper on each text node — preserving markdown (bold, links, lists) while still highlighting matches inside text runs.

### 4. Layer 1 rendering
Replace the current single `MarkdownText` Layer 1 block with a paragraph composed of:
- If `layer1_bold` present: `<strong style={{ fontWeight: 700 }}>{highlightTriggerWord(layer1_bold, triggerWord)}</strong>` followed by a space
- Then `<MarkdownText content={node.layer1 ?? ''} triggerWord={triggerWord} />` inline

Wrap in a single `<p>` with the existing styling. (`MarkdownText` already returns inline content via `<span>` and unwraps `<p>`, so it composes cleanly inside one paragraph.)

Note: `layer1_bold` is treated as plain text (per spec: "wrap in bold"), not markdown — keeps it simple.

### 5. Apply to both files
Same changes to `src/components/NodeDetailContent.tsx` and `src/pages/NodePreview.tsx`. Cast `triggerWord` and `layer1Bold` from `node` as `string | null`.

### Out of scope
Accordion behavior, related questions, analytics, diagnostic gating, NodeForm, schema, markdown parser internals beyond adding the optional trigger-word prop.

### Files changed
| File | Change |
|------|--------|
| `src/lib/highlight-trigger.tsx` (new) | `highlightTriggerWord` helper |
| `src/components/MarkdownText.tsx` | Accept optional `triggerWord` prop; highlight inside text nodes |
| `src/components/NodeDetailContent.tsx` | Render `layer1_bold` + apply highlighting to layer1/2/3 text |
| `src/pages/NodePreview.tsx` | Same rendering updates |
