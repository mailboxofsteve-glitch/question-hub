import { Tables } from '@/integrations/supabase/types';

type Node = Tables<'nodes'>;

export interface ParsedNode {
  id: string;
  title: string;
  category: string | null;
  keywords: string | null;
  alt_phrasings: string[];
  published: boolean;
  layer1: string | null;
  layer2_json: { reasoning: { id: string; title: string; summary: string; detail: string; video_url?: string }[] };
  layer3_json: {
    resources?: { title: string; url?: string; description?: string }[];
    sources?: { title: string; description?: string }[];
    related_questions?: string[];
    editorial_notes?: Record<string, string>;
  };
  search_blob: string | null;
}

export interface ParseResult {
  success: boolean;
  node?: ParsedNode;
  errors: string[];
}

/**
 * Parse a writer-template .md file into a node structure.
 */
export function parseNodeMarkdown(content: string): ParseResult {
  const errors: string[] = [];

  // Split into major sections by ## headings
  const sections = splitSections(content);

  // ── 0) Metadata ──
  const meta = sections['0'];
  if (!meta) {
    errors.push('Missing section: "## 0) Node Metadata"');
    return { success: false, errors };
  }

  const nodeId = extractInlineCode(meta, 'Node ID');
  if (!nodeId) errors.push('Missing or empty "Node ID".');

  const title = extractAfterLabel(meta, 'Title (Question)');
  if (!title) errors.push('Missing or empty "Title (Question)".');

  const altPhrasings = extractBulletList(meta, 'Alt Phrasings');
  const category = extractAfterLabel(meta, 'Category') || null;

  const keywordsList = extractBulletList(meta, 'Keywords');
  const keywords = keywordsList.length > 0 ? keywordsList.join(', ') : null;

  const statusRaw = extractInlineCode(meta, 'Status') || 'draft';
  const published = statusRaw.toLowerCase() === 'published';

  // Related questions from metadata (will merge with Layer 3)
  const metaRelated = extractBulletList(meta, 'Related Questions')
    .map((s) => s.replace(/^`|`$/g, '').trim())
    .filter(Boolean);

  // ── 1) Layer 1 ──
  const layer1Section = sections['1'];
  if (!layer1Section) {
    errors.push('Missing section: "## 1) Layer 1"');
  }
  const layer1 = layer1Section ? layer1Section.trim() : null;

  // ── 2) Layer 2 ──
  const layer2Section = sections['2'];
  if (!layer2Section) {
    errors.push('Missing section: "## 2) Layer 2"');
  }
  const reasoning = layer2Section ? parseReasoning(layer2Section) : [];
  if (layer2Section && reasoning.length === 0) {
    errors.push('Layer 2 has no reasoning bullets. Use "#### Heading" format.');
  }

  // ── 3) Layer 3 ──
  const layer3Section = sections['3'];
  if (!layer3Section) {
    errors.push('Missing section: "## 3) Layer 3"');
  }

  const resources = layer3Section ? parseDigDeeper(layer3Section) : [];
  const sources = layer3Section ? parseSources(layer3Section) : [];
  const layer3Related = layer3Section
    ? extractBulletListFromSubsection(layer3Section, 'Related Questions')
        .map((s) => s.replace(/^`|`$/g, '').trim())
        .filter(Boolean)
    : [];

  // Merge related questions from metadata + layer 3, dedupe
  const allRelated = [...new Set([...metaRelated, ...layer3Related])];

  // ── 4) Editorial Notes (optional) ──
  const editSection = sections['4'];
  let editorialNotes: Record<string, string> | undefined;
  if (editSection) {
    editorialNotes = parseEditorialNotes(editSection);
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const node: ParsedNode = {
    id: nodeId!,
    title: title!,
    category,
    keywords,
    alt_phrasings: altPhrasings,
    published,
    layer1,
    layer2_json: { reasoning },
    layer3_json: {
      ...(resources.length > 0 ? { resources } : {}),
      ...(sources.length > 0 ? { sources } : {}),
      ...(allRelated.length > 0 ? { related_questions: allRelated } : {}),
      ...(editorialNotes ? { editorial_notes: editorialNotes } : {}),
    },
    search_blob: [title, layer1, keywords, altPhrasings.join(' ')].filter(Boolean).join(' '),
  };

  return { success: true, node, errors: [] };
}

// ── Helpers ──

function splitSections(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match ## N) ... headings
  const pattern = /^## (\d)\)/gm;
  const matches: { index: number; key: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    matches.push({ index: m.index + m[0].length, key: m[1] });
  }
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? content.lastIndexOf('##', matches[i + 1].index) : content.length;
    // Find the end of the heading line
    const headingEnd = content.indexOf('\n', start);
    const body = content.slice(headingEnd >= 0 ? headingEnd + 1 : start, end).trim();
    result[matches[i].key] = body;
  }
  return result;
}

function extractInlineCode(section: string, label: string): string | null {
  const re = new RegExp(`\\*\\*${escapeRegex(label)}.*?\\*\\*.*?\`([^\`]+)\``, 'i');
  const m = section.match(re);
  return m ? m[1].trim() : null;
}

function extractAfterLabel(section: string, label: string): string | null {
  // Try multi-line: label on one line, content on next
  const re = new RegExp(`\\*\\*${escapeRegex(label)}.*?\\*\\*[:\\s]*\\n([^\\n*#]+)`, 'i');
  const m = section.match(re);
  if (m) {
    const val = m[1].replace(/^<|>$/g, '').trim();
    if (val && !val.startsWith('<')) return val;
  }
  // Try inline
  const re2 = new RegExp(`\\*\\*${escapeRegex(label)}.*?\\*\\*[:\\s]*(.+)`, 'i');
  const m2 = section.match(re2);
  if (m2) {
    const val = m2[1].replace(/^<|>$/g, '').trim();
    if (val && !val.startsWith('<')) return val;
  }
  return null;
}

function extractBulletList(section: string, label: string): string[] {
  const re = new RegExp(`\\*\\*${escapeRegex(label)}.*?\\*\\*[^\\n]*\\n((?:- .+\\n?)*)`, 'i');
  const m = section.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^- /, '').trim())
    .filter((l) => l && !l.startsWith('<'));
}

function extractBulletListFromSubsection(section: string, heading: string): string[] {
  const re = new RegExp(`### ${escapeRegex(heading)}[^\\n]*\\n((?:- .+\\n?)*)`, 'i');
  const m = section.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^- /, '').trim())
    .filter((l) => l && !l.startsWith('<'));
}

function parseReasoning(section: string): { id: string; title: string; summary: string; detail: string; video_url?: string }[] {
  const bullets: { id: string; title: string; summary: string; detail: string; video_url?: string }[] = [];
  // Split on #### headings
  const parts = section.split(/^####\s+/m).filter(Boolean);

  for (const part of parts) {
    const lines = part.split('\n');
    const titleLine = lines[0]?.trim();
    if (!titleLine) continue;
    // Skip if this is the "### Reasoning Bullets" heading remnant
    if (titleLine.startsWith('#')) continue;

    const fullText = lines.slice(1).join('\n');

    const summaryMatch = fullText.match(/\*\*Summary.*?\*\*[:\s]*\n?([\s\S]*?)(?=\*\*Detail|\*\*Video|\n---|\n####|$)/i);
    const detailMatch = fullText.match(/\*\*Detail.*?\*\*[:\s]*\n?([\s\S]*?)(?=\*\*Video|\n---|\n####|$)/i);
    const videoMatch = fullText.match(/\*\*Video.*?\*\*[:\s]*\n?\s*(https?:\/\/[^\s]+)/i);

    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const detail = detailMatch ? detailMatch[1].trim() : '';
    const video_url = videoMatch ? videoMatch[1].trim() : undefined;

    if (!summary && !detail) continue;

    const id = titleLine
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 40);

    bullets.push({ id, title: titleLine, summary, detail, ...(video_url ? { video_url } : {}) });
  }

  return bullets;
}

function parseDigDeeper(section: string): { title: string; description?: string }[] {
  const re = /### Dig Deeper[^\n]*\n([\s\S]*?)(?=\n###|\n---|$)/i;
  const m = section.match(re);
  if (!m) return [];
  const items: { title: string; description?: string }[] = [];
  // Each bullet: - **Title** — type —\n  description
  const bulletPattern = /- \*\*(.+?)\*\*\s*(?:—\s*(.+?)\s*—)?\s*\n?\s*(.*)/g;
  let bm: RegExpExecArray | null;
  while ((bm = bulletPattern.exec(m[1])) !== null) {
    const title = bm[1].trim();
    const desc = [bm[2], bm[3]].filter(Boolean).join(' — ').trim() || undefined;
    if (title && !title.startsWith('<')) items.push({ title, description: desc });
  }
  return items;
}

function parseSources(section: string): { title: string; description?: string }[] {
  const re = /### Sources[^\n]*\n([\s\S]*?)(?=\n###|\n---|$)/i;
  const m = section.match(re);
  if (!m) return [];
  return m[1]
    .split('\n')
    .map((l) => l.replace(/^- /, '').trim())
    .filter((l) => l && !l.startsWith('<'))
    .map((l) => {
      // Format: Author, Title, Locator — note
      const dashIdx = l.indexOf('—');
      if (dashIdx > -1) {
        return { title: l.slice(0, dashIdx).trim(), description: l.slice(dashIdx + 1).trim() || undefined };
      }
      return { title: l };
    });
}

function parseEditorialNotes(section: string): Record<string, string> {
  const notes: Record<string, string> = {};
  const pattern = /\*\*(.+?)\*\*[:\s]*\n?((?:- .+\n?)*)/g;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(section)) !== null) {
    const key = m[1].trim();
    const val = m[2]
      .split('\n')
      .map((l) => l.replace(/^- /, '').trim())
      .filter(Boolean)
      .join('; ');
    if (val && !val.startsWith('<')) notes[key] = val;
  }
  return Object.keys(notes).length > 0 ? notes : {};
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
}
