

## Fix: Apply Markdown Rendering to Sources and Resources

### Problem
The `*italic*` syntax in source titles is showing as raw asterisks because those fields are rendered as plain text. The `<MarkdownText>` component was only added to Layer 1 and Layer 2 fields, but not to the Layer 3 sections (Resources and Sources).

### Changes

**File: `src/pages/NodeDetail.tsx`**

Wrap the following plain-text renders with the existing `<MarkdownText>` component:

1. **Resource titles** (currently `{res.title}`) -- wrap in `<MarkdownText>`
2. **Resource descriptions** (currently `{res.description}`) -- wrap in `<MarkdownText>`
3. **Source titles** (currently `{src.title}`) -- wrap in `<MarkdownText>`
4. **Source descriptions** (currently `{src.description}`) -- wrap in `<MarkdownText>`

No new dependencies, no new files -- just 4 small swaps using the already-imported `MarkdownText` component.

### What Does NOT Change
- Database schema, edge functions, admin form, search results page
- The `MarkdownText` component itself (already handles inline formatting correctly)
