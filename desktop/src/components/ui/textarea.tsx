/**
 * Textarea 多行文本输入组件
 *
 * 功能概述：
 * - 基于原生 <textarea> 元素封装
 * - 统一聚焦边框、占位符样式、禁用样式
 * - 自动适配高度（通过外部控制 rows 属性）
 *
 * 使用示例：
 *   <Textarea placeholder="请输入内容" rows={4} />
 *   <Textarea value={text} onChange={(e) => setText(e.target.value)} />
 */

import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Textarea 组件 Props 类型 */
export type TextareaProps = React.ComponentProps<'textarea'>;

/**
 * Textarea 多行文本输入组件
 *
 * @param props.className - 外部类名
 * @param props.rows - 显示行数
 * @param ref - React ref 引用
 */
function Textarea({ className, ref, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // 弹性布局、最小高度、宽度撑满、圆角、边框、内边距
        'flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm',
        // 占位符样式
        'placeholder:text-muted-foreground',
        // 聚焦状态
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        // 禁用状态
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
}

export { Textarea };

export default Textarea;
