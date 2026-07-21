/**
 * Spinner 加载指示器组件
 *
 * 功能概述：
 * - 使用 lucide-react 的 Loader2 图标
 * - 通过 animate-spin 实现旋转动画
 * - 支持不同尺寸与变体
 * - 适用于按钮内、内容区、全屏加载场景
 *
 * 使用示例：
 *   <Spinner />
 *   <Spinner className="h-6 w-6" />
 *   <Button disabled><Spinner className="mr-2 h-4 w-4" />加载中</Button>
 */

import { Loader2 } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Spinner 组件 Props 类型 */
export interface SpinnerProps extends React.ComponentProps<'svg'> {
  /** 尺寸类名（默认 h-4 w-4） */
  size?: string;
}

/**
 * Spinner 加载指示器组件
 *
 * @param props.className - 外部类名
 * @param props.size - 尺寸类名（默认 h-4 w-4）
 * @param ref - React ref 引用
 */
function Spinner({ className, size = 'h-4 w-4', ref, ...props }: SpinnerProps) {
  return (
    <Loader2
      data-slot="spinner"
      ref={ref}
      className={cn('animate-spin text-muted-foreground', size, className)}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Spinner };

export default Spinner;
