import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { parseCsvNodes, CsvParseResult } from '@/lib/parse-csv-nodes';
import { Upload, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';

interface ImportCsvDialogProps {
  onConfirm: (nodes: CsvParseResult['nodes']) => void;
}

const ImportCsvDialog = ({ onConfirm }: ImportCsvDialogProps) => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CsvParseResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsvNodes(reader.result as string);
      setResult(parsed);
      setOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirm = () => {
    if (result && !result.hasErrors) {
      onConfirm(result.nodes);
      setOpen(false);
      setResult(null);
    }
  };

  const handleCancel = () => {
    setOpen(false);
    setResult(null);
  };

  const validCount = result?.results.filter((r) => r.success).length ?? 0;
  const errorCount = result?.results.filter((r) => !r.success).length ?? 0;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <FileSpreadsheet className="w-4 h-4 mr-1" /> Import Nodes (.csv)
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>CSV Import Report</DialogTitle>
            <DialogDescription>
              {result?.hasErrors
                ? 'Some rows have errors. Fix all errors before importing — no partial imports.'
                : `${validCount} node(s) ready to import.`}
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4 py-2">
              <div className="flex gap-3">
                <Badge variant="default" className="text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> {validCount} valid
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" /> {errorCount} error{errorCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.results.map((r) => (
                      <TableRow key={r.row}>
                        <TableCell className="text-xs text-muted-foreground">{r.row}</TableCell>
                        <TableCell className="font-mono text-xs">{r.id || '—'}</TableCell>
                        <TableCell className="text-sm">{r.title || '—'}</TableCell>
                        <TableCell>
                          {r.success ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <span className="text-xs text-destructive flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                              {r.error}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            {result && !result.hasErrors && validCount > 0 && (
              <Button onClick={handleConfirm}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Import {validCount} Node{validCount > 1 ? 's' : ''}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImportCsvDialog;
