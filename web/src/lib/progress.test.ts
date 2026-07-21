import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStore[key] = value;
  },
  removeItem: (key: string) => {
    delete mockStore[key];
  },
  clear: () => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k]);
  },
  get length() {
    return Object.keys(mockStore).length;
  },
  key: (_index: number) => null,
};

beforeEach(() => {
  mockLocalStorage.clear();
});

vi.stubGlobal('localStorage', mockLocalStorage);
vi.stubGlobal('window', { dispatchEvent: vi.fn() });
vi.stubGlobal(
  'BroadcastChannel',
  class {
    onmessage: ((e: MessageEvent) => void) | null = null;
    postMessage() {}
    close() {}
  }
);
vi.stubGlobal('indexedDB', undefined);

const { toggleStatus, setProgress, getProgress, getAllProgress } = await import('@/lib/progress');

describe('toggleStatus', () => {
  it('should cycle unread -> reading -> done -> unread', () => {
    const slug = 'test/doc1';

    const result1 = toggleStatus(slug);
    expect(result1).toBe('reading');

    const result2 = toggleStatus(slug);
    expect(result2).toBe('done');

    const result3 = toggleStatus(slug);
    expect(result3).toBe('unread');

    const result4 = toggleStatus(slug);
    expect(result4).toBe('reading');
  });

  it('should start from reading for new slugs', () => {
    const result = toggleStatus('new/slug');
    expect(result).toBe('reading');
  });
});

describe('setProgress / getProgress', () => {
  it('should store and retrieve progress', () => {
    setProgress('mod/doc', 'done');
    const p = getProgress('mod/doc');
    expect(p).not.toBeNull();
    expect(p!.status).toBe('done');
  });

  it('should return null for unknown slugs', () => {
    const p = getProgress('unknown/slug');
    expect(p).toBeNull();
  });
});

describe('getAllProgress', () => {
  it('should return empty object when no progress stored', () => {
    const all = getAllProgress();
    expect(all).toEqual({});
  });

  it('should return all stored progress', () => {
    setProgress('a/1', 'reading');
    setProgress('b/2', 'done');
    const all = getAllProgress();
    expect(Object.keys(all)).toHaveLength(2);
    // noUncheckedIndexedAccess：索引访问返回 T | undefined，使用 ?. 链式访问
    expect(all['a/1']?.status).toBe('reading');
    expect(all['b/2']?.status).toBe('done');
  });
});
