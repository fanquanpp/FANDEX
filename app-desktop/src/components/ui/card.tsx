/**
 * Card 卡片组件
 *
 * 功能概述：
 * - 提供结构化的卡片容器，包含 Header/Title/Description/Action/Content/Footer
 * - 适用于内容展示、信息聚合、列表项等场景
 * - 通过 CSS 变量适配亮/暗主题
 * - 灵活的组合模式，可按需使用各子组件
 *
 * 使用示例：
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>标题</CardTitle>
 *       <CardDescription>描述</CardDescription>
 *       <CardAction><Button>...</Button></CardAction>
 *     </CardHeader>
 *     <CardContent>内容</CardContent>
 *     <CardFooter>底部</CardFooter>
 *   </Card>
 */

import type * as React from 'react';

import { cn } from '@/lib/cn';

/** Card 卡片容器：带圆角、边框、阴影 */
function Card({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      ref={ref}
      className={cn(
        // 圆角、边框、背景色、文字色、阴影、边框颜色
        'rounded-xl border bg-card text-card-foreground shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

/** Card 头部区域：标题与描述的容器 */
function CardHeader({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      ref={ref}
      className={cn('flex flex-col gap-1.5 p-6', className)}
      {...props}
    />
  );
}

/** Card 标题 */
function CardTitle({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      ref={ref}
      className={cn('font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

/** Card 描述文本 */
function CardDescription({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Card 操作区域：用于放置操作按钮（右上角） */
function CardAction({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      ref={ref}
      className={cn('flex items-center', className)}
      {...props}
    />
  );
}

/** Card 内容区域 */
function CardContent({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="card-content" ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  );
}

/** Card 底部区域 */
function CardFooter({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      ref={ref}
      className={cn('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };

export default Card;
