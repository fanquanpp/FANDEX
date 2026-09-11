/**
 * 学习路径进度持久化（localStorage）
 * -----------------------------------------------------------------------------
 * 职责：
 * - 按"技术模块 -> 节点 ID"两级作用域存取节点学习进度（learning/done）
 * - 结构损坏时自愈为空表，绝不抛错（隐私模式等场景静默降级）
 *
 * 存储格式：
 * {
 *   "python":  { "010-what-is-python": "done", "020-env-setup": "learning" },
 *   "rust":    { ... }
 * }
 * 仅记录用户显式标记的节点，未标记即"未学习"，控制存储体积。
 */
import type { NodeProgress, TechProgress } from './types';

/** localStorage 存储键 */
const STORAGE_KEY = 'fandex-lp-progress';

/** 全量进度表：技术模块 -> 节点进度 */
type ProgressStore = Record<string, TechProgress>;

/**
 * 读取全量进度表（损坏自愈）
 */
function readStore(): ProgressStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 写入全量进度表（失败静默降级）
 */
function writeStore(store: ProgressStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 存储不可用（隐私模式/容量满）时放弃持久化，内存态仍然生效 */
  }
}

/**
 * 读取单个技术的进度表
 * @param module - 技术模块 id（如 "python"）
 */
export function readTechProgress(module: string): TechProgress {
  return readStore()[module] ?? {};
}

/**
 * 写入单个节点的进度状态
 * @param module - 技术模块 id
 * @param nodeId - 节点 id
 * @param state - 目标状态；null 表示清除标记（回到"未学习"）
 */
export function writeNodeProgress(
  module: string,
  nodeId: string,
  state: NodeProgress | null,
): TechProgress {
  const store = readStore();
  const tech = { ...(store[module] ?? {}) };
  if (state === null) {
    delete tech[nodeId];
  } else {
    tech[nodeId] = state;
  }
  if (Object.keys(tech).length === 0) {
    delete store[module];
  } else {
    store[module] = tech;
  }
  writeStore(store);
  return tech;
}
