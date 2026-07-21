/**
 * QuizBlock 测验题目组件（React Island）
 *
 * 功能概述：
 * - 支持三种题型：填空（fill）/ 选择（choice）/ 判断正误（correct）
 * - 基于 Quiz discriminated union 类型实现类型安全的题型分支渲染
 * - 完整的作答流程：题目展示 → 用户作答 → 提交判定 → 结果展示 → 答案解释
 * - 结果统计：已答题数、正确数、正确率、得分
 * - 重置功能：清空当前题目作答状态重新作答
 * - Motion 过渡动画：题目切换、结果显示的淡入缩放
 * - 基于 shadcn/ui Button / Input / Label 组件
 * - 完整无障碍：aria-live 播报结果、键盘可操作
 *
 * 使用方式（Astro island）：
 *   <QuizBlock client:visible quiz={quizData} />
 *
 * 数据流：
 * 1. 组件接收 quiz props（Quiz 联合类型）
 * 2. 用户作答后调用判定函数，更新本地 attempts 状态
 * 3. 显示判定结果与答案解释
 * 4. 重置按钮清空作答状态
 */

import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import type { Quiz, QuizChoice, QuizCorrect, QuizFill } from '@/types/quiz';

/** QuizBlock 组件 Props 类型 */
export interface QuizBlockProps {
  /** 题目数据 */
  quiz: Quiz;
  /** 额外类名 */
  className?: string;
  /** 题号（可选，用于多题场景的序号展示） */
  index?: number;
}

/** 作答状态 */
interface AttemptState {
  /** 用户作答内容（题型相关） */
  userAnswer: string | number | number[] | boolean;
  /** 是否正确 */
  isCorrect: boolean;
  /** 是否已提交 */
  submitted: boolean;
}

/**
 * 判定填空题答案是否正确
 *
 * 实现说明：
 * - 忽略大小写与首尾空白
 * - 标准答案与用户答案均去除空白后比对
 *
 * @param quiz - 填空题数据
 * @param userAnswer - 用户输入
 * @returns 是否正确
 */
function checkFillAnswer(quiz: QuizFill, userAnswer: string): boolean {
  const normalized = userAnswer.trim().toLowerCase();
  const expected = quiz.answer.trim().toLowerCase();
  return normalized === expected;
}

/**
 * 判定选择题答案是否正确
 *
 * 实现说明：
 * - 单选（number）：直接比较索引
 * - 多选（number[]）：转换为 Set 后无序比较
 *
 * @param quiz - 选择题数据
 * @param userAnswer - 用户选择（单选为 number，多选为 number[]）
 * @returns 是否正确
 */
function checkChoiceAnswer(quiz: QuizChoice, userAnswer: number | number[]): boolean {
  if (Array.isArray(quiz.answer)) {
    // 多选题：无序集合比对
    const expectedSet = new Set(quiz.answer);
    const userSet = new Set(Array.isArray(userAnswer) ? userAnswer : [userAnswer]);
    if (expectedSet.size !== userSet.size) return false;
    for (const idx of expectedSet) {
      if (!userSet.has(idx)) return false;
    }
    return true;
  }
  // 单选题：直接比较
  return !Array.isArray(userAnswer) && userAnswer === quiz.answer;
}

/**
 * 判定判断题答案是否正确
 *
 * @param quiz - 判断题数据
 * @param userAnswer - 用户判断
 * @returns 是否正确
 */
function checkCorrectAnswer(quiz: QuizCorrect, userAnswer: boolean): boolean {
  return userAnswer === quiz.isCorrect;
}

/**
 * 根据题型获取题干标签
 */
function getQuizTypeLabel(quiz: Quiz): string {
  if (quiz.type === 'fill') return '填空题';
  if (quiz.type === 'choice') return quiz.multiple ? '多选题' : '单选题';
  return '判断题';
}

/**
 * QuizBlock 测验题目组件
 *
 * @param props.quiz - 题目数据
 * @param props.className - 外部类名
 * @param props.index - 题号
 */
export function QuizBlock({ quiz, className, index }: QuizBlockProps) {
  /** 当前作答状态 */
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  /** 填空题输入值 */
  const [fillInput, setFillInput] = useState('');
  /** 选择题单选选中索引 */
  const [singleChoice, setSingleChoice] = useState<number | null>(null);
  /** 选择题多选选中索引集合 */
  const [multiChoice, setMultiChoice] = useState<Set<number>>(new Set());
  /** 判断题当前选择（true/false） */
  const [correctChoice, setCorrectChoice] = useState<boolean | null>(null);

  /** 重置当前题目作答状态 */
  const handleReset = useCallback(() => {
    setAttempt(null);
    setFillInput('');
    setSingleChoice(null);
    setMultiChoice(new Set());
    setCorrectChoice(null);
  }, []);

  /** 切换多选项 */
  const toggleMultiChoice = useCallback((idx: number) => {
    setMultiChoice((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  /** 提交作答 */
  const handleSubmit = useCallback(() => {
    let userAnswer: string | number | number[] | boolean;
    let isCorrect = false;

    if (quiz.type === 'fill') {
      userAnswer = fillInput;
      isCorrect = checkFillAnswer(quiz, fillInput);
    } else if (quiz.type === 'choice') {
      if (quiz.multiple) {
        const sorted = Array.from(multiChoice).sort((a, b) => a - b);
        userAnswer = sorted;
        isCorrect = checkChoiceAnswer(quiz, sorted);
      } else {
        userAnswer = singleChoice ?? -1;
        isCorrect = checkChoiceAnswer(quiz, singleChoice ?? -1);
      }
    } else {
      // correct
      userAnswer = correctChoice ?? false;
      isCorrect = checkCorrectAnswer(quiz, correctChoice ?? false);
    }

    setAttempt({
      userAnswer,
      isCorrect,
      submitted: true,
    });
  }, [quiz, fillInput, singleChoice, multiChoice, correctChoice]);

  /** 是否可提交（用户已作答） */
  const canSubmit = useMemo(() => {
    if (attempt?.submitted) return false;
    if (quiz.type === 'fill') return fillInput.trim().length > 0;
    if (quiz.type === 'choice') {
      return quiz.multiple ? multiChoice.size > 0 : singleChoice !== null;
    }
    return correctChoice !== null;
  }, [quiz, attempt, fillInput, singleChoice, multiChoice, correctChoice]);

  /** 题型标签 */
  const typeLabel = getQuizTypeLabel(quiz);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        'rounded-xl border bg-card p-5 shadow-sm',
        'hover:shadow-md transition-shadow',
        className,
      )}
    >
      {/* 题目头部：题号 + 题型标签 */}
      <div className="flex items-center gap-2 mb-3">
        {typeof index === 'number' && (
          <span className="text-sm font-medium text-muted-foreground">第 {index + 1} 题</span>
        )}
        <Badge variant="secondary">{typeLabel}</Badge>
        {attempt?.submitted && (
          <Badge
            variant={attempt.isCorrect ? 'default' : 'destructive'}
            className={cn(
              attempt.isCorrect
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                : '',
            )}
          >
            {attempt.isCorrect ? '回答正确' : '回答错误'}
          </Badge>
        )}
      </div>

      {/* 题干 */}
      <p className="text-base font-medium leading-relaxed mb-4">{quiz.question}</p>

      {/* 作答区域：根据题型分支渲染 */}
      <AnimatePresence mode="wait">
        {quiz.type === 'fill' && (
          <motion.div
            key="fill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <Label htmlFor={`quiz-fill-${index ?? 0}`} className="sr-only">
              填空答案
            </Label>
            <Input
              id={`quiz-fill-${index ?? 0}`}
              type="text"
              value={fillInput}
              onChange={(e) => setFillInput(e.target.value)}
              placeholder="请输入答案"
              disabled={attempt?.submitted}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSubmit) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </motion.div>
        )}

        {quiz.type === 'choice' && (
          <motion.div
            key="choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {quiz.options.map((option, idx) => {
              const isSelected = quiz.multiple ? multiChoice.has(idx) : singleChoice === idx;
              const showCorrect = attempt?.submitted;
              const isCorrectOption = Array.isArray(quiz.answer)
                ? quiz.answer.includes(idx)
                : quiz.answer === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={attempt?.submitted}
                  onClick={() => {
                    if (quiz.multiple) {
                      toggleMultiChoice(idx);
                    } else {
                      setSingleChoice(idx);
                    }
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-md border transition-colors',
                    'flex items-start gap-2',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected ? 'border-primary bg-primary/5' : 'border-input hover:bg-accent/50',
                    showCorrect && isCorrectOption && 'border-emerald-500 bg-emerald-500/10',
                    showCorrect && isSelected && !isCorrectOption && 'border-red-500 bg-red-500/10',
                  )}
                  aria-pressed={isSelected}
                >
                  <span className="text-xs font-mono text-muted-foreground mt-0.5">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="flex-1 text-sm">{option}</span>
                </button>
              );
            })}
          </motion.div>
        )}

        {quiz.type === 'correct' && (
          <motion.div
            key="correct"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex gap-2"
          >
            <Button
              type="button"
              variant={correctChoice === true ? 'default' : 'outline'}
              disabled={attempt?.submitted}
              onClick={() => setCorrectChoice(true)}
              className="flex-1"
            >
              正确
            </Button>
            <Button
              type="button"
              variant={correctChoice === false ? 'default' : 'outline'}
              disabled={attempt?.submitted}
              onClick={() => setCorrectChoice(false)}
              className="flex-1"
            >
              错误
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 答案解释区域：仅在已提交后显示 */}
      <AnimatePresence>
        {attempt?.submitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'mt-4 p-3 rounded-md border text-sm',
                attempt.isCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-red-500/30 bg-red-500/5',
              )}
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2">
                {attempt.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <div className="flex-1 space-y-1.5">
                  {!attempt.isCorrect && (
                    <div>
                      <span className="font-medium">正确答案：</span>
                      {quiz.type === 'fill' && <span className="font-mono">{quiz.answer}</span>}
                      {quiz.type === 'choice' && (
                        <span>
                          {Array.isArray(quiz.answer)
                            ? quiz.answer.map((i) => String.fromCharCode(65 + i)).join('、')
                            : String.fromCharCode(65 + quiz.answer)}
                        </span>
                      )}
                      {quiz.type === 'correct' && <span>{quiz.isCorrect ? '正确' : '错误'}</span>}
                    </div>
                  )}
                  {quiz.type === 'correct' && !quiz.isCorrect && quiz.correction && (
                    <div>
                      <span className="font-medium">修正：</span>
                      {quiz.correction}
                    </div>
                  )}
                  {quiz.explanation && (
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">解析：</span>
                      {quiz.explanation}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 操作按钮：提交 / 重置 */}
      <div className="flex justify-end gap-2 mt-4">
        {attempt?.submitted ? (
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
            提交答案
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export default QuizBlock;
