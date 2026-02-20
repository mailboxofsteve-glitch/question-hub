import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

export interface ReasoningBullet {
  title: string;
  summary: string;
  detail: string;
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
  }));
}

const Layer2Field = ({ bullets, onChange, errors }: Layer2FieldProps) => {
  const add = () => onChange([...bullets, { title: '', summary: '', detail: '' }]);
  const remove = (i: number) => onChange(bullets.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ReasoningBullet, val: string) =>
    onChange(bullets.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));

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
