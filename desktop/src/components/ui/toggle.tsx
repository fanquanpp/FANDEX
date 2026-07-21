/**
 * Toggle 开关组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-toggle 实现无障碍开关
 * - 支持 pressed（激活）状态切换
 * - 包含 default/outline 两种 variants
 * - 包含 sm/default/lg 三种 sizes
 * - 适用于收藏、点赞、显示/隐藏 等单值切换场景
 *
 * 使用示例：
 *   <Toggle aria-label="收藏">收藏</Toggle>
 *   <Toggle variant="outline" size="sm" pressed>已激活</Toggle>
 */

import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Toggle 变体样式定义 */
const toggleVariants = cva(
  // 基础样式：内联布局、居中、圆角、过渡动画
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 默认：透明背景
        default: 'bg-transparent',
        // 描边：带边框
        outline:
          'border border-input bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        // 默认尺寸
        default: 'h-9 px-2 min-w-9',
        // 小尺寸
        sm: 'h-8 px-1.5 min-w-8',
        // 大尺寸
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Toggle 组件 Props 类型 */
export interface ToggleProps
  extends React.ComponentProps<typeof TogglePrimitive.Root>,
    VariantProps<typeof toggleVariants> {}

/**
 * Toggle 开关组件
 *
 * @param props.className - 外部类名
 * @param props.variant - 视觉变体（default/outline）
 * @param props.size - 尺寸（sm/default/lg）
 * @param ref - React ref 引用
 */
function Toggle({ className, variant, size, ref, ...props }: ToggleProps) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      ref={ref}
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };

export default Toggle;
