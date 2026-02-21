

## Update Writer's Guide and Add It to the Node Form

### Overview
Two changes: (1) update the Writer's Guide content to document the new Image and Video fields in Layer 2, and (2) add the Writer's Guide help button (question mark icon) to the Node Form header next to the "Create Node" / "Edit Node" title.

### Changes

**1. Update Writer's Guide content** -- `src/components/admin/WriterGuideDialog.tsx`

In section 4 (Layer 2 -- Reasoning Bullets), add two new bullet points after "Detail":
- **Image (optional)** -- Upload a still image to illustrate the point. Supported formats: JPG, PNG, WebP, GIF. The image appears below the detail text.
- **Video URL (optional)** -- Paste a YouTube or Vimeo link to embed a video. The video appears below the image (if any). Standard watch URLs are automatically converted to embeds.

**2. Add WriterGuideDialog to NodeForm header** -- `src/components/admin/NodeForm.tsx`

- Import `WriterGuideDialog`
- Place it in the CardHeader next to the title, pushing it to the right side with `ml-auto` or a flex spacer:

```text
[<- Back]  Create Node              [?]
```

This mirrors the same question-mark button already visible on the Node Admin dashboard.

### Files Changed

| File | Change |
|---|---|
| `src/components/admin/WriterGuideDialog.tsx` | Add Image and Video documentation to Layer 2 section |
| `src/components/admin/NodeForm.tsx` | Import and render `WriterGuideDialog` in the card header |

