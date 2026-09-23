import type { NodeProgress, TechProgress } from './types';

export const PROGRESS_STORAGE_KEY = 'fandex-lp-progress';

const STORAGE_KEY = PROGRESS_STORAGE_KEY;

type ProgressStore = Record<string, TechProgress>;

const VALID_STATES: ReadonlySet<string> = new Set(['learning', 'done']);

function sanitizeTechProgress(value: unknown): TechProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: TechProgress = {};
  for (const [nodeId, state] of Object.entries(value as Record<string, unknown>)) {
    if (typeof state === 'string' && VALID_STATES.has(state)) {
      result[nodeId] = state as NodeProgress;
    }
  }
  return result;
}

function readStore(): ProgressStore {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const store: ProgressStore = {};
    for (const [module, tech] of Object.entries(parsed as Record<string, unknown>)) {
      store[module] = sanitizeTechProgress(tech);
    }
    return store;
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* 存储不可用（隐私模式/容量满）时放弃持久化，内存态仍然生效 */
  }
}

export function readTechProgress(module: string): TechProgress {
  return readStore()[module] ?? {};
}

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

export function clearTechProgress(module: string): TechProgress {
  const store = readStore();
  delete store[module];
  writeStore(store);
  return {};
}

/**
 * 按当前地图的有效节点修剪本地进度：文档编号重构后，进度存储里会残留
 * 已失效的节点编号（既不显示也无法清除）。技术地图挂载时以本次有效
 * 节点集合为准修剪并回写，总览页徽章随之自愈。
 */
export function pruneTechProgress(
  module: string,
  validNodeIds: ReadonlySet<string>,
): TechProgress {
  const store = readStore();
  const tech = store[module];
  if (!tech) return {};
  let changed = false;
  const pruned: TechProgress = {};
  for (const [nodeId, state] of Object.entries(tech)) {
    if (validNodeIds.has(nodeId)) {
      pruned[nodeId] = state;
    } else {
      changed = true;
    }
  }
  if (!changed) return tech;
  if (Object.keys(pruned).length === 0) {
    delete store[module];
  } else {
    store[module] = pruned;
  }
  writeStore(store);
  return pruned;
}
