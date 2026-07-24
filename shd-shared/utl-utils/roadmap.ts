/**
 * 路线图元数据共享访问层（三端统一数据源）
 * -----------------------------------------------------------------------------
 * 通过直接 JSON import 从 shd-shared/metadata/roadmap/ 读取阶段数据与职业路径，
 * 保证 web/desktop/android 三端使用统一的路线图数据源。
 *
 * 设计原则：
 * - 与 modules.ts 一致，使用 ES JSON import 兼容 Vite 与 Metro
 * - 类型严格：无 any，所有类型显式声明
 * - 冻结导出：数据导出使用 Object.freeze 防止运行时篡改
 *
 * 数据源：
 * - shd-shared/metadata/roadmap/phases.json       → 学习阶段（含模块顺序与依赖箭头）
 * - shd-shared/metadata/roadmap/career-paths.json → 职业路径（含步骤序列）
 */

// 从共享元数据 JSON 直接导入（Vite 与 Metro 均原生支持 JSON 解析）
import phasesData from '../metadata/roadmap/phases.json';
import careerPathsData from '../metadata/roadmap/career-paths.json';

// ============================================================
// 类型定义
// ============================================================

/** 路线图阶段项（单个模块在阶段中的位置） */
export interface RoadmapItem {
  /** 模块 ID */
  readonly id: string;
  /** 箭头方向（'right' | 'down' | null），指示下一个模块的排列方向 */
  readonly arrow: string | null;
}

/** 路线图阶段（一组按顺序学习的模块） */
export interface RoadmapPhase {
  /** 阶段标识（如 'Phase 0'） */
  readonly phase: string;
  /** 阶段标签（如 '编程准备'） */
  readonly label: string;
  /** 阶段描述 */
  readonly desc: string;
  /** 阶段颜色（十六进制） */
  readonly color: string;
  /** 阶段包含的模块项 */
  readonly items: readonly RoadmapItem[];
}

/** 职业路径步骤（路径中的一个学习节点） */
export interface CareerPathStep {
  /** 模块 ID */
  readonly id: string;
  /** 步骤显示标签 */
  readonly label: string;
}

/** 职业路径（按职业目标组织的学习路线） */
export interface CareerPath {
  /** 路径名称（如 '前端工程师'） */
  readonly label: string;
  /** 路径颜色（十六进制） */
  readonly color: string;
  /** 路径步骤序列 */
  readonly steps: readonly CareerPathStep[];
}

// ============================================================
// 数据导出
// ============================================================

/**
 * 学习阶段数据（冻结，防止运行时篡改）
 */
export const phases: readonly RoadmapPhase[] = Object.freeze(
  (phasesData as RoadmapPhase[]).map((p) => ({
    ...p,
    items: Object.freeze(p.items.map((i) => ({ ...i }))),
  })),
);

/**
 * 职业路径数据（冻结，防止运行时篡改）
 */
export const careerPaths: readonly CareerPath[] = Object.freeze(
  (careerPathsData as CareerPath[]).map((p) => ({
    ...p,
    steps: Object.freeze(p.steps.map((s) => ({ ...s }))),
  })),
);
