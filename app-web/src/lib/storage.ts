
const isClientSide = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function getItem(key: string): string | null {
  if (!isClientSide) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItem(key: string, value: string): void {
  if (!isClientSide) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 写入失败静默降级（隐私模式或配额超限）
  }
}

export function removeItem(key: string): void {
  if (!isClientSide) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 移除失败静默降级
  }
}

export function getJSON<T>(key: string): T | null {
  const raw = getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSON<T>(key: string, value: T): void {
  try {
    setItem(key, JSON.stringify(value));
  } catch {
    // 序列化失败（循环引用等）静默降级
  }
}

export function onStorageChange(
  key: string,
  callback: (newValue: string | null, oldValue: string | null) => void,
): () => void {
  if (!isClientSide) return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === key) {
      callback(e.newValue, e.oldValue);
    }
  };
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('storage', handler);
  };
}

export function clearByPrefix(prefix: string): void {
  if (!isClientSide) return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    // 清理失败静默降级
  }
}
