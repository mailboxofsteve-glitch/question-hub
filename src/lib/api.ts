/**
 * Platform-agnostic API abstraction layer.
 * 
 * All data access goes through this module. Swap the implementation
 * (REST, GraphQL, Supabase, Firebase, etc.) without touching consumers.
 * 
 * Currently returns mock data. Wire to a real backend when ready.
 */

import type { QuestionNode, PaginatedResponse } from '@/types';

// --- Abstract interface (implement per backend) ---

export interface ApiClient {
  questions: {
    list(params?: { page?: number; pageSize?: number; tag?: string }): Promise<PaginatedResponse<QuestionNode>>;
    getById(id: string): Promise<QuestionNode | null>;
    create(data: Omit<QuestionNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<QuestionNode>;
    update(id: string, data: Partial<QuestionNode>): Promise<QuestionNode>;
    delete(id: string): Promise<void>;
  };
}

// --- Mock implementation ---

const MOCK_QUESTIONS: QuestionNode[] = [
  {
    id: '1',
    title: 'What is the best way to structure a growing React app?',
    body: 'Looking for patterns that scale beyond a few components...',
    tags: ['architecture', 'react', 'scaling'],
    parentId: null,
    childIds: ['2'],
    createdAt: '2026-02-10T12:00:00Z',
    updatedAt: '2026-02-10T12:00:00Z',
    authorId: 'user-1',
    status: 'published',
    metadata: {},
  },
  {
    id: '2',
    title: 'How do feature folders compare to layer-based folders?',
    body: 'Feature folders group by domain, layer folders group by type...',
    tags: ['architecture', 'file-structure'],
    parentId: '1',
    childIds: [],
    createdAt: '2026-02-10T14:00:00Z',
    updatedAt: '2026-02-10T14:00:00Z',
    authorId: 'user-2',
    status: 'published',
    metadata: {},
  },
  {
    id: '3',
    title: 'When should you introduce a state management library?',
    body: 'React context works for many cases, but at what scale does it break down?',
    tags: ['state-management', 'react'],
    parentId: null,
    childIds: [],
    createdAt: '2026-02-11T09:00:00Z',
    updatedAt: '2026-02-11T09:00:00Z',
    authorId: 'user-1',
    status: 'published',
    metadata: {},
  },
];

export const api: ApiClient = {
  questions: {
    async list(params) {
      const page = params?.page ?? 1;
      const pageSize = params?.pageSize ?? 10;
      let filtered = [...MOCK_QUESTIONS];
      if (params?.tag) {
        filtered = filtered.filter(q => q.tags.includes(params.tag!));
      }
      return {
        data: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        page,
        pageSize,
        hasMore: page * pageSize < filtered.length,
      };
    },
    async getById(id) {
      return MOCK_QUESTIONS.find(q => q.id === id) ?? null;
    },
    async create(data) {
      const now = new Date().toISOString();
      return { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
    },
    async update(id, data) {
      const existing = MOCK_QUESTIONS.find(q => q.id === id);
      if (!existing) throw new Error(`Question ${id} not found`);
      return { ...existing, ...data, updatedAt: new Date().toISOString() };
    },
    async delete(_id) {
      // no-op in mock
    },
  },
};
