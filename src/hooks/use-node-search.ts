import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NodeSearchResult {
  id: string;
  title: string;
  category: string | null;
  layer1: string | null;
  keywords: string | null;
}

export function useNodeSearch() {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const searchResults = useQuery({
    queryKey: ['node-search', query, selectedCategory],
    queryFn: async () => {
      let q = supabase
        .from('nodes')
        .select('id, title, category, layer1, keywords')
        .eq('published', true)
        .order('updated_at', { ascending: false });

      if (selectedCategory) {
        q = q.eq('category', selectedCategory);
      }

      if (query.trim()) {
        const term = `%${query.trim()}%`;
        q = q.or(`title.ilike.${term},keywords.ilike.${term},layer1.ilike.${term}`);
      }

      q = q.limit(20);

      const { data, error } = await q;
      if (error) throw error;
      return data as NodeSearchResult[];
    },
    enabled: query.trim().length > 0 || selectedCategory !== null,
  });

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
    results: searchResults.data ?? [],
    isSearching: searchResults.isLoading,
    categories: categories.data ?? [],
    clearSearch,
    hasActiveSearch: query.trim().length > 0 || selectedCategory !== null,
  };
}
