import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { ArrowLeft } from 'lucide-react';

type Node = Tables<'nodes'>;

interface NodeFormProps {
  node?: Node | null;
  onSubmit: (data: Partial<Node> & { id: string; title: string }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function safeJsonStringify(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  return JSON.stringify(val, null, 2);
}

function safeJsonParse(val: string): unknown {
  if (!val.trim()) return null;
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

const NodeForm = ({ node, onSubmit, onCancel, loading }: NodeFormProps) => {
  const isEditing = !!node;

  const [id, setId] = useState(node?.id ?? '');
  const [title, setTitle] = useState(node?.title ?? '');
  const [altPhrasings, setAltPhrasings] = useState(
    safeJsonStringify(node?.alt_phrasings ?? [])
  );
  const [category, setCategory] = useState(node?.category ?? '');
  const [keywords, setKeywords] = useState(node?.keywords ?? '');
  const [layer1, setLayer1] = useState(node?.layer1 ?? '');
  const [layer2Json, setLayer2Json] = useState(
    safeJsonStringify(node?.layer2_json ?? {})
  );
  const [layer3Json, setLayer3Json] = useState(
    safeJsonStringify(node?.layer3_json ?? {})
  );
  const [published, setPublished] = useState(node?.published ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!id.trim()) errs.id = 'ID is required';
    else if (!/^[a-z0-9-]+$/.test(id)) errs.id = 'Use lowercase letters, numbers, and hyphens only';
    if (!title.trim()) errs.title = 'Title is required';
    if (altPhrasings.trim() && !safeJsonParse(altPhrasings)) errs.alt_phrasings = 'Invalid JSON';
    if (layer2Json.trim() && !safeJsonParse(layer2Json)) errs.layer2_json = 'Invalid JSON';
    if (layer3Json.trim() && !safeJsonParse(layer3Json)) errs.layer3_json = 'Invalid JSON';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      id: id.trim(),
      title: title.trim(),
      alt_phrasings: (safeJsonParse(altPhrasings) ?? []) as Node['alt_phrasings'],
      category: category.trim() || null,
      keywords: keywords.trim() || null,
      layer1: layer1.trim() || null,
      layer2_json: (safeJsonParse(layer2Json) ?? {}) as Node['layer2_json'],
      layer3_json: (safeJsonParse(layer3Json) ?? {}) as Node['layer3_json'],
      published,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="font-display text-lg">
            {isEditing ? 'Edit Node' : 'Create Node'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">ID (slug)</Label>
              <Input
                id="id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={isEditing}
                placeholder="e.g. what-is-gravity"
              />
              {errors.id && <p className="text-sm text-destructive">{errors.id}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What is gravity?"
              />
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Physics"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="e.g. force, Newton, mass"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alt_phrasings">Alt Phrasings (JSON array)</Label>
            <Textarea
              id="alt_phrasings"
              value={altPhrasings}
              onChange={(e) => setAltPhrasings(e.target.value)}
              placeholder='["How does gravity work?", "Why do things fall?"]'
              rows={3}
            />
            <p className="text-xs text-muted-foreground">Must be a JSON array.</p>
            {errors.alt_phrasings && <p className="text-sm text-destructive">{errors.alt_phrasings}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="layer1">Layer 1 — Summary</Label>
            <Textarea
              id="layer1"
              value={layer1}
              onChange={(e) => setLayer1(e.target.value)}
              placeholder="A concise answer in 2-3 sentences…"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="layer2_json">Layer 2 — Structured Detail (JSON)</Label>
            <Textarea
              id="layer2_json"
              value={layer2Json}
              onChange={(e) => setLayer2Json(e.target.value)}
              placeholder='{ "reasoning": [{ "id": "...", "title": "...", "summary": "...", "detail": "..." }] }'
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Must use <code className="font-mono">{"{ \"reasoning\": [...] }"}</code> format.</p>
            {errors.layer2_json && <p className="text-sm text-destructive">{errors.layer2_json}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="layer3_json">Layer 3 — Expert/Technical (JSON)</Label>
            <Textarea
              id="layer3_json"
              value={layer3Json}
              onChange={(e) => setLayer3Json(e.target.value)}
              placeholder='{ "resources": [...], "sources": [...], "related_questions": [...] }'
              rows={6}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Supports <code className="font-mono">{"{ \"resources\": [...], \"sources\": [...], \"related_questions\": [...] }"}</code>.</p>
            {errors.layer3_json && <p className="text-sm text-destructive">{errors.layer3_json}</p>}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Switch id="published" checked={published} onCheckedChange={setPublished} />
            <Label htmlFor="published" className="cursor-pointer">
              {published ? 'Published' : 'Draft'}
            </Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : isEditing ? 'Update Node' : 'Create Node'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default NodeForm;
