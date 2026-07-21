/**
 * modules 单元测试
 *
 * 测试对象：apps/web/src/lib/modules.ts（模块注册表与查询工具）
 *
 * 测试覆盖：
 * - MODULES 数组长度为 51
 * - getModule(id) 返回正确模块 / 不存在时返回 undefined
 * - getModuleBySlug(slug) 正确查找
 * - getModulesByCategory(category) 返回该分类下所有模块
 * - getPrerequisites(moduleId) 返回前置依赖
 * - getDependents(moduleId) 返回被依赖模块
 * - getModuleProgress(moduleId, allDocIds) 返回进度统计
 *
 * 数据说明：
 * metadata/modules.json 中模块 id 实际为单段 slug（如 'javascript'），不带分类前缀。
 * 测试用例按实际数据形态编写。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stub localStorage（getModuleProgress 中读取 'fandex-progress' key）
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    get length() {
      return Object.keys(store).length;
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);
// 测试环境为浏览器侧
vi.stubGlobal('window', {});

const {
  MODULES,
  MODULE_CATEGORIES,
  getModule,
  getModuleBySlug,
  getModulesByCategory,
  getPrerequisites,
  getDependents,
  getModuleProgress,
} = await import('@/lib/modules');

describe('modules', () => {
  beforeEach(() => {
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
  });

  describe('MODULES 数据集', () => {
    it('MODULES 数组长度为 51', () => {
      expect(MODULES).toHaveLength(51);
    });

    it('MODULES 中每个模块都有必要字段', () => {
      for (const m of MODULES) {
        expect(typeof m.id).toBe('string');
        expect(m.id.length).toBeGreaterThan(0);
        expect(typeof m.name).toBe('string');
        expect(typeof m.category).toBe('string');
        expect(typeof m.description).toBe('string');
        expect(typeof m.icon).toBe('string');
        expect(typeof m.color).toBe('string');
        expect(Array.isArray(m.prerequisites)).toBe(true);
      }
    });

    it('MODULE_CATEGORIES 数量与 categoryOrder 一致（8 个分类）', () => {
      expect(MODULE_CATEGORIES).toHaveLength(8);
    });
  });

  describe('getModule', () => {
    it('getModule("javascript") 返回正确模块', () => {
      const m = getModule('javascript');
      expect(m).toBeDefined();
      expect(m?.id).toBe('javascript');
      expect(m?.name).toBe('JavaScript');
      expect(m?.category).toBe('frontend');
      expect(m?.icon).toBe('JS');
    });

    it('getModule("git") 返回工具链分类的 Git 模块', () => {
      const m = getModule('git');
      expect(m).toBeDefined();
      expect(m?.id).toBe('git');
      expect(m?.category).toBe('tools');
    });

    it('getModule("nonexistent") 返回 undefined', () => {
      expect(getModule('nonexistent')).toBeUndefined();
    });

    it('getModule("") 空字符串返回 undefined', () => {
      expect(getModule('')).toBeUndefined();
    });
  });

  describe('getModuleBySlug', () => {
    it('getModuleBySlug("javascript") 正确查找', () => {
      const m = getModuleBySlug('javascript');
      expect(m).toBeDefined();
      expect(m?.id).toBe('javascript');
    });

    it('getModuleBySlug("python") 返回 Python 模块', () => {
      const m = getModuleBySlug('python');
      expect(m).toBeDefined();
      expect(m?.id).toBe('python');
      expect(m?.category).toBe('ai');
    });

    it('getModuleBySlug("nonexistent-slug") 返回 undefined', () => {
      expect(getModuleBySlug('nonexistent-slug')).toBeUndefined();
    });
  });

  describe('getModulesByCategory', () => {
    it('getModulesByCategory("frontend") 返回前端分类所有模块', () => {
      const list = getModulesByCategory('frontend');
      expect(list.length).toBeGreaterThan(0);
      for (const m of list) {
        expect(m.category).toBe('frontend');
      }
      // 验证包含已知前端模块
      const ids = list.map((m) => m.id);
      expect(ids).toContain('html5');
      expect(ids).toContain('css');
      expect(ids).toContain('javascript');
      expect(ids).toContain('typescript');
      expect(ids).toContain('vue3');
      expect(ids).toContain('react');
    });

    it('getModulesByCategory("ai") 返回 AI 分类所有模块', () => {
      const list = getModulesByCategory('ai');
      expect(list.length).toBeGreaterThan(0);
      const ids = list.map((m) => m.id);
      expect(ids).toContain('python');
      expect(ids).toContain('machine-learning');
      expect(ids).toContain('llm');
    });

    it('getModulesByCategory("nonexistent") 返回空数组', () => {
      expect(getModulesByCategory('nonexistent')).toHaveLength(0);
    });

    it('返回结果按 order 字段升序排列', () => {
      const list = getModulesByCategory('frontend');
      for (let i = 1; i < list.length; i++) {
        expect(list[i].order).toBeGreaterThanOrEqual(list[i - 1].order);
      }
    });
  });

  describe('getPrerequisites', () => {
    it('getPrerequisites("javascript") 返回前置依赖（html5、css）', () => {
      const deps = getPrerequisites('javascript');
      const ids = deps.map((m) => m.id);
      expect(ids).toContain('html5');
      expect(ids).toContain('css');
    });

    it('getPrerequisites("typescript") 包含 javascript', () => {
      const deps = getPrerequisites('typescript');
      const ids = deps.map((m) => m.id);
      expect(ids).toContain('javascript');
    });

    it('getPrerequisites("git") 无前置依赖返回空数组', () => {
      expect(getPrerequisites('git')).toHaveLength(0);
    });

    it('getPrerequisites("nonexistent") 模块不存在返回空数组', () => {
      expect(getPrerequisites('nonexistent')).toHaveLength(0);
    });

    it('getPrerequisites("cpp") 包含 c', () => {
      const deps = getPrerequisites('cpp');
      expect(deps.map((m) => m.id)).toContain('c');
    });
  });

  describe('getDependents', () => {
    it('getDependents("html5") 返回依赖 html5 的模块（含 css、javascript）', () => {
      const dependents = getDependents('html5');
      const ids = dependents.map((m) => m.id);
      expect(ids).toContain('css');
      expect(ids).toContain('javascript');
    });

    it('getDependents("javascript") 返回依赖 JS 的模块（含 typescript、vue3、react 等）', () => {
      const dependents = getDependents('javascript');
      const ids = dependents.map((m) => m.id);
      expect(ids).toContain('typescript');
      expect(ids).toContain('vue3');
      expect(ids).toContain('react');
    });

    it('getDependents("c") 包含 cpp', () => {
      const dependents = getDependents('c');
      expect(dependents.map((m) => m.id)).toContain('cpp');
    });

    it('getDependents("nonexistent") 返回空数组', () => {
      expect(getDependents('nonexistent')).toHaveLength(0);
    });
  });

  describe('getModuleProgress', () => {
    it('无文档列表时返回全零统计', () => {
      const stats = getModuleProgress('javascript', []);
      expect(stats.total).toBe(0);
      expect(stats.read).toBe(0);
      expect(stats.reading).toBe(0);
      expect(stats.unread).toBe(0);
      expect(stats.percent).toBe(0);
    });

    it('localStorage 为空时全部为 unread', () => {
      localStorageMock.getItem.mockReturnValueOnce(null as unknown as string);
      const stats = getModuleProgress('javascript', ['d1', 'd2', 'd3']);
      expect(stats.total).toBe(3);
      expect(stats.read).toBe(0);
      expect(stats.unread).toBe(3);
      expect(stats.percent).toBe(0);
    });

    it('localStorage 中存在进度数据时正确统计', () => {
      // progress-store 的 localStorage 数据格式为 { state: { progress: {...} } } 或 { progress: {...} }
      const stored = {
        state: {
          progress: {
            'js-d1': 'read',
            'js-d2': 'reading',
            'js-d3': 'unread',
          },
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
      const stats = getModuleProgress('javascript', ['js-d1', 'js-d2', 'js-d3', 'js-d4']);
      expect(stats.total).toBe(4);
      expect(stats.read).toBe(1);
      expect(stats.reading).toBe(1);
      expect(stats.unread).toBe(2);
      expect(stats.percent).toBe(25);
    });

    it('localStorage 数据格式为 partialize 后的扁平结构（无 state 包装）', () => {
      const stored = {
        progress: {
          'js-d1': 'read',
          'js-d2': 'read',
        },
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(stored));
      const stats = getModuleProgress('javascript', ['js-d1', 'js-d2', 'js-d3']);
      expect(stats.total).toBe(3);
      expect(stats.read).toBe(2);
      expect(stats.percent).toBe(67);
    });

    it('localStorage JSON 解析失败时降级为全部 unread', () => {
      localStorageMock.getItem.mockReturnValue('not-json');
      const stats = getModuleProgress('javascript', ['d1', 'd2']);
      expect(stats.total).toBe(2);
      expect(stats.unread).toBe(2);
      expect(stats.percent).toBe(0);
    });
  });
});
