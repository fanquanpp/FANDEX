/**
 * 阅读进度管理高级 API（Phase 5）
 *
 * 功能概述：
 * - 基于 Phase 4 创建的 Zustand `progress-store` 与 IndexedDB `progress-persist` 封装
 * - 提供面向业务的高级 API：初始化、查询、设置、统计、最近文档、连续学习天数、清空
 * - 屏蔽底层 store 与持久化细节，简化调用方使用
 * - 兼容 SSR 环境（所有 API 在 SSR 下返回安全默认值）
 *
 * 设计要点：
 * - 不修改 Phase 4 创建的 store 文件，仅作为薄包装层
 * - 通过 `useProgressStore.getState()` 在非 React 上下文中调用 store
 * - 动态读取 store state，避免缓存导致的脏数据
 * - 所有异步函数使用 try-catch 错误处理
 *
 * 依赖关系：
 * - @/lib/store/progress-store：Zustand store（状态管理 + 持久化 + 跨标签页同步）
 * - @/lib/progress-persist：IndexedDB 双层持久化
 * - @/lib/constants：进度状态枚举
 *
 * 使用示例：
 *   import { initProgress, getDocProgress, setDocProgress, getOverallProgress } from '@/lib/progress';
 *   await initProgress();
 *   setDocProgress('frontend/javascript/概述', 'read');
 *   const overall = getOverallProgress();
 */

import type { ProgressStatus } from '@/lib/constants';
import { logger } from '@/lib/logger';
import { useProgressStore } from '@/lib/store/progress-store';

/** 模块进度统计类型 */
export interface ModuleProgress {
  /** 模块下文档总数 */
  total: number;
  /** 已读文档数 */
  read: number;
  /** 阅读中文档数 */
  reading: number;
  /** 未读文档数 */
  unread: number;
  /** 已读百分比（0-100） */
  percent: number;
}

/** 整体进度统计类型 */
export interface OverallProgress {
  /** 已记录的文档总数（即 progress 中的 key 数） */
  total: number;
  /** 已读文档数 */
  read: number;
  /** 阅读中文档数 */
  reading: number;
  /** 未读文档数 */
  unread: number;
  /** 已读百分比（0-100） */
  percent: number;
}

/**
 * 启动时从 IndexedDB 加载进度数据并初始化 store
 *
 * 实现说明：
 * - 调用 store 的 `initialize()` 方法，触发 IndexedDB → localStorage → 内存同步
 * - 同时初始化 BroadcastChannel 订阅（跨标签页同步）
 * - SSR 环境直接返回
 * - 重复调用幂等（store 内部有 initialized 标志）
 */
export async function initProgress(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    await useProgressStore.getState().initialize();
    logger.debug('[progress] initialized');
  } catch (err) {
    logger.error('[progress] initProgress failed:', err);
  }
}

/**
 * 获取单文档的阅读进度
 *
 * @param docId - 文档 ID（content collection 的 entry id）
 * @returns 阅读状态，默认 'unread'
 */
export function getDocProgress(docId: string): ProgressStatus {
  try {
    return useProgressStore.getState().getProgress(docId);
  } catch (err) {
    logger.error('[progress] getDocProgress failed:', err);
    return 'unread';
  }
}

/**
 * 设置单文档的阅读进度
 *
 * 实现说明：
 * - 同步更新 store（触发内存 state 更新）
 * - 异步触发 IndexedDB 持久化与 BroadcastChannel 广播
 * - 由 store 内部处理持久化与广播细节
 *
 * @param docId - 文档 ID
 * @param status - 目标阅读状态
 */
export function setDocProgress(docId: string, status: ProgressStatus): void {
  try {
    useProgressStore.getState().setProgress(docId, status);
  } catch (err) {
    logger.error('[progress] setDocProgress failed:', err);
  }
}

/**
 * 切换单文档的阅读进度（unread → reading → read → unread 循环）
 *
 * @param docId - 文档 ID
 * @returns 切换后的新状态
 */
export function toggleDocProgress(docId: string): ProgressStatus {
  try {
    useProgressStore.getState().toggleProgress(docId);
    return getDocProgress(docId);
  } catch (err) {
    logger.error('[progress] toggleDocProgress failed:', err);
    return 'unread';
  }
}

/**
 * 获取模块级进度统计
 *
 * @param moduleId - 模块 ID（保留参数，用于未来扩展）
 * @param allDocIds - 该模块下所有文档 ID 列表
 * @returns 模块进度统计
 */
export function getModuleProgress(moduleId: string, allDocIds: readonly string[]): ModuleProgress {
  try {
    const stats = useProgressStore.getState().getModuleProgress(moduleId, [...allDocIds]);
    const total = stats.total;
    const percent = total === 0 ? 0 : Math.round((stats.read / total) * 100);
    return {
      total,
      read: stats.read,
      reading: stats.reading,
      unread: stats.unread,
      percent,
    };
  } catch (err) {
    logger.error('[progress] getModuleProgress failed:', err);
    return { total: allDocIds.length, read: 0, reading: 0, unread: allDocIds.length, percent: 0 };
  }
}

/**
 * 获取整体阅读进度统计
 *
 * @param allDocIds - 所有文档 ID 列表（可选，未提供时仅统计已记录的文档）
 * @returns 整体进度统计
 */
export function getOverallProgress(allDocIds?: readonly string[]): OverallProgress {
  try {
    const stats = useProgressStore
      .getState()
      .getOverallProgress(allDocIds ? [...allDocIds] : undefined);
    return stats;
  } catch (err) {
    logger.error('[progress] getOverallProgress failed:', err);
    return { total: 0, read: 0, reading: 0, unread: 0, percent: 0 };
  }
}

/**
 * 获取最近阅读的文档 ID 列表
 *
 * @param limit - 返回数量上限（默认 10）
 * @returns docId 数组（最新在前）
 */
export function getRecentDocs(limit = 10): string[] {
  try {
    return useProgressStore.getState().getRecentDocs(limit);
  } catch (err) {
    logger.error('[progress] getRecentDocs failed:', err);
    return [];
  }
}

/**
 * 计算连续学习天数（Streak）
 *
 * 实现说明：
 * - 从 lastReadAt 提取所有有阅读记录的日期（去重）
 * - 从今天开始向前回溯，统计连续有阅读记录的天数
 * - 今天若没阅读，但昨天有阅读，仍计为连续 1 天（从昨天起算）
 * - 今天有阅读，则从今天起算
 *
 * @returns 连续学习天数（0 表示无任何阅读记录）
 */
export function getStreakDays(): number {
  try {
    const state = useProgressStore.getState();
    const lastReadAtMap = state.lastReadAt;
    const timestamps = Object.values(lastReadAtMap);
    if (timestamps.length === 0) return 0;

    // 收集所有有阅读记录的日期字符串（YYYY-MM-DD）
    const dateSet = new Set<string>();
    for (const ts of timestamps) {
      const date = new Date(ts);
      // 使用 UTC 日期避免时区影响
      const dateStr = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
      dateSet.add(dateStr);
    }

    // 从今天（UTC）开始向前回溯
    const today = new Date();
    const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`;

    // 若今天有阅读，从今天起算；否则从昨天起算（允许今天尚未学习）
    let streak = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    let cursor = dateSet.has(todayStr) ? Date.now() : Date.now() - oneDayMs;

    // 最多回溯 365 天，防止异常数据导致死循环
    for (let i = 0; i < 365; i++) {
      const d = new Date(cursor);
      const dStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (dateSet.has(dStr)) {
        streak++;
        cursor -= oneDayMs;
      } else {
        break;
      }
    }

    return streak;
  } catch (err) {
    logger.error('[progress] getStreakDays failed:', err);
    return 0;
  }
}

/**
 * 清空所有阅读进度数据
 *
 * 实现说明：
 * - 清空内存 state
 * - 清空 localStorage 与 IndexedDB
 * - 广播 clear 消息到其他标签页
 *
 * @returns 成功返回 true
 */
export async function clearAllProgress(): Promise<boolean> {
  try {
    await useProgressStore.getState().clearAllProgress();
    logger.info('[progress] all progress cleared');
    return true;
  } catch (err) {
    logger.error('[progress] clearAllProgress failed:', err);
    return false;
  }
}

export default {
  initProgress,
  getDocProgress,
  setDocProgress,
  toggleDocProgress,
  getModuleProgress,
  getOverallProgress,
  getRecentDocs,
  getStreakDays,
  clearAllProgress,
};
