import type { NodeProgress, TechProgress } from './types';

const STORAGE_KEY = 'fandex-lp-progress';

type ProgressStore = Record<string, TechProgress>;

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
