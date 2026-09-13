/**
 * 算法题图鉴数据类型定义
 * -----------------------------------------------------------------------------
 * 题库为手工整理的经典算法题集合（以力扣题号为主线索），
 * 每题包含题意概括、分点思路讲解、Python 参考实现与复杂度标注，
 * 供题图鉴列表页与题目详情页在构建期静态消费。
 */

/** 难度等级：简单 / 中等 / 困难 */
export type AlgoDifficulty = 'easy' | 'medium' | 'hard';

/** 题目分类 ID（与 ALGO_CATEGORIES 注册表一一对应） */
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

/** 单道算法题的完整数据结构 */
export interface AlgoProblem {
  /** URL 标识（小写 kebab-case，全库唯一） */
  slug: string;
  /** 力扣题号（非力扣题源可省略） */
  lc?: number;
  /** 中文题名 */
  title: string;
  /** 英文题名 */
  titleEn: string;
  /** 难度等级 */
  difficulty: AlgoDifficulty;
  /** 所属分类 */
  category: AlgoCategoryId;
  /** 技法标签（双指针 / 单调栈 / 状态压缩等） */
  tags: string[];
  /** 一句话题意（列表卡片摘要） */
  brief: string;
  /**
   * 题意概括：以自己的语言复述题面（含示例与数据范围），
   * 使用空行分段，渲染时按段落拆分
   */
  statement: string;
  /** 思路讲解：按解题推进顺序分点 */
  idea: string[];
  /** Python 参考实现（含简要中文注释） */
  code: string;
  /** 时间复杂度标注（如 O(n)） */
  time: string;
  /** 空间复杂度标注（如 O(1)） */
  space: string;
  /** 关联教学文档（algorithm 模块文档 slug，详情页展示跳转链接） */
  related?: string[];
}
