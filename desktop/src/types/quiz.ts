/**
 * 测验（Quiz）共享类型定义
 *
 * 功能概述：
 * - 定义 FANDEX 学习平台中三种题型的统一类型系统
 * - 采用 TypeScript discriminated union 模式实现类型安全的多态
 * - 与 Zod 校验 schema 兼容（可通过 z.discriminatedUnion 直接对接）
 *
 * 题型设计：
 * - fill：填空题，用户输入文本与标准答案比对
 * - choice：选择题，支持单选与多选
 * - correct：判断正误题，可附加修正说明
 *
 * 使用示例：
 *   import type { Quiz, QuizFill } from '@/types/quiz';
 *   const q: Quiz = { type: 'fill', question: '...', answer: '...' };
 *   if (q.type === 'fill') {
 *     // 此处 q 类型收窄为 QuizFill
 *     console.log(q.answer);
 *   }
 */

/**
 * 填空题类型
 *
 * 字段说明：
 * - type：题型标识（固定为 'fill'，用作 discriminated union 的判别字段）
 * - question：题干文本
 * - answer：标准答案（字符串，比对时通常忽略大小写与首尾空白）
 * - explanation：答案解释（可选，作答后展示）
 */
export interface QuizFill {
  /** 题型标识（discriminated union 判别字段） */
  type: 'fill';
  /** 题干文本 */
  question: string;
  /** 标准答案 */
  answer: string;
  /** 答案解释（可选） */
  explanation?: string;
}

/**
 * 选择题类型
 *
 * 字段说明：
 * - type：题型标识（固定为 'choice'）
 * - question：题干文本
 * - options：选项数组（按顺序展示，索引从 0 开始）
 * - answer：正确答案索引（单选为 number，多选为 number[]）
 * - explanation：答案解释（可选）
 * - multiple：是否多选（默认 false，单选）
 */
export interface QuizChoice {
  /** 题型标识（discriminated union 判别字段） */
  type: 'choice';
  /** 题干文本 */
  question: string;
  /** 选项数组 */
  options: string[];
  /** 正确答案索引（单选为 number，多选为 number[] 升序） */
  answer: number | number[];
  /** 答案解释（可选） */
  explanation?: string;
  /** 是否多选（默认 false） */
  multiple?: boolean;
}

/**
 * 判断正误题类型
 *
 * 字段说明：
 * - type：题型标识（固定为 'correct'）
 * - question：题干文本（通常为陈述句）
 * - isCorrect：题目陈述是否正确
 * - correction：若题目陈述错误，给出修正说明（可选）
 * - explanation：答案解释（可选）
 */
export interface QuizCorrect {
  /** 题型标识（discriminated union 判别字段） */
  type: 'correct';
  /** 题干文本（陈述句） */
  question: string;
  /** 题目陈述是否正确 */
  isCorrect: boolean;
  /** 修正说明（仅当 isCorrect 为 false 时有意义） */
  correction?: string;
  /** 答案解释（可选） */
  explanation?: string;
}

/**
 * 测验题目联合类型
 *
 * 通过 type 字段进行 discriminated union 收窄，确保类型安全：
 * - type === 'fill' → QuizFill
 * - type === 'choice' → QuizChoice
 * - type === 'correct' → QuizCorrect
 */
export type Quiz = QuizFill | QuizChoice | QuizCorrect;

/**
 * 用户作答结果类型
 *
 * 用于记录用户在某道题上的作答与判定结果，便于进度追踪与统计。
 */
export interface QuizAttempt {
  /** 关联的题目（快照，避免后续修改题目影响历史记录） */
  quiz: Quiz;
  /** 用户作答内容（题型相关，需根据 quiz.type 解析） */
  userAnswer: string | number | number[] | boolean;
  /** 是否回答正确 */
  isCorrect: boolean;
  /** 作答时间戳（ms） */
  timestamp: number;
}
