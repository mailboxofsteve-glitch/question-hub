

## Add Bullet List Support to Reasoning Detail Fields

### What changes
**Single file: `src/components/MarkdownText.tsx`**

Add `ul`, `ol`, and `li` to the `allowedElements` array so that Markdown list syntax (`- item` or `1. item`) renders as actual bullet/numbered lists within detail text.

Add minimal styled components for `ul` and `ol` to keep them visually consistent (e.g., `list-disc pl-5` for `ul`, `list-decimal pl-5` for `ol`).

### Impact
- Layer 2 detail fields, Layer 1 summaries, and any other content using `MarkdownText` will gain list rendering.
- No changes to the admin form or database — writers just type `- item` on new lines in the detail textarea.
- The Writer Guide dialog (`WriterGuideDialog.tsx`) should be updated to document that bullet lists are now supported.

