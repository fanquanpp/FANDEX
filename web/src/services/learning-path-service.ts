/**
 * 学习路径服务
 *
 * 功能概述：
 * 基于静态 learning-paths.json 数据，提供职业学习路径的查询、进度聚合与推荐能力。
 * 与 progress-service 协作，结合用户当前进度生成个性化路径推荐。
 *
 * 设计原则：
 * - 单一职责：仅处理路径相关业务，不直接操作存储（通过 progress-service 读取进度）
 * - SSR 安全：纯数据查询函数可在 SSR 阶段安全调用；异步函数在 SSR 阶段返回空值
 * - 类型严格：无 any/unknown，所有类型显式声明
 * - 无循环依赖：仅依赖 learning-paths.json、progress-service、module-service
 */

import learningPathsData from '@/data/learning-paths.json';
import { getModule } from './module-service';
import { getProgressStats } from './progress-service';

/** 模块优先级（必学 / 推荐 / 可选） */
export type ModulePriority = 'required' | 'recommended' | 'optional';

/** JSON 数据结构（用于类型校验） */
interface LearningPathJSON {
  readonly name: string;
  readonly description: string;
  readonly icon: string;
  readonly modules: ReadonlyArray<{
    readonly moduleId: string;
    readonly estimatedHours: number;
    readonly priority: string;
    readonly dependsOn: readonly string[];
  }>;
}

/** 学习路径模块定义 */
export interface PathModule {
  /** 模块 ID */
  moduleId: string;
  /** 预计学习时长（小时） */
  estimatedHours: number;
  /** 优先级 */
  priority: ModulePriority;
  /** 前置依赖模块 ID 列表 */
  dependsOn: string[];
}

/** 学习路径定义 */
export interface LearningPath {
  /** 路径 ID（如 'frontend'） */
  id: string;
  /** 路径显示名称 */
  name: string;
  /** 路径描述 */
  description: string;
  /** 路径图标（缩写文本） */
  icon: string;
  /** 包含的模块列表（按推荐学习顺序排列） */
  modules: PathModule[];
}

/** 路径进度聚合结果 */
export interface PathProgress {
  /** 路径 ID */
  pathId: string;
  /** 路径名称 */
  pathName: string;
  /** 必学模块总数 */
  requiredTotal: number;
  /** 必学模块已完成数 */
  requiredCompleted: number;
  /** 全部模块总数 */
  totalModules: number;
  /** 全部模块已完成数 */
  completedModules: number;
  /** 进行中模块数 */
  inProgressModules: number;
  /** 完成度百分比（0-100，按必学模块加权） */
  completionRate: number;
  /** 预计总学习时长（小时） */
  totalEstimatedHours: number;
  /** 各模块进度明细 */
  modules: PathModuleProgress[];
}

/** 路径中单个模块的进度明细 */
export interface PathModuleProgress {
  /** 模块 ID */
  moduleId: string;
  /** 模块标题（来自 module-service 元数据） */
  moduleTitle: string;
  /** 模块描述 */
  moduleDescription: string;
  /** 优先级 */
  priority: ModulePriority;
  /** 预计学习时长（小时） */
  estimatedHours: number;
  /** 前置依赖模块 ID 列表 */
  dependsOn: string[];
  /** 模块内文档总数 */
  totalDocs: number;
  /** 已完成文档数 */
  completedDocs: number;
  /** 进行中文档数 */
  inProgressDocs: number;
  /** 模块完成度百分比（0-100） */
  completionRate: number;
  /** 是否已解锁（前置依赖全部完成） */
  unlocked: boolean;
}

/**
 * 校验并转换 JSON 字符串优先级为枚举类型
 * @param value - JSON 中的原始字符串
 * @returns 标准化后的优先级；未识别时回退为 'optional'
 */
function normalizePriority(value: string): ModulePriority {
  if (value === 'required' || value === 'recommended' || value === 'optional') {
    return value;
  }
  return 'optional';
}

/**
 * 将 JSON 原始数据转换为 LearningPath 类型
 * @param id - 路径 ID
 * @param data - JSON 原始数据
 * @returns 类型安全的学习路径对象
 */
function parseLearningPath(id: string, data: LearningPathJSON): LearningPath {
  return {
    id,
    name: data.name,
    description: data.description,
    icon: data.icon,
    modules: data.modules.map((m) => ({
      moduleId: m.moduleId,
      estimatedHours: m.estimatedHours,
      priority: normalizePriority(m.priority),
      dependsOn: [...m.dependsOn],
    })),
  };
}

/**
 * 获取全部学习路径
 * @returns 学习路径数组（按 JSON 中 key 顺序）
 */
export function getAllPaths(): LearningPath[] {
  const entries = Object.entries(learningPathsData) as Array<[string, LearningPathJSON]>;
  return entries.map(([id, data]) => parseLearningPath(id, data));
}

/**
 * 根据 ID 获取单个学习路径
 * @param id - 路径 ID
 * @returns 学习路径；未找到时返回 undefined
 */
export function getPath(id: string): LearningPath | undefined {
  const data = (learningPathsData as Record<string, LearningPathJSON>)[id];
  if (!data) return undefined;
  return parseLearningPath(id, data);
}

/**
 * 计算指定路径的进度聚合
 * @param pathId - 路径 ID
 * @returns 路径进度；路径不存在或异常时返回零值
 */
export async function getPathProgress(pathId: string): Promise<PathProgress> {
  const path = getPath(pathId);
  if (!path) {
    return {
      pathId,
      pathName: '',
      requiredTotal: 0,
      requiredCompleted: 0,
      totalModules: 0,
      completedModules: 0,
      inProgressModules: 0,
      completionRate: 0,
      totalEstimatedHours: 0,
      modules: [],
    };
  }

  try {
    const stats = await getProgressStats();
    // 构建模块进度映射，便于查询
    const moduleProgressMap = new Map<
      string,
      { total: number; completed: number; inProgress: number }
    >();
    for (const mp of stats.moduleProgress) {
      moduleProgressMap.set(mp.moduleId, {
        total: mp.total,
        completed: mp.completed,
        inProgress: mp.inProgress,
      });
    }

    // 已完成模块集合（completionRate === 100 或 completed > 0 且 completed >= total）
    const completedModuleIds = new Set<string>();
    for (const mp of stats.moduleProgress) {
      if (mp.total > 0 && mp.completed >= mp.total) {
        completedModuleIds.add(mp.moduleId);
      }
    }

    const moduleProgressList: PathModuleProgress[] = path.modules.map((pm) => {
      const moduleMeta = getModule(pm.moduleId);
      const progress = moduleProgressMap.get(pm.moduleId);
      const total = progress?.total ?? 0;
      const completed = progress?.completed ?? 0;
      const inProgress = progress?.inProgress ?? 0;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      // 模块解锁条件：所有前置依赖均已完成
      const unlocked =
        pm.dependsOn.length === 0 || pm.dependsOn.every((dep) => completedModuleIds.has(dep));

      return {
        moduleId: pm.moduleId,
        moduleTitle: moduleMeta?.title ?? pm.moduleId,
        moduleDescription: moduleMeta?.description ?? '',
        priority: pm.priority,
        estimatedHours: pm.estimatedHours,
        dependsOn: pm.dependsOn,
        totalDocs: total,
        completedDocs: completed,
        inProgressDocs: inProgress,
        completionRate,
        unlocked,
      };
    });

    // 统计必学模块完成情况
    const requiredModules = moduleProgressList.filter((m) => m.priority === 'required');
    const requiredCompleted = requiredModules.filter(
      (m) => m.completionRate === 100 || completedModuleIds.has(m.moduleId)
    ).length;

    const completedModules = moduleProgressList.filter(
      (m) => m.completionRate === 100 || completedModuleIds.has(m.moduleId)
    ).length;
    const inProgressModules = moduleProgressList.filter(
      (m) => m.completionRate > 0 && m.completionRate < 100
    ).length;
    const totalEstimatedHours = path.modules.reduce((sum, m) => sum + m.estimatedHours, 0);

    // 完成度按必学模块加权（必学权重 1.0，推荐 0.5，可选 0.2）
    const weightedTotal = path.modules.reduce((sum, m) => {
      const weight = m.priority === 'required' ? 1 : m.priority === 'recommended' ? 0.5 : 0.2;
      return sum + weight;
    }, 0);
    const weightedDone = moduleProgressList.reduce((sum, m) => {
      const weight = m.priority === 'required' ? 1 : m.priority === 'recommended' ? 0.5 : 0.2;
      const done = m.completionRate === 100 || completedModuleIds.has(m.moduleId) ? weight : 0;
      return sum + done;
    }, 0);
    const completionRate = weightedTotal > 0 ? Math.round((weightedDone / weightedTotal) * 100) : 0;

    return {
      pathId,
      pathName: path.name,
      requiredTotal: requiredModules.length,
      requiredCompleted,
      totalModules: path.modules.length,
      completedModules,
      inProgressModules,
      completionRate,
      totalEstimatedHours,
      modules: moduleProgressList,
    };
  } catch {
    // 异常时返回零值进度
    return {
      pathId,
      pathName: path.name,
      requiredTotal: path.modules.filter((m) => m.priority === 'required').length,
      requiredCompleted: 0,
      totalModules: path.modules.length,
      completedModules: 0,
      inProgressModules: 0,
      completionRate: 0,
      totalEstimatedHours: path.modules.reduce((sum, m) => sum + m.estimatedHours, 0),
      modules: path.modules.map((pm) => {
        const moduleMeta = getModule(pm.moduleId);
        return {
          moduleId: pm.moduleId,
          moduleTitle: moduleMeta?.title ?? pm.moduleId,
          moduleDescription: moduleMeta?.description ?? '',
          priority: pm.priority,
          estimatedHours: pm.estimatedHours,
          dependsOn: pm.dependsOn,
          totalDocs: 0,
          completedDocs: 0,
          inProgressDocs: 0,
          completionRate: 0,
          unlocked: pm.dependsOn.length === 0,
        };
      }),
    };
  }
}

/**
 * 基于用户当前进度推荐最匹配的学习路径
 * 推荐策略：
 * 1. 找出"进行中"模块最多的路径
 * 2. 若多条路径并列，选择完成度最高的
 * 3. 若所有路径均无进度，返回 undefined（让用户自行选择）
 * @returns 推荐的学习路径；无可推荐时返回 undefined
 */
export async function getRecommendedPath(): Promise<LearningPath | undefined> {
  try {
    const allPaths = getAllPaths();
    if (allPaths.length === 0) return undefined;

    const progressList = await Promise.all(
      allPaths.map(async (p) => ({
        path: p,
        progress: await getPathProgress(p.id),
      }))
    );

    // 过滤掉完全没有进度的路径
    const candidates = progressList.filter(
      (item) => item.progress.completedModules > 0 || item.progress.inProgressModules > 0
    );

    if (candidates.length === 0) return undefined;

    // 按"进行中模块数 → 完成模块数 → 完成度"排序
    candidates.sort((a, b) => {
      if (b.progress.inProgressModules !== a.progress.inProgressModules) {
        return b.progress.inProgressModules - a.progress.inProgressModules;
      }
      if (b.progress.completedModules !== a.progress.completedModules) {
        return b.progress.completedModules - a.progress.completedModules;
      }
      return b.progress.completionRate - a.progress.completionRate;
    });

    const top = candidates[0];
    return top?.path;
  } catch {
    return undefined;
  }
}
