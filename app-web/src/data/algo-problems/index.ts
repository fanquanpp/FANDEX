import type { AlgoCategoryId, AlgoDifficulty, AlgoProblem } from './types';
import { BASIC_PROBLEMS } from './part-basics';
import { LINEAR_PROBLEMS } from './part-linear';
import { TREE_PROBLEMS } from './part-tree';
import { ENUM_PROBLEMS } from './part-enum';
import { DP_PROBLEMS } from './part-dp';
import { GRAPH_PROBLEMS } from './part-graph';

export type { AlgoCategoryId, AlgoDifficulty, AlgoProblem } from './types';

export interface AlgoCategoryMeta {
  id: AlgoCategoryId;
  label: string;
  en: string;
  desc: string;
}

export const ALGO_CATEGORIES: AlgoCategoryMeta[] = [
  { id: 'array', label: '数组与双指针', en: 'Two Pointers', desc: '原地操作与对向收缩的经典套路' },
  { id: 'window', label: '滑动窗口与前缀和', en: 'Sliding Window', desc: '连续子数组的定长与不定长扫描' },
  { id: 'binary-search', label: '二分查找', en: 'Binary Search', desc: '有序性边界与分段有序的二分变形' },
  { id: 'hash', label: '哈希表', en: 'Hash Table', desc: '以空间换时间的查找与分组' },
  { id: 'linked-list', label: '链表', en: 'Linked List', desc: '指针操作与快慢指针技巧' },
  { id: 'stack-queue', label: '栈与队列', en: 'Stack & Queue', desc: '括号匹配与单调栈/单调队列' },
  { id: 'string', label: '字符串', en: 'String', desc: '模拟、匹配与 KMP' },
  { id: 'tree', label: '二叉树', en: 'Binary Tree', desc: '递归遍历与树的构造校验' },
  { id: 'heap', label: '堆与优先队列', en: 'Heap', desc: 'Top-K 与动态数据流的有序维护' },
  { id: 'backtrack', label: '回溯', en: 'Backtracking', desc: '排列组合子集的系统性枚举' },
  { id: 'greedy', label: '贪心', en: 'Greedy', desc: '局部最优推全局最优的证明套路' },
  { id: 'dp', label: '动态规划', en: 'Dynamic Programming', desc: '状态设计与转移方程的核心考题' },
  { id: 'graph', label: '图论', en: 'Graph', desc: 'BFS/DFS、拓扑排序与最短路' },
  { id: 'design', label: '设计与位运算', en: 'Design & Bits', desc: '工程结构设计与位技巧' },
];

export const DIFFICULTY_LABELS: Record<AlgoDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

export const DIFFICULTY_ORDER: AlgoDifficulty[] = ['easy', 'medium', 'hard'];

export const ALGO_PROBLEMS: AlgoProblem[] = [
  ...BASIC_PROBLEMS,
  ...LINEAR_PROBLEMS,
  ...TREE_PROBLEMS,
  ...ENUM_PROBLEMS,
  ...DP_PROBLEMS,
  ...GRAPH_PROBLEMS,
];

export const ALGO_MODULE_ID = 'algorithm';

export function countByCategory(): Record<AlgoCategoryId, number> {
  const counts = {} as Record<AlgoCategoryId, number>;
  for (const cat of ALGO_CATEGORIES) counts[cat.id] = 0;
  for (const p of ALGO_PROBLEMS) counts[p.category] += 1;
  return counts;
}

export function countByDifficulty(): Record<AlgoDifficulty, number> {
  const counts: Record<AlgoDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of ALGO_PROBLEMS) counts[p.difficulty] += 1;
  return counts;
}

export function getAlgoProblem(slug: string): AlgoProblem | undefined {
  return ALGO_PROBLEMS.find((p) => p.slug === slug);
}

export function getProblemIndex(slug: string): number {
  return ALGO_PROBLEMS.findIndex((p) => p.slug === slug);
}
