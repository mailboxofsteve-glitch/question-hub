import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useQuestions(params?: { tag?: string }) {
  return useQuery({
    queryKey: ['questions', params],
    queryFn: () => api.questions.list(params),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => api.questions.getById(id),
    enabled: !!id,
  });
}
