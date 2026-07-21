/**
 * learning-path-service 单元测试
 *
 * 测试策略：
 * learning-path-service 依赖：
 * - @/data/learning-paths.json 静态数据（真实数据）
 * - ./module-service.getModule
 * - ./progress-service.getProgressStats
 *
 * 同步 API（getAllPaths/getPath）直接验证真实数据；异步 API 通过 vi.mock
 * 注入伪造的 progress-service.getProgressStats，验证进度聚合逻辑。
 *
 * 覆盖场景：
 * - getAllPaths：返回完整路径数组
 * - getPath：按 ID 查找
 * - getPathProgress：进度聚合、解锁条件、完成度计算
 * - getRecommendedPath：推荐路径选择策略
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ProgressStats } from '@/services/progress-service';

/** 伪造的进度统计数据 */
let fakeStats: ProgressStats = {
  totalDocs: 0,
  completed: 0,
  inProgress: 0,
  notStarted: 0,
  bookmarked: 0,
  totalReadingTime: 0,
  streakDays: 0,
  moduleProgress: [],
};

vi.mock('@/services/progress-service', () => ({
  getProgressStats: vi.fn(async () => fakeStats),
}));

const { getAllPaths, getPath, getPathProgress, getRecommendedPath } =
  await import('@/services/learning-path-service');

beforeEach(() => {
  fakeStats = {
    totalDocs: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    bookmarked: 0,
    totalReadingTime: 0,
    streakDays: 0,
    moduleProgress: [],
  };
});

describe('learning-path-service', () => {
  describe('getAllPaths', () => {
    it('应返回非空路径数组', () => {
      const paths = getAllPaths();
      expect(Array.isArray(paths)).toBe(true);
      expect(paths.length).toBeGreaterThan(0);
    });

    it('每个路径应包含 id/name/description/icon/modules 字段', () => {
      const paths = getAllPaths();
      const first = paths[0]!;
      expect(typeof first.id).toBe('string');
      expect(typeof first.name).toBe('string');
      expect(typeof first.description).toBe('string');
      expect(typeof first.icon).toBe('string');
      expect(Array.isArray(first.modules)).toBe(true);
    });

    it('每个模块应包含合法的 priority 值', () => {
      const paths = getAllPaths();
      for (const p of paths) {
        for (const m of p.modules) {
          expect(['required', 'recommended', 'optional']).toContain(m.priority);
        }
      }
    });

    it('模块的 dependsOn 应为字符串数组', () => {
      const paths = getAllPaths();
      for (const p of paths) {
        for (const m of p.modules) {
          expect(Array.isArray(m.dependsOn)).toBe(true);
          expect(m.dependsOn.every((d) => typeof d === 'string')).toBe(true);
        }
      }
    });
  });

  describe('getPath', () => {
    it('应通过已知 ID 找到路径', () => {
      const all = getAllPaths();
      const first = all[0]!;
      const found = getPath(first.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(first.id);
    });

    it('未匹配 ID 应返回 undefined', () => {
      const result = getPath('non-existent-path');
      expect(result).toBeUndefined();
    });
  });

  describe('getPathProgress', () => {
    it('未匹配路径应返回空进度对象', async () => {
      const progress = await getPathProgress('non-existent');
      expect(progress.pathId).toBe('non-existent');
      expect(progress.pathName).toBe('');
      expect(progress.totalModules).toBe(0);
      expect(progress.completionRate).toBe(0);
      expect(progress.modules).toEqual([]);
    });

    it('无进度时应返回 completionRate=0', async () => {
      const paths = getAllPaths();
      const first = paths[0]!;
      const progress = await getPathProgress(first.id);
      expect(progress.completionRate).toBe(0);
      expect(progress.completedModules).toBe(0);
      expect(progress.totalEstimatedHours).toBeGreaterThan(0);
    });

    it('有模块进度时应正确计算完成度', async () => {
      const paths = getAllPaths();
      const frontend = paths.find((p) => p.id === 'frontend') ?? paths[0]!;
      // 标记首个模块为已完成
      const firstModuleId = frontend.modules[0]!.moduleId;
      fakeStats.moduleProgress = [
        { moduleId: firstModuleId, total: 5, completed: 5, inProgress: 0 },
      ];
      const progress = await getPathProgress(frontend.id);
      expect(progress.totalModules).toBeGreaterThan(0);
      expect(progress.completedModules).toBeGreaterThanOrEqual(1);
    });

    it('模块解锁条件应基于 dependsOn 是否已完成', async () => {
      const paths = getAllPaths();
      const frontend = paths.find((p) => p.id === 'frontend') ?? paths[0]!;
      // 无进度时，所有有 dependsOn 的模块应未解锁
      const progress = await getPathProgress(frontend.id);
      for (const m of progress.modules) {
        if (m.dependsOn.length > 0) {
          expect(m.unlocked).toBe(false);
        }
      }
    });

    it('应聚合必学模块完成情况', async () => {
      const paths = getAllPaths();
      const first = paths[0]!;
      const progress = await getPathProgress(first.id);
      const requiredModules = first.modules.filter((m) => m.priority === 'required');
      expect(progress.requiredTotal).toBe(requiredModules.length);
    });
  });

  describe('getRecommendedPath', () => {
    it('无任何进度时应返回 undefined', async () => {
      const result = await getRecommendedPath();
      expect(result).toBeUndefined();
    });

    it('有进行中模块时应返回推荐路径', async () => {
      const paths = getAllPaths();
      const first = paths[0]!;
      const firstModuleId = first.modules[0]!.moduleId;
      // completionRate = completed / total * 100，需 > 0 才会被视为"进行中模块"
      fakeStats.moduleProgress = [
        { moduleId: firstModuleId, total: 5, completed: 2, inProgress: 3 },
      ];
      const result = await getRecommendedPath();
      expect(result).toBeDefined();
    });

    it('仅有完成模块时应仍能返回推荐', async () => {
      const paths = getAllPaths();
      const first = paths[0]!;
      const firstModuleId = first.modules[0]!.moduleId;
      fakeStats.moduleProgress = [
        { moduleId: firstModuleId, total: 5, completed: 5, inProgress: 0 },
      ];
      const result = await getRecommendedPath();
      expect(result).toBeDefined();
    });
  });
});
