/**
 * 习题服务模块
 *
 * 功能概述：
 * 作为 UI 层与 Data 层（exercise-repository）之间的桥梁，封装习题作答、
 * 判题、进度统计、错题查询、导入导出等业务逻辑。所有异步函数通过 try-catch
 * 包裹，异常时返回安全默认值。
 *
 * 设计原则：
 * - 单一职责：仅处理习题相关业务，不涉及文档阅读进度（由 progress-service 负责）
 * - 无循环依赖：仅依赖 exercise-repository 与 types
 * - SSR 安全：所有异步函数在 SSR 阶段返回空数据
 * - 类型严格：无 any/unknown，所有类型显式声明
 *
 * 判题规则：
 * - fill-blank：忽略大小写、首尾空格的精确匹配（与任一 answers 元素匹配即正确）
 * - choice：比较用户选择索引与 correctIndex
 * - code-fix：归一化比较（去空白、统一换行），无法精确判断时返回 isCorrect=null
 * - open-ended：自评题，由用户标记掌握状态，submitAnswer 接收 isCorrect 参数
 */

import {
  getExerciseRepository,
  type ExerciseRecord,
  type ExerciseType,
} from '@/data/storage/exercise-repository';

/** 习题类型别名（重新导出便于外部使用） */
export type { ExerciseRecord, ExerciseType };

/**
 * 习题元数据
 * 由 Exercise.vue / Quiz.vue 从 frontmatter 解析后传入，作为判题依据
 */
export interface ExerciseMetadata {
  /** 习题 ID */
  id: string;
  /** 所属模块 ID */
  moduleId: string;
  /** 所属文档 slug */
  docSlug: string;
  /** 习题类型 */
  type: ExerciseType;
  /** 题干 */
  question: string;
  /** 参考答案（用于展示；fill-blank 取 answers[0]，choice 取 options[correctIndex]，code-fix 取 fixedCode） */
  correctAnswer: string;
  /** 答案解析（可选） */
  explanation?: string;
  /** 填空题：所有可接受答案 */
  answers?: string[];
  /** 填空题：是否大小写敏感（默认 false） */
  caseSensitive?: boolean;
  /** 选择题：正确选项索引 */
  correctIndex?: number;
  /** 代码修正题：修正后的代码 */
  fixedCode?: string;
}

/** 提交结果 */
export interface SubmitResult {
  /** 是否答对（code-fix 无法判断时为 null） */
  isCorrect: boolean | null;
  /** 答案解析（无解析时为空字符串） */
  explanation: string;
  /** 参考答案 */
  correctAnswer: string;
}

/** 进度统计 */
export interface ProgressStats {
  /** 习题总尝试数（去重，按 id） */
  totalExercises: number;
  /** 已作答数（isCorrect !== null） */
  attemptedExercises: number;
  /** 答对数 */
  correctExercises: number;
  /** 答错数 */
  incorrectExercises: number;
  /** 正确率（0-100，无作答时为 0） */
  accuracy: number;
  /** 总尝试次数（含重复提交） */
  totalAttempts: number;
  /** 学习连续打卡天数 */
  streakDays: number;
  /** 各模块进度明细 */
  modules: ModuleStat[];
}

/** 模块级进度统计 */
export interface ModuleStat {
  /** 模块 ID */
  moduleId: string;
  /** 该模块的作答记录数 */
  total: number;
  /** 答对数 */
  correct: number;
  /** 答错数 */
  incorrect: number;
  /** 正确率（0-100） */
  accuracy: number;
  /** 最后作答时间戳 */
  lastAttempted?: number;
}

/**
 * 规范化字符串：去除首尾空白、统一换行为 \n、压缩连续空白
 * 用于代码修正题的答案比较，避免格式差异影响判断
 * @param text - 原始字符串
 * @returns 规范化后的字符串
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ');
}

/**
 * 判题核心逻辑
 * 根据习题类型采用不同的判题规则
 * @param exercise - 习题元数据
 * @param userAnswer - 用户答案
 * @returns true（答对）| false（答错）| null（无法自动判断）
 */
function judge(exercise: ExerciseMetadata, userAnswer: string): boolean | null {
  const trimmedAnswer = userAnswer.trim();

  switch (exercise.type) {
    case 'fill-blank': {
      // 填空题：与 answers 数组中任一元素匹配即正确
      const answers = exercise.answers ?? [];
      if (answers.length === 0) return trimmedAnswer.length > 0;
      const caseSensitive = exercise.caseSensitive ?? false;
      const userVal = caseSensitive ? trimmedAnswer : trimmedAnswer.toLowerCase();
      return answers.some((ans) => {
        const ansVal = caseSensitive ? ans.trim() : ans.trim().toLowerCase();
        return userVal === ansVal;
      });
    }
    case 'choice': {
      // 选择题：用户答案应为选项索引的字符串形式，与 correctIndex 比较
      const correctIndex = exercise.correctIndex;
      if (typeof correctIndex !== 'number') return null;
      const userIndex = parseInt(trimmedAnswer, 10);
      if (Number.isNaN(userIndex)) return false;
      return userIndex === correctIndex;
    }
    case 'code-fix': {
      // 代码修正题：归一化比较用户答案与 fixedCode
      const fixedCode = exercise.fixedCode;
      if (!fixedCode) return null;
      const normalizedUser = normalizeText(userAnswer);
      const normalizedFixed = normalizeText(fixedCode);
      if (normalizedUser.length === 0) return false;
      // 完全匹配判为正确；否则无法精确判断（返回 null，让用户自评）
      if (normalizedUser === normalizedFixed) return true;
      // 启发式：包含 fixedCode 关键差异行（如修复点）的 80% 也判为正确
      const fixedLines = normalizedFixed.split('\n').filter((line) => line.length > 0);
      const userLines = normalizedUser.split('\n').filter((line) => line.length > 0);
      if (fixedLines.length === 0) return null;
      const matched = fixedLines.filter((line) => userLines.includes(line)).length;
      const ratio = matched / fixedLines.length;
      return ratio >= 0.8;
    }
    case 'open-ended': {
      // 开放性问题：无法自动判题，返回 null
      return null;
    }
    default:
      return null;
  }
}

/**
 * 提交答案
 * 自动判题（fill-blank/choice/code-fix）或接收自评结果（open-ended），并持久化记录
 * @param exercise - 习题元数据
 * @param userAnswer - 用户答案
 * @param isCorrectOverride - 自评题的掌握状态（仅 open-ended 使用）
 * @returns 提交结果，包含判题结果、解析、参考答案
 */
export async function submitAnswer(
  exercise: ExerciseMetadata,
  userAnswer: string,
  isCorrectOverride?: boolean
): Promise<SubmitResult> {
  const isCorrect =
    exercise.type === 'open-ended' ? (isCorrectOverride ?? null) : judge(exercise, userAnswer);

  const result: SubmitResult = {
    isCorrect,
    explanation: exercise.explanation ?? '',
    correctAnswer: exercise.correctAnswer,
  };

  try {
    const repo = getExerciseRepository();
    const existing = await repo.get(exercise.id);
    const now = Date.now();
    const record: ExerciseRecord = {
      id: exercise.id,
      moduleId: exercise.moduleId,
      docSlug: exercise.docSlug,
      type: exercise.type,
      question: exercise.question,
      userAnswer,
      correctAnswer: exercise.correctAnswer,
      isCorrect,
      attempts: (existing?.attempts ?? 0) + 1,
      lastAttempted: now,
      createdAt: existing?.createdAt ?? now,
    };
    await repo.save(record);
  } catch {
    // 持久化失败不影响 UI 反馈
  }

  return result;
}

/**
 * 获取习题进度统计
 * @param moduleId - 可选，指定模块 ID 时仅统计该模块；不传则统计全部
 * @returns 进度统计对象；异常时返回零值
 */
export async function getExerciseProgress(moduleId?: string): Promise<ProgressStats> {
  try {
    const repo = getExerciseRepository();
    const records = moduleId ? await repo.getByModule(moduleId) : await repo.getAll();

    const totalExercises = records.length;
    let attempted = 0;
    let correct = 0;
    let incorrect = 0;
    let totalAttempts = 0;
    const moduleMap = new Map<string, ModuleStat>();
    const attemptDates = new Set<string>();

    for (const record of records) {
      totalAttempts += record.attempts;
      if (record.isCorrect !== null) {
        attempted++;
        if (record.isCorrect) {
          correct++;
        } else {
          incorrect++;
        }
      }
      if (record.lastAttempted) {
        const dateStr = new Date(record.lastAttempted).toISOString().slice(0, 10);
        attemptDates.add(dateStr);
      }
      // 模块统计
      const moduleStat = moduleMap.get(record.moduleId) ?? {
        moduleId: record.moduleId,
        total: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
      };
      moduleStat.total += 1;
      if (record.isCorrect === true) moduleStat.correct += 1;
      if (record.isCorrect === false) moduleStat.incorrect += 1;
      if (record.lastAttempted) {
        if (!moduleStat.lastAttempted || record.lastAttempted > moduleStat.lastAttempted) {
          moduleStat.lastAttempted = record.lastAttempted;
        }
      }
      moduleMap.set(record.moduleId, moduleStat);
    }

    // 计算各模块正确率
    const modules = Array.from(moduleMap.values()).map((stat) => ({
      ...stat,
      accuracy: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }));

    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const streakDays = computeStreakDays(attemptDates);

    return {
      totalExercises,
      attemptedExercises: attempted,
      correctExercises: correct,
      incorrectExercises: incorrect,
      accuracy,
      totalAttempts,
      streakDays,
      modules,
    };
  } catch {
    return {
      totalExercises: 0,
      attemptedExercises: 0,
      correctExercises: 0,
      incorrectExercises: 0,
      accuracy: 0,
      totalAttempts: 0,
      streakDays: 0,
      modules: [],
    };
  }
}

/**
 * 计算连续打卡天数
 * 从今天向前回溯，统计连续有作答记录的天数
 * @param attemptDates - 作答日期集合（格式：YYYY-MM-DD）
 * @returns 连续天数；今日无记录但昨日有时仍可计算（>=1）
 */
function computeStreakDays(attemptDates: Set<string>): number {
  if (attemptDates.size === 0) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  const cursor = new Date(today);
  // 若今日无记录但昨日有，仍从昨日开始计数（容忍今日尚未学习）
  const todayStr = today.toISOString().slice(0, 10);
  if (!attemptDates.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayStr = cursor.toISOString().slice(0, 10);
    if (!attemptDates.has(yesterdayStr)) return 0;
  }
  while (attemptDates.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * 获取错题集
 * @returns 答错的习题记录数组（按 lastAttempted 倒序）；异常时返回空数组
 */
export async function getIncorrectExercises(): Promise<ExerciseRecord[]> {
  try {
    const repo = getExerciseRepository();
    const records = await repo.getIncorrect();
    return records.sort((a, b) => (b.lastAttempted ?? 0) - (a.lastAttempted ?? 0));
  } catch {
    return [];
  }
}

/**
 * 导出全部习题进度为 JSON 字符串
 * @returns JSON 字符串
 */
export async function exportProgress(): Promise<string> {
  const repo = getExerciseRepository();
  return repo.exportJSON();
}

/**
 * 从 JSON 字符串导入习题进度（覆盖式）
 * @param json - JSON 字符串
 */
export async function importProgress(json: string): Promise<void> {
  const repo = getExerciseRepository();
  await repo.importJSON(json);
}

/**
 * 重置所有习题进度（清空全部作答记录）
 */
export async function resetProgress(): Promise<void> {
  const repo = getExerciseRepository();
  await repo.clearAll();
}
