/**
 * Tabs 标签页组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-tabs 实现无障碍标签页
 * - 支持键盘导航（方向键切换、Tab 焦点切换）
 * - 包含 Tabs/TabsList/TabsTrigger/TabsContent 子组件
 * - 适用于内容分组切换、多视图切换场景
 *
 * 使用示例：
 *   <Tabs defaultValue="tab1">
 *     <TabsList>
 *       <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *       <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="tab1">内容 1</TabsContent>
 *     <TabsContent value="tab2">内容 2</TabsContent>
 *   </Tabs>
 */

import * as TabsPrimitive from '@radix-ui/react-tabs';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Tabs 根组件：管理当前激活的标签页状态 */
function Tabs({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

/** Tabs 列表容器：包含所有 TabsTrigger */
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        // 内联布局、居中、背景色、圆角、边框
        'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Tabs 触发器：点击切换标签页 */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // 内联布局、居中、文字样式
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all',
        // 焦点环
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        // 禁用状态
        'disabled:pointer-events-none disabled:opacity-50',
        // 激活状态：背景色、阴影
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

/** Tabs 内容区域：仅当对应 TabsTrigger 激活时显示 */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        // 间距、过渡动画
        'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

export default Tabs;
