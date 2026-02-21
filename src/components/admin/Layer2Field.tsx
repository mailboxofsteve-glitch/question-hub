import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export interface ReasoningBullet {
  title: string;
  summary: string;
  detail: string;
  video_url?: string;
  image_url?: string;
}

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

interface Layer2FieldProps {
  bullets: ReasoningBullet[];
  onChange: (bullets: ReasoningBullet[]) => void;
  errors?: string;
  nodeId?: string;
}

export function serializeLayer2(bullets: ReasoningBullet[]) {
  return {
    reasoning: bullets
      .filter((b) => b.title.trim())
      .map((b) => ({
        id: toSlug(b.title),
        title: b.title.trim(),
        summary: b.summary.trim(),
        detail: b.detail.trim(),
        ...(b.video_url?.trim() ? { video_url: b.video_url.trim() } : {}),
        ...(b.image_url?.trim() ? { image_url: b.image_url.trim() } : {}),
      })),
  };
}

export function deserializeLayer2(json: unknown): ReasoningBullet[] {
  if (!json || typeof json !== 'object') return [];
  const obj = json as Record<string, unknown>;
  const reasoning = obj.reasoning;
  if (!Array.isArray(reasoning)) return [];
  return reasoning.map((r: any) => ({
    title: r.title || '',
    summary: r.summary || '',
    detail: r.detail || '',
    video_url: r.video_url || '',
    image_url: r.image_url || '',
  }));
}

const Layer2Field = ({ bullets, onChange, errors, nodeId }: Layer2FieldProps) => {
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const add = () => onChange([...bullets, { title: '', summary: '', detail: '', video_url: '', image_url: '' }]);
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ReasoningBullet, val: string) =>
    onChange(bullets.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));

  const handleImageUpload = async (i: number, file: File) => {
    if (!file) return;
    setUploadingIndex(i);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const prefix = nodeId || 'draft';
      const path = `${prefix}/${i}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('node-images').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('node-images').getPublicUrl(path);
      update(i, 'image_url', urlData.publicUrl);
    } catch (err) {
      console.error('Image upload failed:', err);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleImageRemove = async (i: number) => {
    const url = bullets[i].image_url;
    if (url) {
      // Extract path from public URL
      const match = url.match(/node-images\/(.+)$/);
      if (match) {
        await supabase.storage.from('node-images').remove([match[1]]);
      }
    }
    update(i, 'image_url', '');
  };

  return (
    <div className="space-y-4">
      <Label>Layer 2 — Reasoning Bullets</Label>
      {bullets.map((b, i) => (
        <div key={i} className="border rounded-md p-4 space-y-3 relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={() => remove(i)}
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="space-y-2">
            <Label htmlFor={`l2-title-${i}`}>Title</Label>
            <Input
              id={`l2-title-${i}`}
              value={b.title}
              onChange={(e) => update(i, 'title', e.target.value)}
              placeholder="e.g. Why It Matters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`l2-summary-${i}`}>Summary</Label>
            <Textarea
              id={`l2-summary-${i}`}
              value={b.summary}
              onChange={(e) => update(i, 'summary', e.target.value)}
              placeholder="1–2 sentence summary"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Use *italic* or **bold** for formatting.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`l2-detail-${i}`}>Detail</Label>
            <Textarea
              id={`l2-detail-${i}`}
              value={b.detail}
              onChange={(e) => update(i, 'detail', e.target.value)}
              placeholder="60–120 words of expanded detail"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Use *italic* or **bold** for formatting.</p>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            {b.image_url ? (
              <div className="relative inline-block">
                <img
                  src={b.image_url}
                  alt={`Bullet ${i + 1}`}
                  className="rounded-md max-h-40 object-contain border border-border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => handleImageRemove(i)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[i] = el; }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(i, file);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingIndex === i}
                  onClick={() => fileInputRefs.current[i]?.click()}
                >
                  {uploadingIndex === i ? (
                    <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Uploading…</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-1" /> Upload Image</>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`l2-video-${i}`}>Video URL (optional)</Label>
            <Input
              id={`l2-video-${i}`}
              value={b.video_url || ''}
              onChange={(e) => update(i, 'video_url', e.target.value)}
              placeholder="YouTube or Vimeo URL"
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add Reasoning Bullet
      </Button>
      {errors && <p className="text-sm text-destructive">{errors}</p>}
    </div>
  );
};

export default Layer2Field;
