/**
 * ScrollArea 滚动区域组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-scroll-area 实现自定义滚动条
 * - 支持垂直/水平/双向滚动
 * - 自定义滚动条样式，跨浏览器一致性
 * - 包含 ScrollArea/ScrollBar 子组件
 *
 * 使用示例：
 *   <ScrollArea className="h-72 w-48">
 *     <div>...长内容...</div>
 *   </ScrollArea>
 *
 *   <ScrollArea className="w-96 whitespace-nowrap rounded-md">
 *     <ScrollBar orientation="horizontal" />
 *     ...横向滚动内容...
 *   </ScrollArea>
 */

import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** ScrollArea 根组件：包裹可滚动内容 */
function ScrollArea({
  className,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      ref={ref}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="h-full w-full rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {/* 默认渲染垂直滚动条 */}
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

/** ScrollBar 自定义滚动条 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ref,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      ref={ref}
      orientation={orientation}
      className={cn(
        // 触摸/无触摸设备
        'flex touch-none select-none transition-colors',
        // 垂直滚动条
        orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent p-[1px]',
        // 水平滚动条
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-[1px]',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-border"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };

export default ScrollArea;
