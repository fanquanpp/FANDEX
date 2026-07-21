/**
 * 学习进度类型定义
 *
 * 描述用户在 FANDEX 中的学习进度数据结构，包括单篇文档进度、学习笔记、
 * 模块级汇总与全局汇总。所有进度数据可导出为 JSON 包用于备份与迁移。
 */

/** 文档阅读状态 */
export type DocStatus = 'not-started' | 'in-progress' | 'completed';

/** 单篇文档的学习进度 */
export interface DocProgress {
  /** 文档 slug */
  docSlug: string;
  /** 阅读状态 */
  status: DocStatus;
  /** 阅读进度百分比（0-100） */
  progress: number;
  /** 阅读时长（秒） */
  timeSpentSeconds: number;
  /** 最后阅读位置（CSS selector 或字符偏移） */
  lastPosition?: string;
  /** 是否标记为书签 */
  bookmarked: boolean;
  /** 笔记列表 */
  notes: ProgressNote[];
  /** 首次访问时间 */
  firstVisitedAt: Date;
  /** 最后访问时间 */
  lastVisitedAt: Date;
}

/** 学习笔记 */
export interface ProgressNote {
  /** 笔记 ID */
  id: string;
  /** 笔记内容 */
  content: string;
  /** 关联的文档位置 */
  anchor?: string;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/** 学习进度汇总 */
export interface ProgressSummary {
  /** 总文档数 */
  totalDocs: number;
  /** 已完成文档数 */
  completedDocs: number;
  /** 进行中文档数 */
  inProgressDocs: number;
  /** 总阅读时长（秒） */
  totalTimeSpentSeconds: number;
  /** 连续打卡天数 */
  streakDays: number;
  /** 最后学习日期 */
  lastStudyDate: Date;
  /** 模块进度明细 */
  moduleProgress: ModuleProgress[];
}

/** 模块级学习进度 */
export interface ModuleProgress {
  /** 模块 ID */
  moduleId: string;
  /** 文档总数 */
  totalDocs: number;
  /** 已完成文档数 */
  completedDocs: number;
  /** 进行中文档数 */
  inProgressDocs: number;
  /** 模块完成度百分比（0-100） */
  completionRate: number;
  /** 习题总数 */
  totalExercises: number;
  /** 已完成习题数 */
  completedExercises: number;
  /** 平均得分（0-100） */
  averageScore: number;
  /** 最后访问时间 */
  lastVisitedAt?: Date;
}

/** 学习进度导出包 */
export interface ProgressExport {
  /** 导出格式版本 */
  version: string;
  /** 导出时间 */
  exportedAt: Date;
  /** 文档进度列表 */
  docs: DocProgress[];
  /** 进度汇总 */
  summary: ProgressSummary;
}
