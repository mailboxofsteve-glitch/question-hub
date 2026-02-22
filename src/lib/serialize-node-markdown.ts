import { ReasoningBullet } from '@/components/admin/Layer2Field';
import { Layer3Data } from '@/components/admin/Layer3Field';

interface SerializeNodeInput {
  id: string;
  title: string;
  category: string;
  keywords: string;
  altPhrasings: string[];
  published: boolean;
  layer1: string;
  layer2Bullets: ReasoningBullet[];
  layer3Data: Layer3Data;
}

export function serializeNodeMarkdown(input: SerializeNodeInput): string {
  const lines: string[] = [];

  // ── 0) Metadata ──
  lines.push('## 0) Node Metadata');
  lines.push(`**Node ID:** \`${input.id}\``);
  lines.push('**Title (Question):**');
  lines.push(input.title);
  if (input.category) {
    lines.push(`**Category:** ${input.category}`);
  }
  if (input.keywords) {
    lines.push('**Keywords:**');
    input.keywords.split(',').map(k => k.trim()).filter(Boolean).forEach(k => {
      lines.push(`- ${k}`);
    });
  }
  if (input.altPhrasings.length > 0) {
    lines.push('**Alt Phrasings:**');
    input.altPhrasings.filter(p => p.trim()).forEach(p => {
      lines.push(`- ${p}`);
    });
  }
  lines.push(`**Status:** \`${input.published ? 'published' : 'draft'}\``);
  if (input.layer3Data.related_questions.filter(q => q.trim()).length > 0) {
    lines.push('**Related Questions:**');
    input.layer3Data.related_questions.filter(q => q.trim()).forEach(q => {
      lines.push(`- \`${q}\``);
    });
  }
  lines.push('');

  // ── 1) Layer 1 ──
  lines.push('## 1) Layer 1 — Quick Answer');
  if (input.layer1) {
    lines.push(input.layer1);
  }
  lines.push('');

  // ── 2) Layer 2 ──
  lines.push('## 2) Layer 2 — Reasoning');
  const validBullets = input.layer2Bullets.filter(b => b.title.trim());
  for (const b of validBullets) {
    lines.push(`#### ${b.title}`);
    lines.push('**Summary:**');
    lines.push(b.summary);
    lines.push('**Detail:**');
    lines.push(b.detail);
    if (b.image_url?.trim()) {
      lines.push(`**Image:** ${b.image_url.trim()}`);
    }
    if (b.video_url?.trim()) {
      lines.push(`**Video:** ${b.video_url.trim()}`);
    }
    lines.push('');
  }

  // ── 3) Layer 3 ──
  lines.push('## 3) Layer 3 — Next Steps');
  const resources = input.layer3Data.resources.filter(r => r.title.trim());
  if (resources.length > 0) {
    lines.push('### Dig Deeper');
    for (const r of resources) {
      const desc = r.description?.trim() ? ` — ${r.description.trim()}` : '';
      lines.push(`- **${r.title.trim()}**${desc}`);
    }
  }
  const sources = input.layer3Data.sources.filter(s => s.title.trim());
  if (sources.length > 0) {
    lines.push('### Sources');
    for (const s of sources) {
      const desc = s.description?.trim() ? ` — ${s.description.trim()}` : '';
      lines.push(`- ${s.title.trim()}${desc}`);
    }
  }
  const related = input.layer3Data.related_questions.filter(q => q.trim());
  if (related.length > 0) {
    lines.push('### Related Questions');
    for (const q of related) {
      lines.push(`- \`${q}\``);
    }
  }
  lines.push('');

  return lines.join('\n');
}
