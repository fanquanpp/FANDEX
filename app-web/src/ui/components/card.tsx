/**
 * Card 卡片组件
 *
 * 功能概述：
 * - 提供结构化的卡片容器，包含 Header/Title/Description/Content/Footer
 * - 适用于内容展示、信息聚合、列表项等场景
 * - 通过 CSS 变量适配亮/暗主题
 * - 灵活的组合模式，可按需使用各子组件
 *
 * 使用示例：
 *   <Card>
 *     <CardHeader>
 *       <CardTitle>标题</CardTitle>
 *       <CardDescription>描述</CardDescription>
 *     </CardHeader>
 *     <CardContent>内容</CardContent>
 *     <CardFooter>底部</CardFooter>
 *   </Card>
 */

import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Card 卡片容器：带圆角、边框、背景、阴影。默认 surface 背景 + border 边框 + sm 阴影 */
function Card({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      ref={ref}
      className={cn('rounded-xl border border-border bg-surface text-text-primary shadow-sm', className)}
      {...props}
    />
  );
}

/** Card 头部区域：标题与描述的容器，垂直布局，底部留 margin 与正文分隔 */
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

/** Card 标题：使用 2xl 字号 + semibold 字重，确保视觉层级突出 */
function CardTitle({ className, ref, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      ref={ref}
      className={cn('text-2xl font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

/** Card 描述文本：使用次级文字色 + sm 字号，用于补充说明标题 */
function CardDescription({ className, ref, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="card-description"
      ref={ref}
      className={cn('text-sm text-text-secondary leading-relaxed', className)}
      {...props}
    />
  );
}

/** Card 内容区域：用于放置主内容，与 Header/Footer 通过 padding 隔离 */
function CardContent({ className, ref, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" ref={ref} className={cn('p-6 pt-0', className)} {...props} />;
}

/** Card 底部区域：用于放置操作按钮等底部内容，水平布局 */
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

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };

export default Card;
