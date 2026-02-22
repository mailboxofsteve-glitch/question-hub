

## Add "Download .md" Button to the Edit Node Form

### Overview
Add a download button to the Node Form header (visible only when editing) that generates a properly formatted `.md` file from the current form state, matching the same template format that the import parser expects. This is purely a frontend feature -- no backend changes needed.

### What Changes

**1. Create a markdown serializer** -- `src/lib/serialize-node-markdown.ts`

A new utility function that takes the current form data and produces a markdown string following the writer template structure:

```text
## 0) Node Metadata
**Node ID:** `the-slug`
**Title (Question):**
The Title Here
**Category:** Physics
**Keywords:**
- keyword1
- keyword2
**Alt Phrasings:**
- phrasing one
- phrasing two
**Status:** `published` or `draft`
**Related Questions:**
- `related-slug`

## 1) Layer 1 — Quick Answer
The layer 1 text here...

## 2) Layer 2 — Reasoning
#### Bullet Title
**Summary:**
The summary text
**Detail:**
The detail text
**Image:** https://...  (if present)
**Video:** https://...  (if present)

## 3) Layer 3 — Next Steps
### Dig Deeper
- **Title** — description
### Sources
- Author, Title — note
### Related Questions
- `slug-id`
```

**2. Add download button to NodeForm header** -- `src/components/admin/NodeForm.tsx`

- Import the serializer and the `Download` icon from lucide-react
- Add a "Download .md" button next to the Writer's Guide button, only visible when `isEditing` is true
- On click, generate the markdown string from current form state, create a Blob, and trigger a browser download with filename `{id}.md`

### Header layout when editing:

```text
[Back]  Edit Node          [Download] [?]
```

### Files Changed

| File | Change |
|---|---|
| `src/lib/serialize-node-markdown.ts` | New file -- converts node form data to formatted .md string |
| `src/components/admin/NodeForm.tsx` | Add download button in header (edit mode only) |

### Technical Details

**Download trigger (no libraries needed):**
```text
const blob = new Blob([markdownString], { type: 'text/markdown' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${id}.md`;
a.click();
URL.revokeObjectURL(url);
```

**Round-trip compatibility:** The serializer output will match the format expected by `parseNodeMarkdown`, so a downloaded file can be re-imported without errors. The Image and Video fields in Layer 2 bullets will be included when present.

