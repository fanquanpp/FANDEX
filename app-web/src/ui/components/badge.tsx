/**
 * Badge 徽标组件
 *
 * 功能概述：
 * - 基于 cva（class-variance-authority）定义多套变体样式
 * - 支持 4 种 variants：default/secondary/destructive/outline
 * - 用于状态标记、计数显示、分类标签
 * - 简洁紧凑的视觉表达
 *
 * 使用示例：
 *   <Badge>默认</Badge>
 *   <Badge variant="secondary">次级</Badge>
 *   <Badge variant="destructive">危险</Badge>
 *   <Badge variant="outline">描边</Badge>
 */

import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Badge 变体配置
 *
 * base: 共享基础类（内联、圆角、字号、边框、过渡）
 * variants: 4 种视觉风格
 */
const badgeVariants = cva(
  // 基础样式：内联布局、圆角、字号、边框、过渡动画、焦点环
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
        // 默认：主色背景 + 主色前景
        default:
          'border-transparent bg-primary-600 text-text-inverse hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        // 次级：辅助色背景
        secondary:
          'border-transparent bg-secondary-500 text-text-inverse hover:bg-secondary-600 dark:bg-secondary-400 dark:hover:bg-secondary-500',
        // 危险：错误色背景
        destructive:
          'border-transparent bg-error text-text-inverse hover:bg-error-dark dark:bg-error dark:hover:bg-error-dark',
        // 描边：透明背景
        outline:
          'border-border text-text-primary hover:bg-hover dark:border-border dark:hover:bg-hover',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Badge 组件 Props 类型 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge 徽标组件
 *
 * @param props.className - 外部类名
 * @param props.variant - 视觉变体（default/secondary/destructive/outline）
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

export default Badge;
