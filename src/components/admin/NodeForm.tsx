import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tables } from '@/integrations/supabase/types';
import { ArrowLeft } from 'lucide-react';
import AltPhrasingsField from './AltPhrasingsField';
import WriterGuideDialog from './WriterGuideDialog';
import Layer2Field, { ReasoningBullet, serializeLayer2, deserializeLayer2 } from './Layer2Field';
import Layer3Field, { Layer3Data, serializeLayer3, deserializeLayer3 } from './Layer3Field';

type Node = Tables<'nodes'>;

interface NodeFormProps {
  node?: Node | null;
  onSubmit: (data: Partial<Node> & { id: string; title: string }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function parseAltPhrasings(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
  }
  return [];
}

const NodeForm = ({ node, onSubmit, onCancel, loading }: NodeFormProps) => {
  const isEditing = !!node;

  const [id, setId] = useState(node?.id ?? '');
  const [title, setTitle] = useState(node?.title ?? '');
  const [altPhrasings, setAltPhrasings] = useState<string[]>(
    parseAltPhrasings(node?.alt_phrasings)
  );
  const [category, setCategory] = useState(node?.category ?? '');
  const [keywords, setKeywords] = useState(node?.keywords ?? '');
  const [layer1, setLayer1] = useState(node?.layer1 ?? '');
  const [layer2Bullets, setLayer2Bullets] = useState<ReasoningBullet[]>(
    deserializeLayer2(node?.layer2_json)
  );
  const [layer3Data, setLayer3Data] = useState<Layer3Data>(
    deserializeLayer3(node?.layer3_json)
  );
  const [published, setPublished] = useState(node?.published ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!id.trim()) errs.id = 'ID is required';
    else if (!/^[a-z0-9-]+$/.test(id)) errs.id = 'Use lowercase letters, numbers, and hyphens only';
    if (!title.trim()) errs.title = 'Title is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSubmit({
      id: id.trim(),
      title: title.trim(),
      alt_phrasings: altPhrasings.filter((p) => p.trim()) as unknown as Node['alt_phrasings'],
      category: category.trim() || null,
      keywords: keywords.trim() || null,
      layer1: layer1.trim() || null,
      layer2_json: serializeLayer2(layer2Bullets) as unknown as Node['layer2_json'],
      layer3_json: serializeLayer3(layer3Data) as unknown as Node['layer3_json'],
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
          <div className="ml-auto">
            <WriterGuideDialog />
          </div>
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

          <AltPhrasingsField phrasings={altPhrasings} onChange={setAltPhrasings} />

          <div className="space-y-2">
            <Label htmlFor="layer1">Layer 1 — Summary</Label>
            <Textarea
              id="layer1"
              value={layer1}
              onChange={(e) => setLayer1(e.target.value)}
              placeholder="A concise answer in 2-3 sentences…"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Use *italic* or **bold** for formatting.</p>
          </div>

          <Layer2Field bullets={layer2Bullets} onChange={setLayer2Bullets} nodeId={id} />

          <Layer3Field data={layer3Data} onChange={setLayer3Data} />

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
