/**
 * Skeleton 骨架屏组件
 *
 * 功能概述：
 * - 用于内容加载时的占位显示
 * - 通过 animate-pulse 实现脉动动画
 * - 可与具体内容形状匹配（圆角、宽度、高度）
 * - 提升加载过程的视觉体验，避免布局跳动
 *
 * 使用示例：
 *   <Skeleton className="h-12 w-12 rounded-full" />  // 头像骨架
 *   <Skeleton className="h-4 w-[250px]" />  // 文本骨架
 *   <Skeleton className="h-[200px] w-full" />  // 卡片骨架
 */

import type * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Skeleton 骨架屏组件
 *
 * @param props.className - 外部类名（用于控制形状与尺寸）
 * @param ref - React ref 引用
 */
function Skeleton({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      ref={ref}
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

export { Skeleton };

export default Skeleton;
