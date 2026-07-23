/**
 * Badge 徽标组件
 *
 * 功能概述：
 * - 基于 cva 定义多套变体样式
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

import { cn } from '@/lib/cn';

/** Badge 变体样式定义 */
const badgeVariants = cva(
  // 基础样式：内联布局、居中、圆角、过渡动画、焦点环
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        // 默认：主色背景 + 主色前景
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        // 次级：次色背景
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        // 危险：红色背景
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        // 描边：透明背景
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

/** Badge 组件 Props 类型 */
export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Badge 徽标组件
 *
 * @param props.className - 外部类名
 * @param props.variant - 视觉变体（default/secondary/destructive/outline）
 */
function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

export default Badge;
