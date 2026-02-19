import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface Resource {
  [key: string]: string;
  title: string;
  url: string;
  description: string;
}

interface Source {
  [key: string]: string;
  title: string;
  url: string;
  description: string;
}

export interface Layer3Data {
  resources: Resource[];
  sources: Source[];
  related_questions: string[];
}

interface Layer3FieldProps {
  data: Layer3Data;
  onChange: (data: Layer3Data) => void;
}

export function serializeLayer3(data: Layer3Data) {
  return {
    resources: data.resources
      .filter((r) => r.title.trim())
      .map((r) => ({
        title: r.title.trim(),
        ...(r.url.trim() ? { url: r.url.trim() } : {}),
        ...(r.description.trim() ? { description: r.description.trim() } : {}),
      })),
    sources: data.sources
      .filter((s) => s.title.trim())
      .map((s) => ({
        title: s.title.trim(),
        ...(s.url.trim() ? { url: s.url.trim() } : {}),
        ...(s.description.trim() ? { description: s.description.trim() } : {}),
      })),
    related_questions: data.related_questions.filter((q) => q.trim()),
    editorial_notes: {},
  };
}

export function deserializeLayer3(json: unknown): Layer3Data {
  const empty: Layer3Data = { resources: [], sources: [], related_questions: [] };
  if (!json || typeof json !== 'object') return empty;
  const obj = json as Record<string, unknown>;
  return {
    resources: Array.isArray(obj.resources)
      ? obj.resources.map((r: any) => ({
          title: r.title || '',
          url: r.url || '',
          description: r.description || '',
        }))
      : [],
    sources: Array.isArray(obj.sources)
      ? obj.sources.map((s: any) => ({
          title: s.title || '',
          url: s.url || '',
          description: s.description || '',
        }))
      : [],
    related_questions: Array.isArray(obj.related_questions)
      ? obj.related_questions.map(String)
      : [],
  };
}

const RepeatableGroup = ({
  label,
  items,
  fields,
  addLabel,
  onAdd,
  onRemove,
  onUpdate,
}: {
  label: string;
  items: Record<string, string>[];
  fields: { key: string; label: string; placeholder: string }[];
  addLabel: string;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, key: string, val: string) => void;
}) => (
  <div className="space-y-3">
    <Label>{label}</Label>
    {items.map((item, i) => (
      <div key={i} className="border rounded-md p-3 space-y-2 relative">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1"
          onClick={() => onRemove(i)}
        >
          <X className="w-4 h-4" />
        </Button>
        {fields.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            <Input
              value={item[f.key] || ''}
              onChange={(e) => onUpdate(i, f.key, e.target.value)}
              placeholder={f.placeholder}
            />
          </div>
        ))}
      </div>
    ))}
    <Button type="button" variant="outline" size="sm" onClick={onAdd}>
      <Plus className="w-4 h-4 mr-1" /> {addLabel}
    </Button>
  </div>
);

const Layer3Field = ({ data, onChange }: Layer3FieldProps) => {
  const updateResources = (resources: Resource[]) => onChange({ ...data, resources });
  const updateSources = (sources: Source[]) => onChange({ ...data, sources });
  const updateRelated = (related_questions: string[]) => onChange({ ...data, related_questions });

  return (
    <div className="space-y-6">
      <Label className="text-base font-semibold">Layer 3 — Next Steps</Label>

      <RepeatableGroup
        label="Resources (0–3)"
        items={data.resources}
        fields={[
          { key: 'title', label: 'Title', placeholder: 'Resource title' },
          { key: 'url', label: 'URL', placeholder: 'https://...' },
          { key: 'description', label: 'Description (optional)', placeholder: 'Brief description' },
        ]}
        addLabel="Add Resource"
        onAdd={() => updateResources([...data.resources, { title: '', url: '', description: '' }])}
        onRemove={(i) => updateResources(data.resources.filter((_, idx) => idx !== i))}
        onUpdate={(i, key, val) =>
          updateResources(data.resources.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)))
        }
      />

      <RepeatableGroup
        label="Sources (0–10)"
        items={data.sources}
        fields={[
          { key: 'title', label: 'Title', placeholder: 'Author, Work Title' },
          { key: 'url', label: 'URL (optional)', placeholder: 'https://...' },
          { key: 'description', label: 'Description (optional)', placeholder: 'Brief note' },
        ]}
        addLabel="Add Source"
        onAdd={() => updateSources([...data.sources, { title: '', url: '', description: '' }])}
        onRemove={(i) => updateSources(data.sources.filter((_, idx) => idx !== i))}
        onUpdate={(i, key, val) =>
          updateSources(data.sources.map((s, idx) => (idx === i ? { ...s, [key]: val } : s)))
        }
      />

      <div className="space-y-3">
        <Label>Related Questions</Label>
        {data.related_questions.map((q, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={q}
              onChange={(e) =>
                updateRelated(data.related_questions.map((v, idx) => (idx === i ? e.target.value : v)))
              }
              placeholder="node-id-slug"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => updateRelated(data.related_questions.filter((_, idx) => idx !== i))}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => updateRelated([...data.related_questions, ''])}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Related Question
        </Button>
      </div>
    </div>
  );
};

export default Layer3Field;
