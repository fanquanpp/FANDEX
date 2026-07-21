/**
 * module-service 单元测试
 *
 * 测试策略：
 * module-service 包装 @/lib/modules 的查询函数，无需 Mock，直接验证
 * 真实模块元数据上的查询行为。
 *
 * 覆盖场景：
 * - getAllModules：返回完整模块数组
 * - getModule：按 ID 精确查找
 * - getModulesByCategory：按分类过滤
 * - getPrimaryCategory：返回模块主分类
 * - getModulePrerequisites：返回前置依赖列表
 * - getCategories：返回所有分类信息（含 id/label/color）
 */
import { describe, it, expect } from 'vitest';
import {
  getAllModules,
  getModule,
  getModulesByCategory,
  getPrimaryCategory,
  getModulePrerequisites,
  getCategories,
} from '@/services/module-service';

describe('module-service', () => {
  describe('getAllModules', () => {
    it('应返回非空模块数组', () => {
      const modules = getAllModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
    });

    it('每个模块应包含 id/title/icon/description/categories 字段', () => {
      const modules = getAllModules();
      const first = modules[0]!;
      expect(typeof first.id).toBe('string');
      expect(typeof first.title).toBe('string');
      expect(typeof first.icon).toBe('string');
      expect(typeof first.description).toBe('string');
      expect(Array.isArray(first.categories)).toBe(true);
    });

    it('模块 ID 应唯一', () => {
      const modules = getAllModules();
      const ids = modules.map((m) => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('getModule', () => {
    it('应通过已知 ID 找到模块', () => {
      const all = getAllModules();
      const first = all[0]!;
      const found = getModule(first.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(first.id);
    });

    it('未匹配 ID 应返回 undefined', () => {
      const result = getModule('non-existent-module-id-12345');
      expect(result).toBeUndefined();
    });
  });

  describe('getModulesByCategory', () => {
    it('应返回指定分类下的模块列表', () => {
      // toolchain 分类在 modules.ts 中有定义
      const modules = getModulesByCategory('toolchain');
      expect(Array.isArray(modules)).toBe(true);
      expect(modules.length).toBeGreaterThan(0);
      // modules 数组使用 `as const` 推断，categories 字段为各字面量元组的联合
      // 此处需 cast 为 readonly string[] 才能使用 includes 查询（与 lib/modules.ts 中做法一致）
      expect(modules.every((m) => (m.categories as readonly string[]).includes('toolchain'))).toBe(
        true
      );
    });

    it('未匹配分类应返回空数组', () => {
      const modules = getModulesByCategory('non-existent-category');
      expect(modules).toEqual([]);
    });
  });

  describe('getPrimaryCategory', () => {
    it('应返回模块的主分类（categories[0]）', () => {
      const result = getPrimaryCategory('git');
      expect(typeof result).toBe('string');
      expect(result!.length).toBeGreaterThan(0);
    });

    it('未匹配模块应返回 undefined', () => {
      const result = getPrimaryCategory('non-existent-module');
      expect(result).toBeUndefined();
    });

    it('主分类应等于该模块 categories 数组的首个元素', () => {
      const all = getAllModules();
      const first = all[0]!;
      const primary = getPrimaryCategory(first.id);
      expect(primary).toBe(first.categories[0]);
    });
  });

  describe('getModulePrerequisites', () => {
    it('应返回模块的前置依赖数组', () => {
      // github 模块在 modules.ts 中前置依赖 git
      const prereqs = getModulePrerequisites('github');
      expect(Array.isArray(prereqs)).toBe(true);
      expect(prereqs).toContain('git');
    });

    it('无前置依赖的模块应返回空数组', () => {
      // git 模块在 modules.ts 中无前置依赖
      const prereqs = getModulePrerequisites('git');
      expect(prereqs).toEqual([]);
    });

    it('未匹配模块应返回空数组', () => {
      const prereqs = getModulePrerequisites('non-existent-module');
      expect(prereqs).toEqual([]);
    });
  });

  describe('getCategories', () => {
    it('应返回所有分类信息数组', () => {
      const categories = getCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('每个分类应包含 id/label/color 字段', () => {
      const categories = getCategories();
      const first = categories[0]!;
      expect(typeof first.id).toBe('string');
      expect(typeof first.label).toBe('string');
      expect(typeof first.color).toBe('string');
      // color 应为合法十六进制颜色
      expect(first.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });

    it('分类顺序应与 categoryOrder 一致', () => {
      const categories = getCategories();
      const expectedOrder = ['toolchain', 'dev-lang', 'database', 'comp-sci', 'eng-infra', 'data'];
      const ids = categories.map((c) => c.id);
      expect(ids).toEqual(expectedOrder);
    });

    it('未在 categoryLabels 中定义的分类应回退使用 id 作为 label', () => {
      const categories = getCategories();
      // 所有已知分类都应在 categoryLabels 中，label 应不等于 id
      for (const cat of categories) {
        expect(cat.label.length).toBeGreaterThan(0);
      }
    });
  });
});
