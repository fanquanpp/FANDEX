/**
 * Accordion 手风琴组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-accordion 实现无障碍手风琴
 * - 支持单展开/多展开模式（type="single" | "multiple"）
 * - 支持键盘导航（方向键切换、Enter/Space 展开）
 * - 包含 Accordion/AccordionItem/AccordionTrigger/AccordionContent 子组件
 * - 展开/折叠带 fade + slide 动画
 *
 * 使用示例：
 *   <Accordion type="single" collapsible>
 *     <AccordionItem value="item-1">
 *       <AccordionTrigger>第一节</AccordionTrigger>
 *       <AccordionContent>内容</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 */

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Accordion 根组件：控制展开/折叠状态，支持 single（默认）与 multiple 两种模式 */
function Accordion({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return (
    <AccordionPrimitive.Root data-slot="accordion" className={cn(className)} {...props} />
  );
}

/** AccordionItem 单个可展开项容器，底部带分隔边框 */
function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-border', className)}
      {...props}
    />
  );
}

/**
 * AccordionTrigger 手风琴触发器
 *
 * 点击切换展开/折叠。激活态旋转 180 度（chevron-down 图标）。
 * 外层包裹 AccordionHeader 提供正确的 h3 语义标签。
 */
function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          'flex flex-1 items-center justify-between py-4 text-base font-medium transition-all duration-fast ease-out hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="size-4 shrink-none text-text-secondary transition-transform duration-fast ease-out" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

/** AccordionContent 展开时显示的内容，含 fade + slide 动画，overflow-hidden 防止内容超出容器 */
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        'overflow-hidden text-sm text-text-secondary data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
        className,
      )}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger };

export default Accordion;
