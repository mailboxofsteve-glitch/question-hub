import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { parseNodeMarkdown, ParsedNode } from '@/lib/parse-node-markdown';
import { Upload, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ImportNodeDialogProps {
  onConfirm: (node: ParsedNode) => void;
}

const ImportNodeDialog = ({ onConfirm }: ImportNodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const [parsed, setParsed] = useState<ParsedNode | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseNodeMarkdown(reader.result as string);
      if (result.success && result.node) {
        setParsed(result.node);
        setErrors([]);
      } else {
        setParsed(null);
        setErrors(result.errors);
      }
      setOpen(true);
    };
    reader.readAsText(file);
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (parsed) {
      onConfirm(parsed);
      setOpen(false);
      setParsed(null);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setParsed(null);
    setErrors([]);
  };

  const reasoning = parsed?.layer2_json.reasoning ?? [];
  const resources = parsed?.layer3_json.resources ?? [];
  const sources = parsed?.layer3_json.sources ?? [];
  const relatedQ = parsed?.layer3_json.related_questions ?? [];

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="w-4 h-4 mr-1" /> Import Node (.md)
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {errors.length > 0 ? 'Import Errors' : 'Preview Imported Node'}
            </DialogTitle>
            <DialogDescription>
              {errors.length > 0
                ? 'Fix the following issues in your .md file and try again.'
                : 'Review the parsed data below, then confirm to create.'}
            </DialogDescription>
          </DialogHeader>

          {errors.length > 0 ? (
            <div className="space-y-2 py-2">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
          ) : parsed ? (
            <div className="space-y-4 py-2 text-sm">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Field label="Node ID" value={parsed.id} mono />
                <Field label="Title" value={parsed.title} />
                <Field label="Category" value={parsed.category ?? '—'} />
                <Field label="Keywords" value={parsed.keywords ?? '—'} />
                <Field label="Status" value={parsed.published ? 'Published' : 'Draft'} />
              </div>

              {parsed.alt_phrasings.length > 0 && (
                <div>
                  <Label>Alt Phrasings</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsed.alt_phrasings.map((p, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Layer 1 */}
              <div>
                <Label>Layer 1 — Quick Answer</Label>
                <p className="mt-1 text-muted-foreground">{parsed.layer1 ?? '—'}</p>
              </div>

              {/* Layer 2 */}
              {reasoning.length > 0 && (
                <div>
                  <Label>Layer 2 — Reasoning ({reasoning.length} bullets)</Label>
                  <div className="mt-1 space-y-2">
                    {reasoning.map((r) => (
                      <div key={r.id} className="border rounded-md p-2 space-y-1">
                        <p className="font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground">{r.summary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Layer 3 */}
              {resources.length > 0 && (
                <div>
                  <Label>Dig Deeper ({resources.length})</Label>
                  <ul className="mt-1 list-disc list-inside text-muted-foreground">
                    {resources.map((r, i) => (
                      <li key={i}>{r.title}{r.description ? ` — ${r.description}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}

              {sources.length > 0 && (
                <div>
                  <Label>Sources ({sources.length})</Label>
                  <ul className="mt-1 list-disc list-inside text-muted-foreground">
                    {sources.map((s, i) => (
                      <li key={i}>{s.title}{s.description ? ` — ${s.description}` : ''}</li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedQ.length > 0 && (
                <div>
                  <Label>Related Questions ({relatedQ.length})</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {relatedQ.map((q, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-mono">{q}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            {parsed && (
              <Button onClick={handleConfirm}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Confirm Create
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-foreground">{children}</p>;
}

export default ImportNodeDialog;
