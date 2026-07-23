/**
 * 知识检测组件 (QuizBlock)
 * ========================
 * 功能概述：
 * - 支持三种题型：填空题(fill)、选择题(choice)、代码修正题(fix)
 * - 提交后显示对错反馈、参考答案和解析
 * - 选择题选中即自动提交，填空题和修正题需手动点击提交
 * - 修正题无法自动判题，结果为 null（中性状态）
 *
 * 数据流：
 * - 外部通过 quiz prop 传入题目数组
 * - 用户输入/选择 → answers/selectedOption(state) → submitAnswer() → results(state)
 * - results 驱动反馈区域显示和题目卡片样式
 *
 * 事件处理：
 * - 填空题：输入框 Enter 键或点击提交按钮 → submitAnswer()
 * - 选择题：点击选项 → selectOption() → 自动调用 submitAnswer()
 * - 修正题：点击提交按钮 → submitAnswer()
 *
 * 判题逻辑：
 * - 填空题：忽略大小写的精确匹配
 * - 选择题：比较选项索引
 * - 修正题：无法自动判断，结果为 null
 *
 * 使用场景：
 * - 在文档页面末尾嵌入知识检测，帮助学习者巩固所学内容
 * - 配合 Astro 岛屿架构，仅客户端交互
 */
import { useState, useCallback } from 'react';
import '@/styles/islands/QuizBlock.css';

// ========== 题目类型定义 ==========

/** 填空题：用户输入文本答案，忽略大小写精确匹配 */
interface FillQ {
  /** 题型标识 */
  type: 'fill';
  /** 题目文字 */
  question: string;
  /** 正确答案 */
  answer: string;
  /** 答错时显示的提示（显式包含 undefined 以匹配 Zod optional 推导类型，适配 exactOptionalPropertyTypes） */
  hint?: string | undefined;
}

/** 选择题：从多个选项中选择一个正确答案 */
interface ChoiceQ {
  /** 题型标识 */
  type: 'choice';
  /** 题目文字 */
  question: string;
  /** 选项列表 */
  options: string[];
  /** 正确答案的选项索引（从0开始） */
  answer: number;
  /** 提交后显示的解析说明（显式包含 undefined 以匹配 Zod optional 推导类型） */
  explanation?: string | undefined;
}

/** 代码修正题：展示有错误的代码，用户输入修正后的代码或说明 */
interface FixQ {
  /** 题型标识 */
  type: 'fix';
  /** 题目文字 */
  question: string;
  /** 待修正的原始代码（显式包含 undefined 以匹配 Zod optional 推导类型） */
  code?: string | undefined;
  /** 参考答案（修正后的代码或说明） */
  answer: string;
  /** 提交后显示的解析说明（显式包含 undefined 以匹配 Zod optional 推导类型） */
  explanation?: string | undefined;
}

/** 题目联合类型：三种题型的联合 */
type QuizItem = FillQ | ChoiceQ | FixQ;

/**
 * 组件属性
 * @prop quiz - 题目数组，支持填空题、选择题、代码修正题三种题型
 */
interface QuizBlockProps {
  /** 题目数组，每项为填空题、选择题或代码修正题 */
  quiz: QuizItem[];
}

/**
 * 知识检测组件
 * 支持填空、选择、代码修正三种题型，提交后显示对错反馈与解析
 */
export function QuizBlock({ quiz }: QuizBlockProps) {
  // ========== 响应式状态 ==========

  /**
   * 用户输入的答案（填空题/修正题共用）
   * 键为题目索引，值为用户输入的文本
   */
  const [answers, setAnswers] = useState<Record<number, string>>({});

  /**
   * 选择题选中的选项索引
   * 键为题目索引，值为选项索引（从0开始）
   */
  const [selectedOption, setSelectedOption] = useState<Record<number, number>>({});

  /**
   * 是否已提交
   * 键为题目索引，值为 true（已提交）
   * 提交后禁用输入和按钮，防止重复提交
   */
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});

  /**
   * 判题结果
   * 键为题目索引，值为：
   *   - true：答案正确
   *   - false：答案错误
   *   - null：无法自动判断（修正题）
   */
  const [results, setResults] = useState<Record<number, boolean | null>>({});

  // ========== 方法 ==========

  /**
   * 获取题目类型的中文标签
   * 用于在题目行中显示题型标签
   * @param type - 题型标识（'fill' | 'choice' | 'fix'）
   * @returns 中文标签（'填空' | '选择' | '修正'）
   */
  const typeLabel = useCallback((type: string) => {
    const map: Record<string, string> = { fill: '填空', choice: '选择', fix: '修正' };
    return map[type] || type;
  }, []);

  /**
   * 提交答案并判题
   * 根据题型采用不同的判题逻辑：
   *   - 填空题：忽略大小写的精确匹配（trim + toLowerCase）
   *   - 选择题：比较用户选中的选项索引与正确答案索引
   *   - 修正题：无法自动判断，结果设为 null
   * @param qi - 题目索引
   */
  const submitAnswer = useCallback(
    (qi: number) => {
      setSubmitted((prev) => ({ ...prev, [qi]: true }));
      const q = quiz[qi];
      if (q.type === 'fill') {
        // 填空题：忽略大小写比较，去除首尾空格
        setResults((prev) => {
          const userAns = (answers[qi] || '').trim().toLowerCase();
          const correctAns = q.answer.trim().toLowerCase();
          return { ...prev, [qi]: userAns === correctAns };
        });
      } else if (q.type === 'choice') {
        // 选择题：比较选项索引
        setResults((prev) => ({ ...prev, [qi]: selectedOption[qi] === q.answer }));
      } else {
        // 修正题：无法自动判断，标记为中性状态
        setResults((prev) => ({ ...prev, [qi]: null }));
      }
    },
    [quiz, answers, selectedOption]
  );

  /**
   * 选择题：选中选项后立即提交
   * 选择题无需手动点击提交按钮，选中即自动判题
   * @param qi - 题目索引
   * @param oi - 选项索引
   */
  const selectOption = useCallback(
    (qi: number, oi: number) => {
      setSelectedOption((prev) => ({ ...prev, [qi]: oi }));
      // 选中后立即提交判题（需在下一轮渲染后读取最新的 selectedOption）
      // 使用 setSubmitted + setResults 直接计算，避免依赖未更新的 state
      setSubmitted((prev) => ({ ...prev, [qi]: true }));
      const q = quiz[qi];
      if (q.type === 'choice') {
        setResults((prev) => ({ ...prev, [qi]: oi === q.answer }));
      }
    },
    [quiz]
  );

  /**
   * 根据判题结果返回对应的 CSS 类名
   * 用于控制题目卡片的边框颜色
   * @param i - 题目索引
   * @returns CSS 类名：'result-correct'（正确）| 'result-wrong'（错误）| 'result-neutral'（中性）| ''（未提交）
   */
  const getResultClass = useCallback(
    (i: number) => {
      if (!submitted[i]) return '';
      if (results[i] === true) return 'result-correct';
      if (results[i] === false) return 'result-wrong';
      return 'result-neutral';
    },
    [submitted, results]
  );

  // 仅在有题目时渲染整个测验区域
  if (quiz.length === 0) return null;

  return (
    <div className="quiz-block">
      <h3 className="quiz-title">知识检测</h3>
      <div className="quiz-list">
        {/* 遍历题目列表，每题一个卡片，通过 getResultClass 添加对错样式 */}
        {quiz.map((q, i) => (
          <div key={i} className={`quiz-item ${getResultClass(i)}`}>
            {/* 题目行：序号圆圈 + 题型标签 + 题目文字 */}
            <div className="quiz-question">
              <span className="quiz-number">{i + 1}</span>
              <span className="quiz-type-badge">{typeLabel(q.type)}</span>
              {q.question}
            </div>

            {/* 填空题输入区：文本输入框 + 提交按钮 */}
            {q.type === 'fill' && (
              <div className="quiz-answer-area">
                {/* 填空题答案输入框：aria-label 动态包含题号，提供可访问名 */}
                <input
                  value={answers[i] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  className="quiz-input"
                  placeholder="输入答案..."
                  aria-label={`第 ${i + 1} 题填空答案输入`}
                  disabled={!!submitted[i]}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter') submitAnswer(i);
                  }}
                />
                {/* 未提交时显示提交按钮 */}
                {!submitted[i] && (
                  <button className="quiz-submit-btn" onClick={() => submitAnswer(i)}>
                    提交
                  </button>
                )}
              </div>
            )}

            {/* 选择题选项区：每个选项一个按钮，选中即提交 */}
            {q.type === 'choice' && (
              <div className="quiz-options">
                {q.options.map((opt, oi) => {
                  const isSelected = selectedOption[i] === oi;
                  const isCorrect = submitted[i] && oi === q.answer;
                  const isWrong = submitted[i] && selectedOption[i] === oi && oi !== q.answer;
                  const optionClass = `quiz-option${isSelected ? ' selected' : ''}${
                    isCorrect ? ' correct' : ''
                  }${isWrong ? ' wrong' : ''}`;
                  return (
                    <button
                      key={oi}
                      className={optionClass}
                      disabled={!!submitted[i]}
                      onClick={() => selectOption(i, oi)}
                    >
                      {/* 选项字母标识 A/B/C/D，通过 ASCII 码计算 */}
                      <span className="option-letter">{String.fromCharCode(65 + oi)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* 代码修正题输入区：展示待修正代码 + 文本域 + 提交按钮 */}
            {q.type === 'fix' && (
              <div className="quiz-answer-area">
                {/* 待修正的原始代码展示 */}
                {q.code && <pre className="quiz-code">{q.code}</pre>}
                {/* 修正题答案文本域：aria-label 动态包含题号，提供可访问名 */}
                <textarea
                  value={answers[i] ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                  }
                  className="quiz-textarea"
                  placeholder="输入修正后的代码或说明..."
                  aria-label={`第 ${i + 1} 题代码修正输入`}
                  disabled={!!submitted[i]}
                  rows={2}
                />
                {/* 未提交时显示提交按钮 */}
                {!submitted[i] && (
                  <button className="quiz-submit-btn" onClick={() => submitAnswer(i)}>
                    提交
                  </button>
                )}
              </div>
            )}

            {/* 提交后的反馈区域：对错标记 + 参考答案 + 解析 + 提示 */}
            {submitted[i] && (
              <div className="quiz-feedback">
                {/* 对错标记 */}
                {results[i] === true ? (
                  <span className="feedback-correct">正确</span>
                ) : (
                  <span className="feedback-wrong">不正确</span>
                )}
                {/* 填空题显示参考答案 */}
                {q.type === 'fill' && (
                  <span className="feedback-answer">参考答案: {q.answer}</span>
                )}
                {/* 修正题显示参考答案 */}
                {q.type === 'fix' && (
                  <span className="feedback-answer">参考答案: {q.answer}</span>
                )}
                {/* 解析说明（选择题和修正题可能有） */}
                {q.explanation && (
                  <span className="feedback-explanation">{q.explanation}</span>
                )}
                {/* 答错时显示提示 */}
                {q.type === 'fill' && q.hint && results[i] !== true && (
                  <span className="feedback-hint">提示: {q.hint}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default QuizBlock;
