/**
 * Progress 进度条组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-progress 实现无障碍进度条
 * - 支持 indeterminate（不确定）状态
 * - 通过 value 属性控制进度（0-100）
 * - 平滑的过渡动画与清晰的视觉反馈
 *
 * 使用示例：
 *   <Progress value={66} />
 *   <Progress indeterminate />  // 不确定状态
 */

import * as ProgressPrimitive from '@radix-ui/react-progress';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Progress 组件 Props 类型 */
export interface ProgressProps extends React.ComponentProps<typeof ProgressPrimitive.Root> {
  /** 是否为不确定状态（无具体进度值，常用于加载中场景） */
  indeterminate?: boolean;
}

/**
 * Progress 进度条组件
 *
 * @param props.className - 外部类名
 * @param props.value - 当前进度值（0-100）
 * @param props.indeterminate - 是否为不确定状态
 * @param ref - React ref 引用
 */
function Progress({ className, value, indeterminate = false, ref, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      ref={ref}
      className={cn(
        // 相对定位、固定高度、背景色、圆角
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          // 撑满高度、主色背景、过渡动画
          'h-full w-full flex-1 bg-primary transition-all',
          // 不确定状态：使用流动动画
          indeterminate ? 'animate-pulse translate-x-[-30%]' : 'duration-300 ease-out',
        )}
        style={indeterminate ? undefined : { transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };

export default Progress;
