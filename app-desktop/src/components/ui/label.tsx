/**
 * Label 标签组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-label 实现无障碍标签
 * - 与表单控件（input、textarea 等）通过 htmlFor 关联
 * - 支持禁用状态样式
 *
 * 使用示例：
 *   <Label htmlFor="email">邮箱</Label>
 *   <Input id="email" type="email" />
 */

import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Label 变体样式定义 */
const labelVariants = cva(
  // 基础样式：内联布局、间距、文字样式
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

/** Label 组件 Props 类型 */
export interface LabelProps
  extends React.ComponentProps<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {}

/**
 * Label 标签组件
 *
 * @param props.className - 外部类名
 * @param props.htmlFor - 关联控件的 id
 * @param ref - React ref 引用
 */
function Label({ className, ref, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      ref={ref}
      className={cn(labelVariants(), className)}
      {...props}
    />
  );
}

export { Label };

export default Label;
