/**
 * Button 组件
 *
 * 功能概述：
 * - 基于 cva（class-variance-authority）定义多套变体样式
 * - 支持 asChild 模式（通过 Radix Slot 将样式应用到子元素）
 * - 支持 5 种 variants：default/destructive/outline/secondary/ghost/link
 * - 支持 4 种 sizes：default/sm/lg/icon
 * - 使用 React 19 函数组件 + ref prop 模式（无需 forwardRef）
 *
 * 使用示例：
 *   <Button>Click me</Button>
 *   <Button variant="outline" size="sm">Cancel</Button>
 *   <Button asChild><a href="/home">Home</a></Button>
 */

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Button 变体样式定义 */
const buttonVariants = cva(
  // 基础样式：内联布局、居中、字体中等、过渡动画、焦点环
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        // 默认：主色背景
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        // 危险动作：红色背景
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        // 描边：透明背景 + 边框
        outline:
          'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        // 次要：次色背景
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        // 幽灵：透明背景，悬停时显示背景
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        // 链接：无边框，文字样式
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // 默认尺寸
        default: 'h-9 px-4 py-2',
        // 小尺寸
        sm: 'h-8 rounded-md px-3 text-xs',
        // 大尺寸
        lg: 'h-10 rounded-md px-8',
        // 图标按钮（正方形）
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

/** Button 组件 Props 类型 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** 是否将样式应用到子元素（用于 asChild 模式） */
  asChild?: boolean;
  /** React ref 引用 */
  ref?: React.Ref<HTMLButtonElement>;
}

/**
 * Button 按钮组件
 *
 * @param props - 组件属性
 * @param props.className - 外部传入的类名，会与变体样式合并
 * @param props.variant - 视觉变体（default/destructive/outline/secondary/ghost/link）
 * @param props.size - 尺寸（default/sm/lg/icon）
 * @param props.asChild - 是否启用 asChild 模式（样式应用到子元素）
 * @param ref - React ref 引用
 */
function Button({ className, variant, size, asChild = false, ref, ...props }: ButtonProps) {
  // 根据 asChild 选择 Slot 或 button 元素
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
}

export { Button, buttonVariants };
export default Button;
