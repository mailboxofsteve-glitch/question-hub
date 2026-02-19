import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';

interface AltPhrasingsFieldProps {
  phrasings: string[];
  onChange: (phrasings: string[]) => void;
}

const AltPhrasingsField = ({ phrasings, onChange }: AltPhrasingsFieldProps) => {
  const add = () => onChange([...phrasings, '']);
  const remove = (i: number) => onChange(phrasings.filter((_, idx) => idx !== i));
  const update = (i: number, val: string) =>
    onChange(phrasings.map((p, idx) => (idx === i ? val : p)));

  return (
    <div className="space-y-3">
      <Label>Alt Phrasings</Label>
      {phrasings.map((p, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input
            value={p}
            onChange={(e) => update(i, e.target.value)}
            placeholder={`Phrasing ${i + 1}`}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="w-4 h-4 mr-1" /> Add Phrasing
      </Button>
    </div>
  );
};

export default AltPhrasingsField;
