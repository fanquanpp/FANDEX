/**
 * Button 按钮组件
 *
 * 功能概述：
 * - 基于 cva（class-variance-authority）定义多套变体样式
 * - 支持 asChild 模式（通过 Radix Slot 将样式应用到子元素）
 * - 支持 6 种 variants：default/destructive/outline/secondary/ghost/link
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

import { cn } from '@/lib/utils';

/**
 * Button 变体配置
 *
 * base: 共享基础类（布局、字体、过渡、焦点态、禁用态）
 * variants: 可组合的视觉维度（variant + size）
 * defaultVariants: 未指定时使用的默认值
 */
const buttonVariants = cva(
  // 基础类：内联弹性布局、字体中等、过渡动画、焦点环、禁用态
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      /**
       * variant：视觉风格
       * - default：主品牌色实心按钮，用于主要操作
       * - destructive：错误色实心按钮，用于删除/危险操作
       * - outline：描边按钮，用于次要操作
       * - secondary：辅助色实心按钮，用于次级操作
       * - ghost：透明背景，仅悬停时显示底色，用于工具栏
       * - link：链接样式，用于内嵌导航
       */
      variant: {
        // 默认：主色背景
        default:
          'bg-primary-600 text-text-inverse shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        // 危险动作：错误色背景
        destructive:
          'bg-error text-text-inverse shadow-sm hover:bg-error-dark dark:bg-error dark:hover:bg-error-dark',
        // 描边：透明背景 + 边框
        outline:
          'border border-border bg-background text-text-primary shadow-sm hover:bg-hover hover:text-text-primary dark:border-border dark:bg-background dark:hover:bg-hover',
        // 次要：辅助色背景
        secondary:
          'bg-secondary-500 text-text-inverse shadow-sm hover:bg-secondary-600 dark:bg-secondary-400 dark:hover:bg-secondary-500',
        // 幽灵：透明背景，悬停时显示背景
        ghost: 'text-text-primary hover:bg-hover hover:text-text-primary dark:hover:bg-hover',
        // 链接：无边框，文字样式
        link: 'text-primary-600 underline-offset-4 hover:underline dark:text-primary-400',
      },
      /**
       * size：尺寸
       * - default：标准 40px 高度
       * - sm：紧凑 32px 高度
       * - lg：宽松 44px 高度
       * - icon：正方形图标按钮，用于纯图标触发器
       */
      size: {
        // 默认尺寸
        default: 'h-10 px-4 py-2',
        // 小尺寸
        sm: 'h-8 rounded-md px-3 text-xs',
        // 大尺寸
        lg: 'h-11 rounded-md px-8',
        // 图标按钮（正方形）
        icon: 'size-10',
      },
    },
    // 默认变体：未指定 variant/size 时使用
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
