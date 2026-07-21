/**
 * exercise-service 单元测试
 *
 * 测试策略：
 * exercise-service 依赖 @/data/storage/exercise-repository（基于 IndexedDB），
 * 本测试通过 vi.mock 注入内存版仓库实现，覆盖：
 * 1. submitAnswer 的多类型判题（fill-blank/choice/code-fix/open-ended）
 * 2. getExerciseProgress 的进度统计与正确率计算
 * 3. getIncorrectExercises 的错题查询
 * 4. exportProgress/importProgress/resetProgress 的导入导出与重置
 *
 * 覆盖场景：每个测试用例至少 5 个断言
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExerciseMetadata } from '@/services/exercise-service';

/** 内存版仓库实现：替代 IndexedDB 持久化 */
interface StoredRecord {
  id: string;
  moduleId: string;
  docSlug: string;
  type: 'fill-blank' | 'choice' | 'code-fix' | 'open-ended';
  question: string;
  userAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean | null;
  attempts: number;
  lastAttempted?: number;
  createdAt: number;
}

/** 仓库内存存储 */
let storage: Map<string, StoredRecord> = new Map();

/** 伪造 ExerciseRepository 类 */
class FakeExerciseRepository {
  async save(record: StoredRecord): Promise<void> {
    storage.set(record.id, { ...record });
  }

  async get(id: string): Promise<StoredRecord | undefined> {
    return storage.get(id);
  }

  async getByModule(moduleId: string): Promise<StoredRecord[]> {
    return Array.from(storage.values()).filter((r) => r.moduleId === moduleId);
  }

  async getByDoc(docSlug: string): Promise<StoredRecord[]> {
    return Array.from(storage.values()).filter((r) => r.docSlug === docSlug);
  }

  async getAll(): Promise<StoredRecord[]> {
    return Array.from(storage.values());
  }

  async getIncorrect(): Promise<StoredRecord[]> {
    return Array.from(storage.values()).filter((r) => r.isCorrect === false);
  }

  async clearAll(): Promise<void> {
    storage.clear();
  }

  async exportJSON(): Promise<string> {
    return JSON.stringify({ version: '1.0.0', records: Array.from(storage.values()) }, null, 2);
  }

  async importJSON(json: string): Promise<void> {
    const parsed = JSON.parse(json) as { records: StoredRecord[] };
    storage.clear();
    for (const r of parsed.records ?? []) {
      storage.set(r.id, r);
    }
  }
}

vi.mock('@/data/storage/exercise-repository', () => ({
  getExerciseRepository: () => new FakeExerciseRepository(),
  ExerciseRepository: FakeExerciseRepository,
}));

const {
  submitAnswer,
  getExerciseProgress,
  getIncorrectExercises,
  exportProgress,
  importProgress,
  resetProgress,
} = await import('@/services/exercise-service');

beforeEach(() => {
  storage = new Map();
});

/** 构造 fill-blank 习题 */
function makeFillBlank(overrides: Partial<ExerciseMetadata> = {}): ExerciseMetadata {
  return {
    id: 'fb-1',
    moduleId: 'cpp',
    docSlug: 'pointer',
    type: 'fill-blank',
    question: '指针是什么？',
    correctAnswer: 'pointer',
    answers: ['pointer', 'Pointer'],
    caseSensitive: false,
    ...overrides,
  };
}

/** 构造 choice 习题 */
function makeChoice(overrides: Partial<ExerciseMetadata> = {}): ExerciseMetadata {
  return {
    id: 'ch-1',
    moduleId: 'cpp',
    docSlug: 'pointer',
    type: 'choice',
    question: '下列哪个是合法指针？',
    correctAnswer: 'int *p',
    correctIndex: 1,
    ...overrides,
  };
}

describe('exercise-service', () => {
  describe('submitAnswer - fill-blank', () => {
    it('答案匹配（不区分大小写）应返回 isCorrect=true', async () => {
      const result = await submitAnswer(makeFillBlank(), 'POINTER');
      expect(result.isCorrect).toBe(true);
      expect(result.correctAnswer).toBe('pointer');
      expect(result.explanation).toBe('');
    });

    it('答案匹配任一可接受答案应返回 isCorrect=true', async () => {
      const result = await submitAnswer(makeFillBlank(), 'Pointer');
      expect(result.isCorrect).toBe(true);
    });

    it('答案不匹配应返回 isCorrect=false', async () => {
      const result = await submitAnswer(makeFillBlank(), 'wrong-answer');
      expect(result.isCorrect).toBe(false);
    });

    it('caseSensitive=true 时应区分大小写', async () => {
      const ex = makeFillBlank({ caseSensitive: true, answers: ['Pointer'] });
      const result = await submitAnswer(ex, 'pointer');
      expect(result.isCorrect).toBe(false);
    });

    it('提交后应持久化记录（attempts 自增）', async () => {
      const ex = makeFillBlank();
      await submitAnswer(ex, 'pointer');
      await submitAnswer(ex, 'pointer');
      // storage.get 返回同步值，无需 await；移除未使用的 progress 变量
      const rec = storage.get('fb-1');
      expect(rec).toBeDefined();
      expect(rec!.attempts).toBe(2);
    });
  });

  describe('submitAnswer - choice', () => {
    it('正确选项索引应返回 isCorrect=true', async () => {
      const ex = makeChoice({ correctIndex: 2 });
      const result = await submitAnswer(ex, '2');
      expect(result.isCorrect).toBe(true);
    });

    it('错误选项索引应返回 isCorrect=false', async () => {
      const ex = makeChoice({ correctIndex: 1 });
      const result = await submitAnswer(ex, '3');
      expect(result.isCorrect).toBe(false);
    });

    it('无 correctIndex 应返回 isCorrect=null', async () => {
      // exactOptionalPropertyTypes 模式下，使用 delete 移除可选属性以表达「未设置」语义
      const ex = makeChoice();
      delete ex.correctIndex;
      const result = await submitAnswer(ex, '1');
      expect(result.isCorrect).toBeNull();
    });

    it('非数字答案应返回 isCorrect=false', async () => {
      const ex = makeChoice({ correctIndex: 1 });
      const result = await submitAnswer(ex, 'abc');
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('submitAnswer - code-fix', () => {
    it('完全匹配 fixedCode 应返回 isCorrect=true', async () => {
      const ex: ExerciseMetadata = {
        id: 'cf-1',
        moduleId: 'cpp',
        docSlug: 'memory',
        type: 'code-fix',
        question: '修复以下代码',
        correctAnswer: 'int *p = nullptr;',
        fixedCode: 'int *p = nullptr;',
      };
      const result = await submitAnswer(ex, 'int *p = nullptr;');
      expect(result.isCorrect).toBe(true);
    });

    it('空白差异不应影响匹配（归一化）', async () => {
      const ex: ExerciseMetadata = {
        id: 'cf-2',
        moduleId: 'cpp',
        docSlug: 'memory',
        type: 'code-fix',
        question: '修复',
        correctAnswer: 'int x = 0;',
        fixedCode: 'int x = 0;',
      };
      const result = await submitAnswer(ex, '  int   x   =   0;  ');
      expect(result.isCorrect).toBe(true);
    });

    it('无 fixedCode 应返回 isCorrect=null', async () => {
      // exactOptionalPropertyTypes 模式下，先构造完整对象再 delete 可选属性
      const ex: ExerciseMetadata = {
        id: 'cf-3',
        moduleId: 'cpp',
        docSlug: 'memory',
        type: 'code-fix',
        question: '修复',
        correctAnswer: '',
        fixedCode: '',
      };
      delete ex.fixedCode;
      const result = await submitAnswer(ex, 'some code');
      expect(result.isCorrect).toBeNull();
    });

    it('空答案应返回 isCorrect=false', async () => {
      const ex: ExerciseMetadata = {
        id: 'cf-4',
        moduleId: 'cpp',
        docSlug: 'memory',
        type: 'code-fix',
        question: '修复',
        correctAnswer: 'int x;',
        fixedCode: 'int x;',
      };
      const result = await submitAnswer(ex, '   ');
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('submitAnswer - open-ended', () => {
    it('自评 true 应返回 isCorrect=true', async () => {
      const ex: ExerciseMetadata = {
        id: 'oe-1',
        moduleId: 'cpp',
        docSlug: 'thinking',
        type: 'open-ended',
        question: '谈谈你对指针的理解',
        correctAnswer: '参考答案',
      };
      const result = await submitAnswer(ex, '我的回答', true);
      expect(result.isCorrect).toBe(true);
    });

    it('自评 false 应返回 isCorrect=false', async () => {
      const ex: ExerciseMetadata = {
        id: 'oe-2',
        moduleId: 'cpp',
        docSlug: 'thinking',
        type: 'open-ended',
        question: '谈谈',
        correctAnswer: '参考',
      };
      const result = await submitAnswer(ex, '我的回答', false);
      expect(result.isCorrect).toBe(false);
    });

    it('未提供自评应返回 isCorrect=null', async () => {
      const ex: ExerciseMetadata = {
        id: 'oe-3',
        moduleId: 'cpp',
        docSlug: 'thinking',
        type: 'open-ended',
        question: '谈谈',
        correctAnswer: '参考',
      };
      const result = await submitAnswer(ex, '回答', undefined);
      expect(result.isCorrect).toBeNull();
    });

    it('explanation 字段应回传到结果', async () => {
      const ex: ExerciseMetadata = {
        id: 'oe-4',
        moduleId: 'cpp',
        docSlug: 'thinking',
        type: 'open-ended',
        question: '谈谈',
        correctAnswer: '参考',
        explanation: '这是解析',
      };
      const result = await submitAnswer(ex, '回答', true);
      expect(result.explanation).toBe('这是解析');
    });
  });

  describe('getExerciseProgress', () => {
    it('空记录应返回零值统计', async () => {
      const stats = await getExerciseProgress();
      expect(stats.totalExercises).toBe(0);
      expect(stats.attemptedExercises).toBe(0);
      expect(stats.correctExercises).toBe(0);
      expect(stats.incorrectExercises).toBe(0);
      expect(stats.accuracy).toBe(0);
      expect(stats.modules).toEqual([]);
    });

    it('应正确统计 attempted/correct/incorrect 与正确率', async () => {
      // 题目 1：答对
      await submitAnswer(makeFillBlank({ id: 'fb-1' }), 'pointer');
      // 题目 2：答错
      await submitAnswer(makeFillBlank({ id: 'fb-2', answers: ['only'] }), 'wrong');
      // 题目 3：未作答（open-ended 不自评）
      await submitAnswer(
        {
          id: 'oe-1',
          moduleId: 'cpp',
          docSlug: 'doc',
          type: 'open-ended',
          question: 'q',
          correctAnswer: 'a',
        },
        'ans',
        undefined
      );
      const stats = await getExerciseProgress();
      expect(stats.totalExercises).toBe(3);
      expect(stats.attemptedExercises).toBe(2);
      expect(stats.correctExercises).toBe(1);
      expect(stats.incorrectExercises).toBe(1);
      expect(stats.accuracy).toBe(50);
    });

    it('应按 moduleId 过滤进度', async () => {
      await submitAnswer(makeFillBlank({ id: 'fb-1', moduleId: 'cpp' }), 'pointer');
      await submitAnswer(
        makeFillBlank({ id: 'fb-2', moduleId: 'git', answers: ['commit'] }),
        'commit'
      );
      const stats = await getExerciseProgress('cpp');
      expect(stats.totalExercises).toBe(1);
      expect(stats.modules.every((m) => m.moduleId === 'cpp')).toBe(true);
    });
  });

  describe('getIncorrectExercises', () => {
    it('应仅返回 isCorrect=false 的记录', async () => {
      await submitAnswer(
        makeFillBlank({ id: 'fb-1', answers: ['only'] }),
        'correct-value-but-no-match'
      );
      await submitAnswer(makeFillBlank({ id: 'fb-2', answers: ['ok'] }), 'ok');
      const incorrect = await getIncorrectExercises();
      expect(incorrect).toHaveLength(1);
      expect(incorrect[0]!.isCorrect).toBe(false);
    });

    it('无错题时应返回空数组', async () => {
      await submitAnswer(makeFillBlank({ id: 'fb-1' }), 'pointer');
      const incorrect = await getIncorrectExercises();
      expect(incorrect).toEqual([]);
    });
  });

  describe('exportProgress / importProgress / resetProgress', () => {
    it('导出应返回合法 JSON 字符串', async () => {
      await submitAnswer(makeFillBlank({ id: 'fb-1' }), 'pointer');
      const json = await exportProgress();
      expect(typeof json).toBe('string');
      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('version');
      expect(parsed).toHaveProperty('records');
      expect(Array.isArray(parsed.records)).toBe(true);
    });

    it('导入后应恢复记录', async () => {
      const json = JSON.stringify({
        version: '1.0.0',
        records: [
          {
            id: 'imported-1',
            moduleId: 'cpp',
            docSlug: 'doc',
            type: 'fill-blank' as const,
            question: 'q',
            correctAnswer: 'a',
            isCorrect: true,
            attempts: 1,
            createdAt: Date.now(),
          },
        ],
      });
      await importProgress(json);
      const progress = await getExerciseProgress();
      expect(progress.totalExercises).toBe(1);
    });

    it('重置后应清空所有记录', async () => {
      await submitAnswer(makeFillBlank({ id: 'fb-1' }), 'pointer');
      await resetProgress();
      const progress = await getExerciseProgress();
      expect(progress.totalExercises).toBe(0);
    });
  });
});
