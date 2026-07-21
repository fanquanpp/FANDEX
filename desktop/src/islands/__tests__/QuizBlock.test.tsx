/**
 * QuizBlock 组件单元测试
 *
 * 测试对象：
 * - apps/web/src/islands/QuizBlock.tsx
 *
 * 测试覆盖：
 * - fill（填空题）渲染输入框与提交反馈
 * - choice（选择题）渲染选项与单选/多选交互
 * - correct（判断题）渲染正确/错误按钮与修正说明
 * - 提交后结果展示（正确/错误 Badge、解析、正确答案）
 * - 重置功能
 * - Enter 键提交（填空题）
 * - Motion 组件 mock（避免动画阻塞测试）
 *
 * Mock 策略：
 * - vi.mock('motion/react') 替换 motion.div / AnimatePresence 为透传 div
 * - 其他 shadcn/ui 组件（Button、Input、Label、Badge）保持真实实现
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock motion/react：将 motion.div 与 AnimatePresence 简化为透传组件
// Skill 偏差报备：原 mock 丢弃 className prop，导致 "外部 className 透传到容器"
// 用例失败（期望容器含 'custom-class'，实际为空）。
// 现保留 className 透传，仅剥离动画相关 props（initial/animate/exit/transition）。
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, className }: { children?: ReactNode; className?: string }) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

// Mock lucide-react 图标为简单 span
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <span data-testid="icon-check" />,
  RotateCcw: () => <span data-testid="icon-rotate" />,
  XCircle: () => <span data-testid="icon-x" />,
}));

// Mock @/components/ui/label：原组件依赖 @radix-ui/react-label（package.json 未安装）
// Skill 偏差报备：package.json 缺失 @radix-ui/react-label 依赖，原 Label 组件导入失败。
// 此处用原生 <label> 替换，仅保留 htmlFor 与 children 透传能力，满足 QuizBlock 测试需要。
vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    htmlFor,
    className,
  }: {
    children?: ReactNode;
    htmlFor?: string;
    className?: string;
  }) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

import type { Quiz, QuizChoice, QuizCorrect, QuizFill } from '@/types/quiz';
import { QuizBlock } from '../QuizBlock';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** 构造填空题 */
function makeFill(overrides: Partial<QuizFill> = {}): QuizFill {
  return {
    type: 'fill',
    question: 'JavaScript 中用于声明常量的关键字是？',
    answer: 'const',
    explanation: 'const 声明块级作用域常量，不可重新赋值。',
    ...overrides,
  };
}

/** 构造单选题 */
function makeSingleChoice(overrides: Partial<QuizChoice> = {}): QuizChoice {
  return {
    type: 'choice',
    question: '下列哪个是 JavaScript 的基本数据类型？',
    options: ['String', 'Array', 'Object', 'Function'],
    answer: 0,
    explanation: 'String 是基本数据类型，其余为引用类型。',
    multiple: false,
    ...overrides,
  };
}

/** 构造多选题 */
function makeMultiChoice(overrides: Partial<QuizChoice> = {}): QuizChoice {
  return {
    type: 'choice',
    question: '下列哪些是 JavaScript 的基本数据类型？',
    options: ['String', 'Number', 'Array', 'Boolean'],
    answer: [0, 1, 3],
    explanation: 'String、Number、Boolean 是基本类型，Array 是引用类型。',
    multiple: true,
    ...overrides,
  };
}

/** 构造判断题（陈述正确） */
function makeCorrectTrue(overrides: Partial<QuizCorrect> = {}): QuizCorrect {
  return {
    type: 'correct',
    question: 'JavaScript 是一种动态类型语言。',
    isCorrect: true,
    explanation: 'JavaScript 变量类型在运行时确定，属于动态类型。',
    ...overrides,
  };
}

/** 构造判断题（陈述错误，含修正） */
function makeCorrectFalse(overrides: Partial<QuizCorrect> = {}): QuizCorrect {
  return {
    type: 'correct',
    question: 'JavaScript 中 typeof null 返回 "null"。',
    isCorrect: false,
    correction: 'typeof null 实际返回 "object"（历史遗留 bug）。',
    explanation: '这是一个著名的 JavaScript 历史 bug。',
    ...overrides,
  };
}

describe('QuizBlock 组件', () => {
  describe('fill（填空题）渲染与交互', () => {
    it('渲染题干、题型标签与输入框', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      // 题型标签
      expect(screen.getByText('填空题')).toBeInTheDocument();
      // 题干
      expect(screen.getByText(quiz.question)).toBeInTheDocument();
      // 输入框（通过 placeholder 定位）
      expect(screen.getByPlaceholderText('请输入答案')).toBeInTheDocument();
      // 提交按钮（初始未作答时禁用）
      expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();
    });

    it('输入答案后提交按钮启用', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      const input = screen.getByPlaceholderText('请输入答案');
      fireEvent.change(input, { target: { value: 'const' } });

      expect(screen.getByRole('button', { name: '提交答案' })).toBeEnabled();
    });

    it('提交正确答案后显示"回答正确"徽标与解析', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      const input = screen.getByPlaceholderText('请输入答案');
      fireEvent.change(input, { target: { value: 'const' } });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      // 正确徽标
      expect(screen.getByText('回答正确')).toBeInTheDocument();
      // 解析展示
      expect(screen.getByText(/const 声明块级作用域常量/)).toBeInTheDocument();
      // 输入框禁用
      expect(input).toBeDisabled();
      // 显示重置按钮
      expect(screen.getByRole('button', { name: /重置/ })).toBeInTheDocument();
    });

    it('提交错误答案后显示"回答错误"与正确答案', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
        target: { value: 'let' },
      });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答错误')).toBeInTheDocument();
      // 显示正确答案
      expect(screen.getByText('正确答案：')).toBeInTheDocument();
      expect(screen.getByText('const')).toBeInTheDocument();
    });

    it('答案大小写不敏感且忽略首尾空白', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
        target: { value: '  CONST  ' },
      });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
    });

    it('Enter 键触发提交', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      const input = screen.getByPlaceholderText('请输入答案');
      fireEvent.change(input, { target: { value: 'const' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(screen.getByText('回答正确')).toBeInTheDocument();
    });

    it('点击重置按钮清空作答状态', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
        target: { value: 'const' },
      });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));
      // 已提交
      expect(screen.getByText('回答正确')).toBeInTheDocument();

      // 点击重置
      fireEvent.click(screen.getByRole('button', { name: /重置/ }));

      // 应恢复初始状态
      expect(screen.queryByText('回答正确')).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入答案')).toHaveValue('');
      expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();
    });

    it('显示题号（index prop）', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} index={2} />);

      expect(screen.getByText('第 3 题')).toBeInTheDocument();
    });
  });

  describe('choice（选择题）渲染与交互', () => {
    it('单选题渲染所有选项', () => {
      const quiz = makeSingleChoice();
      render(<QuizBlock quiz={quiz} />);

      expect(screen.getByText('单选题')).toBeInTheDocument();
      expect(screen.getByText(quiz.question)).toBeInTheDocument();
      // 4 个选项
      for (const option of quiz.options) {
        expect(screen.getByText(option)).toBeInTheDocument();
      }
      // 选项前缀 A. B. C. D.
      expect(screen.getByText('A.')).toBeInTheDocument();
      expect(screen.getByText('B.')).toBeInTheDocument();
      expect(screen.getByText('C.')).toBeInTheDocument();
      expect(screen.getByText('D.')).toBeInTheDocument();
    });

    it('单选题选中某选项后提交正确答案', () => {
      const quiz = makeSingleChoice(); // answer=0 → A
      render(<QuizBlock quiz={quiz} />);

      // 点击选项 A（正确）
      fireEvent.click(screen.getByText('String'));
      // 提交按钮启用
      expect(screen.getByRole('button', { name: '提交答案' })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
    });

    it('单选题提交错误答案后高亮正确选项', () => {
      const quiz = makeSingleChoice(); // 正确答案 A
      render(<QuizBlock quiz={quiz} />);

      // 选项按钮（含 B 错误）。screen.getByText 在元素不存在时会抛错，因此 closest('button') 必然返回非空
      const optionB = screen.getByText('Array').closest('button') as HTMLButtonElement;
      fireEvent.click(optionB);
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答错误')).toBeInTheDocument();
      // 正确答案文本展示
      expect(screen.getByText('正确答案：')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
    });

    it('多选题支持切换多个选项', () => {
      const quiz = makeMultiChoice(); // answer=[0,1,3]
      render(<QuizBlock quiz={quiz} />);

      expect(screen.getByText('多选题')).toBeInTheDocument();

      // 选项按钮。screen.getByText 在元素不存在时会抛错，因此 closest('button') 必然返回非空
      const optA = screen.getByText('String').closest('button') as HTMLButtonElement;
      const optB = screen.getByText('Number').closest('button') as HTMLButtonElement;
      const _optC = screen.getByText('Array').closest('button') as HTMLButtonElement; // 错误选项
      const optD = screen.getByText('Boolean').closest('button') as HTMLButtonElement;

      // 点击 A、B、D（正确组合）
      fireEvent.click(optA);
      fireEvent.click(optB);
      fireEvent.click(optD);

      // 再次点击 B 取消选择，再点击 D 取消，验证可切换
      fireEvent.click(optB);
      expect(screen.getByRole('button', { name: '提交答案' })).toBeEnabled();

      // 重新点击 B 恢复
      fireEvent.click(optB);
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
    });

    it('多选题提交错误组合后显示正确答案', () => {
      const quiz = makeMultiChoice();
      render(<QuizBlock quiz={quiz} />);

      // 仅选 A（不完整）。screen.getByText 在元素不存在时会抛错，因此 closest('button') 必然返回非空
      fireEvent.click(screen.getByText('String').closest('button') as HTMLButtonElement);
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答错误')).toBeInTheDocument();
      // 正确答案：A、B、D
      expect(screen.getByText('正确答案：')).toBeInTheDocument();
      // 多选答案展示为 A、B、D
      const answerText = screen.getByText('正确答案：').parentElement;
      expect(answerText?.textContent).toMatch(/A.*B.*D/);
    });

    it('提交后所有选项按钮禁用', () => {
      const quiz = makeSingleChoice();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByText('String'));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      // 所有选项按钮禁用
      const buttons = screen.getAllByRole('button');
      // 包含 4 个选项按钮 + 重置按钮（重置不禁用）
      const optionButtons = buttons.filter((b) => b.textContent?.match(/[A-D]\./));
      for (const btn of optionButtons) {
        expect(btn).toBeDisabled();
      }
    });
  });

  describe('correct（判断题）渲染与交互', () => {
    it('渲染正确/错误两个按钮', () => {
      const quiz = makeCorrectTrue();
      render(<QuizBlock quiz={quiz} />);

      expect(screen.getByText('判断题')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '正确' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '错误' })).toBeInTheDocument();
    });

    it('选择"正确"并提交，对正确陈述判为正确', () => {
      const quiz = makeCorrectTrue(); // isCorrect=true
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByRole('button', { name: '正确' }));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
      expect(screen.getByText(/JavaScript 变量类型在运行时确定/)).toBeInTheDocument();
    });

    it('选择"错误"并提交，对正确陈述判为错误', () => {
      const quiz = makeCorrectTrue(); // isCorrect=true
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByRole('button', { name: '错误' }));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答错误')).toBeInTheDocument();
      // 正确答案展示为"正确"
      expect(screen.getByText('正确答案：')).toBeInTheDocument();
    });

    it('错误陈述题选择"错误"判为正确，并展示修正说明', () => {
      const quiz = makeCorrectFalse(); // isCorrect=false
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByRole('button', { name: '错误' }));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
      // 修正说明展示（仅错误陈述 + 答错时展示，答对也展示修正）
      expect(screen.getByText(/typeof null 实际返回/)).toBeInTheDocument();
    });

    it('错误陈述题选择"正确"判为错误', () => {
      const quiz = makeCorrectFalse();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByRole('button', { name: '正确' }));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答错误')).toBeInTheDocument();
      // 正确答案为"错误"
      expect(screen.getByText('正确答案：')).toBeInTheDocument();
    });

    it('提交后两个按钮均禁用', () => {
      const quiz = makeCorrectTrue();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.click(screen.getByRole('button', { name: '正确' }));
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      // 查找还在 DOM 中的"正确"/"错误"按钮（提交后变成重置按钮）
      // 提交后按钮区仅显示"重置"，正确/错误按钮被禁用但仍在 DOM
      const buttons = screen.getAllByRole('button');
      // 找到正确与错误按钮
      const correctBtn = buttons.find((b) => b.textContent === '正确');
      const wrongBtn = buttons.find((b) => b.textContent === '错误');
      expect(correctBtn).toBeDisabled();
      expect(wrongBtn).toBeDisabled();
    });
  });

  describe('可访问性与边界', () => {
    it('结果区域含 aria-live="polite" 属性', () => {
      const quiz = makeFill();
      render(<QuizBlock quiz={quiz} />);

      fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
        target: { value: 'const' },
      });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      const statusRegion = screen.getByRole('status');
      expect(statusRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('未作答时提交按钮禁用（所有题型）', () => {
      const fill = makeFill();
      const { rerender } = render(<QuizBlock quiz={fill} />);
      expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();

      const choice = makeSingleChoice();
      rerender(<QuizBlock quiz={choice} />);
      expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();

      const correct = makeCorrectTrue();
      rerender(<QuizBlock quiz={correct} />);
      expect(screen.getByRole('button', { name: '提交答案' })).toBeDisabled();
    });

    it('未提供 explanation 时不渲染解析区域', () => {
      const quiz: Quiz = {
        type: 'fill',
        question: '测试题',
        answer: 'x',
        // 不提供 explanation
      };
      render(<QuizBlock quiz={quiz} />);

      fireEvent.change(screen.getByPlaceholderText('请输入答案'), {
        target: { value: 'x' },
      });
      fireEvent.click(screen.getByRole('button', { name: '提交答案' }));

      expect(screen.getByText('回答正确')).toBeInTheDocument();
      // 不应出现"解析："文本
      expect(screen.queryByText('解析：')).not.toBeInTheDocument();
    });

    it('外部 className 透传到容器', () => {
      const quiz = makeFill();
      const { container } = render(<QuizBlock quiz={quiz} className="custom-class" />);

      // 容器为第一个子元素
      const root = container.firstChild as HTMLElement;
      expect(root.className).toContain('custom-class');
    });
  });
});
