/**
 * 算法题图鉴数据聚合入口
 * -----------------------------------------------------------------------------
 * 汇总各分组题目文件并对外提供分类注册表与查询工具，
 * 页面在构建期静态消费本模块，不产生任何运行时 IO。
 */
import type { AlgoCategoryId, AlgoDifficulty, AlgoProblem } from './types';
import { BASIC_PROBLEMS } from './part-basics';
import { LINEAR_PROBLEMS } from './part-linear';
import { TREE_PROBLEMS } from './part-tree';
import { ENUM_PROBLEMS } from './part-enum';
import { DP_PROBLEMS } from './part-dp';
import { GRAPH_PROBLEMS } from './part-graph';

export type { AlgoCategoryId, AlgoDifficulty, AlgoProblem } from './types';

/** 分类元数据（图鉴筛选栏与卡片角标的展示信息） */
export interface AlgoCategoryMeta {
  /** 分类 ID */
  id: AlgoCategoryId;
  /** 中文标签 */
  label: string;
  /** 英文标签（辅助说明） */
  en: string;
  /** 一句话定位说明 */
  desc: string;
}

/**
 * 题目分类注册表（顺序即列表页分类芯片的展示顺序）
 * 按学习曲线排布：数组/窗口/二分等基础技巧在前，图论与设计收尾
 */
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

/** 难度中文标签 */
export const DIFFICULTY_LABELS: Record<AlgoDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

/** 难度展示顺序（图鉴难度芯片的排布） */
export const DIFFICULTY_ORDER: AlgoDifficulty[] = ['easy', 'medium', 'hard'];

/** 全部题目：按分组文件顺序拼接，组内即编写顺序（由易到难） */
export const ALGO_PROBLEMS: AlgoProblem[] = [
  ...BASIC_PROBLEMS,
  ...LINEAR_PROBLEMS,
  ...TREE_PROBLEMS,
  ...ENUM_PROBLEMS,
  ...DP_PROBLEMS,
  ...GRAPH_PROBLEMS,
];

/** 题库来源模块（详情页关联教程的链接前缀） */
export const ALGO_MODULE_ID = 'algorithm';

/** 按分类统计题量（列表页分类芯片角标） */
export function countByCategory(): Record<AlgoCategoryId, number> {
  const counts = {} as Record<AlgoCategoryId, number>;
  for (const cat of ALGO_CATEGORIES) counts[cat.id] = 0;
  for (const p of ALGO_PROBLEMS) counts[p.category] += 1;
  return counts;
}

/** 按难度统计题量（页头统计区） */
export function countByDifficulty(): Record<AlgoDifficulty, number> {
  const counts: Record<AlgoDifficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const p of ALGO_PROBLEMS) counts[p.difficulty] += 1;
  return counts;
}

/** 按 slug 查找题目（详情页 getStaticPaths 消费） */
export function getAlgoProblem(slug: string): AlgoProblem | undefined {
  return ALGO_PROBLEMS.find((p) => p.slug === slug);
}

/** 题目在全库中的序号（详情页「第 N / M 题」展示） */
export function getProblemIndex(slug: string): number {
  return ALGO_PROBLEMS.findIndex((p) => p.slug === slug);
}
