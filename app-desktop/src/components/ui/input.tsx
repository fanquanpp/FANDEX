/**
 * Input 输入框组件
 *
 * 功能概述：
 * - 基于原生 <input> 元素封装
 * - 统一聚焦边框、占位符样式、禁用样式
 * - 支持文件类型特化样式
 * - 完整的焦点环支持与无障碍属性
 *
 * 使用示例：
 *   <Input type="text" placeholder="请输入" />
 *   <Input type="email" required />
 *   <Input type="file" />
 */

import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Input 组件 Props 类型 */
export type InputProps = React.ComponentProps<'input'>;

/**
 * Input 输入框组件
 *
 * @param props.className - 外部类名
 * @param props.type - 输入类型（text/email/password/file 等）
 * @param ref - React ref 引用
 */
function Input({ className, type, ref, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 弹性布局、固定高度、宽度撑满、圆角、边框、内边距
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        // 占位符样式
        'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground',
        // 文件类型特化
        'file:hover:bg-accent',
        // 聚焦状态
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // 禁用状态
        'disabled:cursor-not-allowed disabled:opacity-50',
        // 不同类型的宽度调整
        type !== 'file' && 'w-full',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Input };

export default Input;
