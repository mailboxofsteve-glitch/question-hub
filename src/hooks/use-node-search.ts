import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeSearchResult {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
  alt_phrasings: string[] | null;
}

/**
 * Relevance scoring (client-side, applied after DB ilike filter):
 *
 * 1. **Exact title match** (+10) — query IS the title (case-insensitive)
 * 2. **Title starts with query** (+6) — strongest partial signal
 * 3. **Title contains query** (+4) — substring match in title
 * 4. **Keyword match** (+3) — query found in the keywords field
 * 5. **Layer-1 match** (+1) — query appears in the summary text
 *
 * Ties are broken by `updated_at` (most recent first, from the DB ORDER BY).
 */
function scoreResult(node: NodeSearchResult, term: string): number {
  if (!term) return 0;
  const t = term.toLowerCase();
  const title = (node.title ?? '').toLowerCase();
  const keywords = (node.keywords ?? '').toLowerCase();
  const layer1 = (node.layer1 ?? '').toLowerCase();
  const altText = (node.alt_phrasings ?? []).join(' ').toLowerCase();

  let score = 0;
  if (title === t) score += 10;
  else if (title.startsWith(t)) score += 6;
  else if (title.includes(t)) score += 4;
  if (altText.includes(t)) score += 5;
  if (keywords.includes(t)) score += 3;
  if (layer1.includes(t)) score += 1;
  return score;
}

export function useNodeSearch() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = useQuery({
    queryKey: ['node-search', query, selectedCategory],
    queryFn: async () => {
      let q = supabase
        .from('nodes')
        .select('id, title, category, layer1, keywords, alt_phrasings')
        .eq('published', true)
        .order('updated_at', { ascending: false });

      if (selectedCategory) {
        q = q.eq('category', selectedCategory);
      }

      if (query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(`title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term},alt_phrasings::text.ilike.${term}`);
      }

      q = q.limit(50);

      const { data, error } = await q;
      if (error) throw error;
      return data as NodeSearchResult[];
    },
    enabled: query.trim().length > 0 || selectedCategory !== null,
  });

  // Apply client-side relevance ranking
  const rankedResults = useMemo(() => {
    const raw = searchResults.data ?? [];
    const term = query.trim();
    if (!term) return raw;
    return [...raw].sort((a, b) => scoreResult(b, term) - scoreResult(a, term));
  }, [searchResults.data, query]);

  const categories = useQuery({
    queryKey: ['node-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('category')
        .eq('published', true)
        .not('category', 'is', null);

      if (error) throw error;
      const unique = [...new Set(data.map(d => d.category).filter(Boolean))] as string[];
      return unique.sort();
    },
  });

  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedCategory(null);
  }, []);

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results: rankedResults,
    isSearching: searchResults.isLoading,
    categories: categories.data ?? [],
    clearSearch,
    hasActiveSearch: query.trim().length > 0 || selectedCategory !== null,
  };
}
