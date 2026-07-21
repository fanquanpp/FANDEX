/**
 * Badge 组件变体定义
 *
 * 功能概述：
 * 使用 class-variance-authority 定义 Badge 小标签的视觉变体。
 * Badge 用于状态标记、计数、分类标签等场景。
 */

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Badge 变体配置
 *
 * base: 共享基础类（内联、圆角、字号、边框、过渡）
 * variants: 4 种视觉风格
 */
export const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-fast ease-out focus:outline-hidden',
  {
    variants: {
      /**
       * variant：视觉风格
       * - default：主品牌色实心标签，用于强调
       * - secondary：辅助色实心标签，用于次级标记
       * - destructive：错误色实心标签，用于失败/危险状态
       * - outline：描边标签，用于中性分类
       */
      variant: {
        default:
          'border-transparent bg-primary-600 text-text-inverse hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        secondary:
          'border-transparent bg-secondary-500 text-text-inverse hover:bg-secondary-600 dark:bg-secondary-400 dark:hover:bg-secondary-500',
        destructive:
          'border-transparent bg-error text-text-inverse hover:bg-error-dark dark:bg-error dark:hover:bg-error-dark',
        outline:
          'border-border text-text-primary hover:bg-hover dark:border-border dark:hover:bg-hover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export type BadgeVariants = VariantProps<typeof badgeVariants>;
