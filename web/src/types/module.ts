/**
 * 模块相关类型定义
 *
 * 描述 FANDEX 知识体系中模块（如 C++、算法、Git 等）的元数据与统计信息。
 * 模块是顶层组织单元，每个模块包含若干文档与习题。
 */

/** 模块难度等级 */
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

/** 模块元数据 */
export interface Module {
  /** 模块唯一标识（如 'cpp'、'algorithm'） */
  id: string;
  /** 模块显示名称（中文） */
  name: string;
  /** 模块所属类别（如 '开发语言'、'计算机科学'） */
  category: string;
  /** 模块描述 */
  description: string;
  /** 模块图标（lucide 图标名或 SVG path） */
  icon?: string;
  /** 模块封面图 URL */
  cover?: string;
  /** 模块包含的文档数 */
  docCount: number;
  /** 模块排序权重 */
  order: number;
  /** 模块颜色（用于分类标识，HEX 格式） */
  color?: string;
  /** 前置模块 ID 列表 */
  prerequisites: string[];
  /** 关联模块 ID 列表 */
  related: string[];
  /** 模块标签 */
  tags: string[];
}

/** 模块统计信息 */
export interface ModuleStats {
  /** 模块 ID */
  moduleId: string;
  /** 文档总数 */
  totalDocs: number;
  /** 已完成文档数 */
  completedDocs: number;
  /** 进行中文档数 */
  inProgressDocs: number;
  /** 习题总数 */
  totalExercises: number;
  /** 已完成习题数 */
  completedExercises: number;
  /** 平均得分（0-100） */
  averageScore: number;
  /** 最后访问时间 */
  lastVisitedAt?: Date;
}
