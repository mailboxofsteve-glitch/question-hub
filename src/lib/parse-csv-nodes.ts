import { Tables } from '@/integrations/supabase/types';

export interface CsvRowResult {
  row: number;
  id: string;
  title: string;
  success: boolean;
  error?: string;
}

export interface CsvParseResult {
  nodes: Array<Partial<Tables<'nodes'>> & { id: string; title: string }>;
  results: CsvRowResult[];
  hasErrors: boolean;
}

const REQUIRED_COLUMNS = ['id', 'title'] as const;
const ALL_COLUMNS = ['id', 'title', 'category', 'keywords', 'alt_phrasings', 'layer1', 'layer2_json', 'layer3_json', 'draft'] as const;

/**
 * Parse a CSV string into validated node rows.
 * Returns ALL row results for reporting, and only valid nodes for import.
 */
export function parseCsvNodes(csvText: string): CsvParseResult {
  const lines = parseCsvLines(csvText);
  if (lines.length < 2) {
    return {
      nodes: [],
      results: [{ row: 1, id: '', title: '', success: false, error: 'CSV must have a header row and at least one data row.' }],
      hasErrors: true,
    };
  }

  const headers = lines[0].map((h) => h.trim().toLowerCase());

  // Validate headers
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return {
      nodes: [],
      results: [{ row: 1, id: '', title: '', success: false, error: `Missing required columns: ${missing.join(', ')}` }],
      hasErrors: true,
    };
  }

  const col = (row: string[], name: string): string => {
    const idx = headers.indexOf(name);
    return idx >= 0 && idx < row.length ? row[idx].trim() : '';
  };

  const results: CsvRowResult[] = [];
  const nodes: CsvParseResult['nodes'] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    // Skip empty rows
    if (row.every((c) => !c.trim())) continue;

    const rowNum = i + 1;
    const id = col(row, 'id');
    const title = col(row, 'title');

    if (!id) {
      results.push({ row: rowNum, id: '', title, success: false, error: 'Missing "id".' });
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(id)) {
      results.push({ row: rowNum, id, title, success: false, error: 'ID must be lowercase letters, numbers, and hyphens only.' });
      continue;
    }
    if (!title) {
      results.push({ row: rowNum, id, title: '', success: false, error: 'Missing "title".' });
      continue;
    }

    // Parse alt_phrasings
    const altRaw = col(row, 'alt_phrasings');
    let altPhrasings: string[] = [];
    if (altRaw) {
      try {
        const parsed = JSON.parse(altRaw);
        if (Array.isArray(parsed)) altPhrasings = parsed;
        else {
          results.push({ row: rowNum, id, title, success: false, error: 'alt_phrasings must be a JSON array.' });
          continue;
        }
      } catch {
        results.push({ row: rowNum, id, title, success: false, error: 'alt_phrasings is not valid JSON.' });
        continue;
      }
    }

    // Parse layer2_json
    const l2Raw = col(row, 'layer2_json');
    let layer2: unknown = {};
    if (l2Raw) {
      try {
        layer2 = JSON.parse(l2Raw);
      } catch {
        results.push({ row: rowNum, id, title, success: false, error: 'layer2_json is not valid JSON.' });
        continue;
      }
    }

    // Parse layer3_json
    const l3Raw = col(row, 'layer3_json');
    let layer3: unknown = {};
    if (l3Raw) {
      try {
        layer3 = JSON.parse(l3Raw);
      } catch {
        results.push({ row: rowNum, id, title, success: false, error: 'layer3_json is not valid JSON.' });
        continue;
      }
    }

    const draftRaw = col(row, 'draft').toLowerCase();
    const published = draftRaw === 'false' || draftRaw === 'no' || draftRaw === '0' ? true : false;

    const category = col(row, 'category') || null;
    const keywords = col(row, 'keywords') || null;
    const layer1 = col(row, 'layer1') || null;

    nodes.push({
      id,
      title,
      category,
      keywords,
      alt_phrasings: altPhrasings as any,
      layer1,
      layer2_json: layer2 as any,
      layer3_json: layer3 as any,
      published,
      search_blob: [title, layer1, keywords, altPhrasings.join(' ')].filter(Boolean).join(' '),
    });

    results.push({ row: rowNum, id, title, success: true });
  }

  return { nodes, results, hasErrors: results.some((r) => !r.success) };
}

/**
 * RFC 4180-ish CSV parser that handles quoted fields with embedded commas/newlines.
 */
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
      } else if (ch === ',') {
        current.push(field);
        field = '';
        i++;
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        current.push(field);
        field = '';
        rows.push(current);
        current = [];
        i += ch === '\r' ? 2 : 1;
      } else if (ch === '\r') {
        current.push(field);
        field = '';
        rows.push(current);
        current = [];
        i++;
      } else {
        field += ch;
        i++;
      }
    }
  }

  // Last field/row
  if (field || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}
