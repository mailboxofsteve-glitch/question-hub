

## Why Your JPEG Won't Upload

The file format is not the problem — JPEG is accepted. The error in the console is:

> `StorageApiError: new row violates row-level security policy`

The storage bucket `node-images` has upload permissions restricted to users with the **admin** role only. If your account has the **editor** role (not admin), the upload is blocked by the database security policy.

## Fix

Add a single database migration that updates the two storage policies (INSERT and DELETE) to also allow the `editor` role:

**Migration SQL:**
```sql
-- Drop existing restrictive policies
DROP POLICY "Admins can upload node images" ON storage.objects;
DROP POLICY "Admins can delete node images" ON storage.objects;

-- Recreate to allow both admin and editor roles
CREATE POLICY "Admins and editors can upload node images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'node-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'editor')
    )
  );

CREATE POLICY "Admins and editors can delete node images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'node-images'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'editor')
    )
  );
```

No code changes needed — just this one migration to update the storage permissions.

