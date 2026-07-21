/**
 * Tooltip 文字提示组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-tooltip 实现无障碍悬停提示
 * - 支持键盘聚焦触发（focus）
 * - 包含 TooltipProvider/Tooltip/TooltipTrigger/TooltipContent 子组件
 * - 延迟显示、平滑动画、智能定位
 *
 * 使用示例：
 *   <TooltipProvider>
 *     <Tooltip>
 *       <TooltipTrigger asChild><Button>Hover me</Button></TooltipTrigger>
 *       <TooltipContent>这是提示文本</TooltipContent>
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * 注意：必须包裹 TooltipProvider 才能使用 Tooltip
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Tooltip Provider：必须包裹所有 Tooltip 组件 */
function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

/** Tooltip 根组件 */
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

/** Tooltip 触发器：鼠标悬停或键盘聚焦时显示提示 */
function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** Tooltip 内容：提示文本主体 */
function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // z-index、背景色、文字色、圆角、内边距
          'z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground',
          // 动画：淡入淡出 + 缩放
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          // 不同方向的滑入动画
          'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

export default Tooltip;
