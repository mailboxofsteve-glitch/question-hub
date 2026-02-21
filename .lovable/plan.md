

## Add Video Embedding to Layer 2 Reasoning Bullets

### Overview
Add an optional video embed (YouTube/Vimeo) to each reasoning bullet in Layer 2. This is a lightweight change -- no database migration or new dependencies needed since `layer2_json` is already a flexible JSON column.

### What Changes

**1. Update the ReasoningBullet type and serialization** -- `src/components/admin/Layer2Field.tsx`
- Add `video_url?: string` to the `ReasoningBullet` interface
- Include `video_url` in `serializeLayer2` and `deserializeLayer2`

**2. Add a video URL input to the admin form** -- `src/components/admin/Layer2Field.tsx`
- Add an `Input` field labeled "Video URL (optional)" below the Detail textarea in each bullet card
- Placeholder text: "YouTube or Vimeo URL"

**3. Update the NodeDetail page to render embedded videos** -- `src/pages/NodeDetail.tsx`
- Add `video_url?: string` to the local `ReasoningBullet` interface
- Create a small helper function to convert watch URLs to embed URLs:
  - `youtube.com/watch?v=ID` to `youtube.com/embed/ID`
  - `youtu.be/ID` to `youtube.com/embed/ID`
  - `vimeo.com/ID` to `player.vimeo.com/video/ID`
- Render a responsive `iframe` below the detail text when `video_url` is present

**4. Update the Markdown import parser (optional)** -- `src/lib/parse-node-markdown.ts`
- Support an optional `**Video:**` line within each `####` reasoning bullet section
- Parse the URL into the `video_url` field

### Files Changed

| File | Change |
|---|---|
| `src/components/admin/Layer2Field.tsx` | Add `video_url` to type, serialization, and form UI |
| `src/pages/NodeDetail.tsx` | Add embed rendering with URL conversion helper |
| `src/lib/parse-node-markdown.ts` | Support optional `**Video:**` line in reasoning bullets |

### No Database Changes Required
The `layer2_json` column stores arbitrary JSON, so adding a new optional field to the reasoning bullet objects requires zero schema changes.

### Technical Details

**URL conversion helper:**
```text
function toEmbedUrl(url: string): string | null
  - Match youtube.com/watch?v=ID -> youtube.com/embed/ID
  - Match youtu.be/ID -> youtube.com/embed/ID
  - Match vimeo.com/ID -> player.vimeo.com/video/ID
  - Return null if unrecognized (don't render iframe)
```

**Iframe rendering (responsive):**
```text
<div className="aspect-video mt-3">
  <iframe
    src={embedUrl}
    className="w-full h-full rounded-md"
    allowFullScreen
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  />
</div>
```

**Security note:** Only YouTube and Vimeo domains will be allowed in the embed. Unrecognized URLs are silently ignored (no iframe rendered).

