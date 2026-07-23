/**
 * Tooltip 文字提示组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-tooltip 实现无障碍悬停提示
 * - 支持键盘聚焦触发（focus）
 * - 包含 TooltipProvider/Tooltip/TooltipTrigger/TooltipContent 子组件
 * - 延迟显示、平滑动画、智能定位
 * - Tooltip 组件内部自动包裹 TooltipProvider，简化使用
 *
 * 使用示例：
 *   <Tooltip>
 *     <TooltipTrigger asChild><Button>Hover me</Button></TooltipTrigger>
 *     <TooltipContent>这是提示文本</TooltipContent>
 *   </Tooltip>
 *
 * 注意：Tooltip 组件已内置 TooltipProvider，无需手动包裹。
 * 若需自定义 delayDuration 等全局配置，可单独使用 TooltipProvider。
 */

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/** TooltipProvider 工具提示上下文提供者：必须包裹所有 Tooltip 组件，通过 delayDuration 控制悬停到显示的延迟（毫秒） */
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

/** Tooltip 根组件：内部自动包裹 TooltipProvider，简化使用 */
function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

/** Tooltip 触发器：鼠标悬停或键盘聚焦时显示提示，默认 asChild 透传事件给子元素 */
function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

/** Tooltip 内容：提示文本主体，通过 side prop 控制气泡方向（top/right/bottom/left） */
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
          // z-index、背景色、文字色、圆角、内边距、阴影、边框
          'z-tooltip overflow-hidden rounded-md bg-elevated px-3 py-1.5 text-xs text-text-inverse shadow-md border border-border-subtle',
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
