/**
 * 习题相关类型定义
 *
 * 描述 FANDEX 文档中嵌入的习题与测验，支持填空、选择、代码修正、开放性问题四种题型。
 * 难度按 Bloom 分类法标注认知层次，配合学习目标形成完整学习闭环。
 */

/** 习题类型 */
export type ExerciseType = 'fill-blank' | 'choice' | 'code-fix' | 'open-ended';

/** 习题难度（Bloom 分类法） */
export type CognitiveLevel =
  'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

/** 习题基础接口 */
export interface Exercise {
  /** 习题 ID（模块内唯一） */
  id: string;
  /** 所属文档 slug */
  docSlug: string;
  /** 习题类型 */
  type: ExerciseType;
  /** 认知层次 */
  cognitiveLevel: CognitiveLevel;
  /** 题干 */
  question: string;
  /** 提示 */
  hint?: string;
  /** 参考答案 */
  answer: string;
  /** 答案解析 */
  explanation?: string;
  /** 难度系数（1-5） */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 预估完成时长（分钟） */
  estimatedTime?: number;
}

/** 填空题 */
export interface FillBlankExercise extends Exercise {
  /** 习题类型（固定为填空） */
  type: 'fill-blank';
  /** 空位数量 */
  blankCount: number;
  /** 标准答案（每个空位一个） */
  answers: string[];
  /** 是否大小写敏感 */
  caseSensitive: boolean;
}

/** 选择题 */
export interface ChoiceExercise extends Exercise {
  /** 习题类型（固定为选择） */
  type: 'choice';
  /** 选项列表 */
  options: string[];
  /** 正确选项索引（从 0 开始） */
  correctIndex: number;
  /** 是否多选 */
  multiple: boolean;
  /** 多选时的正确索引列表 */
  correctIndices?: number[];
}

/** 代码修正题 */
export interface CodeFixExercise extends Exercise {
  /** 习题类型（固定为代码修正） */
  type: 'code-fix';
  /** 含错误的代码 */
  buggyCode: string;
  /** 编程语言 */
  language: string;
  /** 修正后的代码 */
  fixedCode: string;
  /** 错误描述 */
  errorDescription: string;
}

/** 开放性问题 */
export interface OpenEndedExercise extends Exercise {
  /** 习题类型（固定为开放性问题） */
  type: 'open-ended';
  /** 参考要点（评分依据） */
  keyPoints: string[];
  /** 最低字数要求 */
  minWords?: number;
}

/** 习题作答记录 */
export interface ExerciseAttempt {
  /** 习题 ID */
  exerciseId: string;
  /** 作答时间 */
  attemptedAt: Date;
  /** 用户答案 */
  userAnswer: string;
  /** 是否正确 */
  isCorrect: boolean;
  /** 得分（0-100） */
  score?: number;
  /** 用时（秒） */
  timeSpentSeconds: number;
}

/** 测验（由多个习题组成） */
export interface Quiz {
  /** 测验 ID */
  id: string;
  /** 所属文档 slug */
  docSlug: string;
  /** 测验标题 */
  title: string;
  /** 测验描述 */
  description?: string;
  /** 习题列表 */
  exercises: Exercise[];
  /** 通过分数（0-100） */
  passingScore: number;
  /** 时间限制（分钟） */
  timeLimitMinutes?: number;
}
