import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export interface AnswerResult {
  id: string;
  title: string;
  layer1: string;
  score: number;
}

interface AnswerResponse {
  query: string;
  results: AnswerResult[];
  meta: { took_ms: number; count: number };
}

async function fetchAnswer(question: string): Promise<AnswerResponse> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/answer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Search failed');
  }
  return res.json();
}

export function useAnswerSearch() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // 300ms debounce
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setDebouncedQuery('');
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ['answer-search', debouncedQuery],
    queryFn: () => fetchAnswer(debouncedQuery),
    enabled: debouncedQuery.length > 0,
  });

  const clearSearch = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    query,
    setQuery,
    results: data?.results ?? [],
    isSearching: isLoading && debouncedQuery.length > 0,
    clearSearch,
    hasActiveSearch: debouncedQuery.length > 0,
    meta: data?.meta,
  };
}
