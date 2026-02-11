/**
 * Core domain types for the Question Node platform.
 * Keep these decoupled from any ORM or backend framework.
 */

export interface QuestionNode {
  id: string;
  title: string;
  body: string;
  tags: string[];
  parentId: string | null;
  childIds: string[];
  createdAt: string;
  updatedAt: string;
  authorId: string;
  status: QuestionStatus;
  metadata: Record<string, unknown>;
}

export type QuestionStatus = 'draft' | 'published' | 'archived';

export interface QuestionEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: EdgeRelation;
  createdAt: string;
}

export type EdgeRelation = 'related' | 'depends_on' | 'answers' | 'extends';

export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
