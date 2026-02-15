import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

export interface NodeSearchResult {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
  relevance?: string;
}

export interface SearchResponse {
  query: string;
  nodes: NodeSearchResult[];
  summary: string | null;
}

export function useNodeSearch() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = useQuery({
    queryKey: ['node-search', query, selectedCategory],
    queryFn: async (): Promise<SearchResponse> => {
      const { data, error } = await supabase.functions.invoke('api-answer', {
        body: {
          query: query.trim(),
          category: selectedCategory ?? undefined,
          limit: 50,
        },
      });

      if (error) throw error;
      return data as SearchResponse;
    },
    enabled: query.trim().length > 0 || selectedCategory !== null,
  });

  // Track search events (debounced — fires after 1s of no typing)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      trackEvent('search', null, { query: trimmed, result_count: searchResults.data?.nodes?.length ?? 0 });
    }, 1000);
    return () => clearTimeout(searchTimerRef.current);
  }, [query, searchResults.data?.nodes?.length]);

  const results = useMemo(() => searchResults.data?.nodes ?? [], [searchResults.data]);
  const summary = useMemo(() => searchResults.data?.summary ?? null, [searchResults.data]);

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
    results,
    summary,
    isSearching: searchResults.isLoading,
    categories: categories.data ?? [],
    clearSearch,
    hasActiveSearch: query.trim().length > 0 || selectedCategory !== null,
  };
}
