import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { trackEvent } from '@/lib/analytics';

export interface NodeSearchResult {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
  alt_phrasings: string[] | null;
  search_blob: string | null;
  relevance?: string | null;
}

export interface SearchResponse {
  query: string;
  nodes: NodeSearchResult[];
  summary: string | null;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export function useNodeSearch() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = useQuery<SearchResponse>({
    queryKey: ['node-search', query, selectedCategory],
    queryFn: async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/api-answer`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            query: query.trim(),
            category: selectedCategory,
            limit: 50,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }

        return await res.json();
      } catch (error) {
        console.error('Search error:', error);
        throw error;
      }
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

  // Categories remain a lightweight direct query
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

  const results = searchResults.data?.nodes ?? [];

  return {
    query,
    setQuery,
    selectedCategory,
    setSelectedCategory,
    results,
    summary: searchResults.data?.summary ?? null,
    isSearching: searchResults.isLoading,
    categories: categories.data ?? [],
    clearSearch,
    hasActiveSearch: query.trim().length > 0 || selectedCategory !== null,
  };
}
