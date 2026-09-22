
export type AlgoDifficulty = 'easy' | 'medium' | 'hard';

export type AlgoCategoryId =
  | 'array'
  | 'window'
  | 'binary-search'
  | 'linked-list'
  | 'stack-queue'
  | 'hash'
  | 'tree'
  | 'heap'
  | 'backtrack'
  | 'greedy'
  | 'dp'
  | 'graph'
  | 'string'
  | 'design';

export interface AlgoProblem {
  slug: string;
  lc?: number;
  title: string;
  titleEn: string;
  difficulty: AlgoDifficulty;
  category: AlgoCategoryId;
  tags: string[];
  brief: string;
  statement: string;
  idea: string[];
  code: string;
  time: string;
  space: string;
  related?: string[];
}
