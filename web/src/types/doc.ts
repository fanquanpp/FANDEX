/**
 * 文档相关类型定义
 *
 * 描述 FANDEX 知识库中每篇文档的元数据、正文内容与大纲结构。
 * 文档是知识传递的最小单元，归属于某个模块。
 */

import type { Difficulty } from './module';

/** 文档元数据（对应 frontmatter） */
export interface Doc {
  /** 文档 slug（如 'cpp/指针'） */
  slug: string;
  /** 文档标题 */
  title: string;
  /** 所属模块 ID */
  module: string;
  /** 文档分类 */
  category?: string;
  /** 难度等级 */
  difficulty?: Difficulty;
  /** 排序权重 */
  order: number;
  /** 作者 */
  author: string;
  /** 文档描述 */
  description?: string;
  /** 标签 */
  tags: string[];
  /** 预估阅读时长（分钟） */
  estimatedReadingTime?: number;
  /** 创建日期 */
  created?: Date;
  /** 最后更新日期 */
  updated?: Date;
  /** 最后审阅日期 */
  lastReviewed?: Date;
  /** 审阅人 */
  reviewer?: string;
  /** 学习目标（Bloom 分类法） */
  learningObjectives: string[];
  /** 前置文档 slug 列表 */
  prerequisites: string[];
  /** 关联文档 slug 列表 */
  related: string[];
  /** 词源说明（计算机术语的英文原词与词源） */
  etymology?: EtymologyEntry[];
}

/** 词源条目 */
export interface EtymologyEntry {
  /** 中文术语 */
  term: string;
  /** 英文原词 */
  english: string;
  /** 词源说明 */
  origin: string;
}

/** 文档正文内容（渲染后） */
export interface DocContent {
  /** 文档 slug */
  slug: string;
  /** 渲染后的 HTML 内容 */
  html: string;
  /** 文档大纲（标题树） */
  outline: OutlineItem[];
  /** 文档字数 */
  wordCount: number;
}

/** 大纲项 */
export interface OutlineItem {
  /** 标题锚点 ID */
  id: string;
  /** 标题文本 */
  text: string;
  /** 标题层级（1-6） */
  level: number;
  /** 子标题列表 */
  children: OutlineItem[];
}
