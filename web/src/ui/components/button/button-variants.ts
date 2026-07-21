/**
 * Button 组件变体定义
 *
 * 功能概述：
 * 使用 class-variance-authority (CVA) 定义 Button 组件的所有视觉变体。
 * CVA 是一种用于管理组件变体的轻量库，通过声明式配置生成对应类名，
 * 相比手写 switch/三元表达式更易维护与扩展。
 *
 * 设计原则：
 * - 所有变体类名基于 Design Tokens（bg-primary-500、text-text-inverse 等）
 * - 通过 dark: 前缀提供暗色模式适配
 * - focus-visible 使用 outline-hidden + ring 替代默认描边
 * - disabled 状态统一使用 opacity-60 + pointer-events-none
 */

import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Button 变体配置
 *
 * base: 共享基础类（布局、字体、过渡、焦点态、禁用态）
 * variants: 可组合的视觉维度（variant + size）
 * defaultVariants: 未指定时使用的默认值
 */
export const buttonVariants = cva(
  // 基础类：内联弹性布局、字体中等、过渡动画、焦点环、禁用态
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60',
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
        default:
          'bg-primary-600 text-text-inverse shadow-sm hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
        destructive:
          'bg-error text-text-inverse shadow-sm hover:bg-error-dark dark:bg-error dark:hover:bg-error-dark',
        outline:
          'border border-border bg-background text-text-primary shadow-sm hover:bg-hover hover:text-text-primary dark:border-border dark:bg-background dark:hover:bg-hover',
        secondary:
          'bg-secondary-500 text-text-inverse shadow-sm hover:bg-secondary-600 dark:bg-secondary-400 dark:hover:bg-secondary-500',
        ghost: 'text-text-primary hover:bg-hover hover:text-text-primary dark:hover:bg-hover',
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
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-md px-8',
        icon: 'size-10',
      },
    },
    // 默认变体：未指定 variant/size 时使用
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Button 变体 Props 类型
 *
 * 通过 VariantProps 自动从 cva 配置中推导出 variant/size 的联合类型，
 * 避免手写枚举与 cva 配置不同步。
 */
export type ButtonVariants = VariantProps<typeof buttonVariants>;
