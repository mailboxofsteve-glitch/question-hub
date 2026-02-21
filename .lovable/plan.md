

## Add Image Uploads to Layer 2 Reasoning Bullets

### Overview
Add an optional image to each reasoning bullet, displayed between the detail text and the embedded video. Images will be stored in Lovable Cloud storage. Like the video feature, this requires no database migration since `layer2_json` is a flexible JSON column.

### What Changes

**1. Create a storage bucket** (database migration)
- Create a public `node-images` bucket in Cloud storage
- Add an RLS policy allowing anyone to read images (public content)
- Add an RLS policy allowing authenticated admin users to upload/delete images

**2. Update the ReasoningBullet type and serialization** -- `src/components/admin/Layer2Field.tsx`
- Add `image_url?: string` to the `ReasoningBullet` interface
- Include `image_url` in `serializeLayer2` and `deserializeLayer2`

**3. Add image upload UI to the admin form** -- `src/components/admin/Layer2Field.tsx`
- Add an image upload section between the Detail textarea and the Video URL input
- Show a file input button labeled "Upload Image (optional)"
- When an image is already uploaded, show a thumbnail preview with a remove button
- On file select, upload to Cloud storage at path `node-images/{nodeId}/{bulletIndex}_{timestamp}.{ext}` and store the resulting public URL in `image_url`

**4. Render the image on the NodeDetail page** -- `src/pages/NodeDetail.tsx`
- Add `image_url?: string` to the local `ReasoningBullet` interface
- Render an `<img>` tag after the detail text and before the video embed when `image_url` is present
- Style with rounded corners and responsive width

### Files Changed

| File | Change |
|---|---|
| New migration SQL | Create `node-images` storage bucket with RLS policies |
| `src/components/admin/Layer2Field.tsx` | Add `image_url` to type, serialization, file upload UI with preview |
| `src/pages/NodeDetail.tsx` | Render image between detail and video |

### Technical Details

**Storage bucket setup (migration):**
```text
INSERT INTO storage.buckets (id, name, public) VALUES ('node-images', 'node-images', true);

-- Anyone can view images (public site)
CREATE POLICY "Public read node images" ON storage.objects
  FOR SELECT USING (bucket_id = 'node-images');

-- Only admins can upload/delete
CREATE POLICY "Admins can upload node images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'node-images'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete node images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'node-images'
    AND public.has_role(auth.uid(), 'admin')
  );
```

**Upload flow in admin form:**
- User selects a file via `<input type="file" accept="image/*">`
- File is uploaded to storage using `supabase.storage.from('node-images').upload(path, file)`
- Public URL is obtained via `supabase.storage.from('node-images').getPublicUrl(path)`
- The URL is stored in the bullet's `image_url` field
- A loading spinner shows during upload

**Image rendering on NodeDetail (between detail and video):**
```text
{bullet.image_url && (
  <img
    src={bullet.image_url}
    alt={bullet.title}
    className="mt-3 rounded-md w-full object-contain max-h-96"
  />
)}
```

**Removing an image:**
- In the admin form, a small "X" button next to the preview deletes the file from storage and clears `image_url`

