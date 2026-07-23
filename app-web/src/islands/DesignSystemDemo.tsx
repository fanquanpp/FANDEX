/**
 * Design System Demo 岛屿组件
 *
 * 功能概述：
 * 作为 /design-system 页面的交互式演示容器，集中展示 8 个基础 UI 组件的
 * 全部 variant 与 size。通过 client:load 水合，确保所有 radix 组件
 * 的交互行为（悬停、点击、展开等）正常工作。
 *
 * 设计原则：
 * - 按"组件 + 变体矩阵"组织布局，便于视觉对比
 * - 所有展示组件均使用 Design Tokens 颜色，验证双主题切换
 * - 使用 Tailwind v4 工具类进行布局（grid、gap、padding 等）
 */

import { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  ScrollArea,
} from '@/ui/components';

/**
 * Button 变体矩阵数据
 */
const buttonVariants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'] as const;

const buttonSizes = ['sm', 'default', 'lg'] as const;

/**
 * Badge 变体列表
 */
const badgeVariants = ['default', 'secondary', 'destructive', 'outline'] as const;

/**
 * 长内容数据（用于 ScrollArea 演示）
 */
const scrollItems = Array.from({ length: 20 }, (_, i) => `第 ${i + 1} 项内容`);

/**
 * 组件 props 接口
 * DesignSystemDemo 无外部 props，定义空接口以保持组件接口一致性
 */
interface DesignSystemDemoProps {}

/**
 * Design System 演示组件
 * 展示 8 个基础 UI 组件的全部变体与尺寸组合
 */
export function DesignSystemDemo({}: DesignSystemDemoProps = {}) {
  /**
   * Dialog 开关状态（受控模式）
   */
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col gap-12 p-8 max-w-6xl mx-auto">
      {/* 页面标题 */}
      <header className="flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-5xl font-bold tracking-tight text-text-primary">Design System</h1>
        <p className="text-base text-text-secondary">
          FANDEX 设计系统 · 8 个基础组件 · Tailwind v4 + shadcn + radix
        </p>
      </header>

      {/* 1. Button 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Button 按钮
        </h2>
        <Card>
          <CardHeader>
            <CardTitle>变体矩阵</CardTitle>
            <CardDescription>6 种 variant × 3 种 size 的全组合展示</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {/* 按 size 分行展示所有 variant */}
            {buttonSizes.map((size) => (
              <div key={size} className="flex flex-col gap-2">
                <span className="text-xs text-text-tertiary uppercase tracking-wider">
                  size: {size}
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  {buttonVariants.map((variant) => (
                    <Button key={`${size}-${variant}`} variant={variant} size={size}>
                      {variant}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
            {/* icon size 单独展示 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-text-tertiary uppercase tracking-wider"> size: icon </span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default" size="icon"><Plus className="size-4" /></Button>
                <Button variant="destructive" size="icon"><Trash2 className="size-4" /></Button>
                <Button variant="outline" size="icon"><Settings className="size-4" /></Button>
                <Button variant="secondary" size="icon"><Plus className="size-4" /></Button>
                <Button variant="ghost" size="icon"><Settings className="size-4" /></Button>
              </div>
            </div>
            {/* 禁用态 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs text-text-tertiary uppercase tracking-wider">disabled</span>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="default" disabled>禁用</Button>
                <Button variant="outline" disabled>禁用</Button>
                <Button variant="secondary" disabled>禁用</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Card 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Card 卡片
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>项目名称</CardTitle>
              <CardDescription>项目描述文本，简要介绍项目内容</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-text-secondary">正文内容区域</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Button size="sm">查看</Button>
              <Button size="sm" variant="outline">编辑</Button>
            </CardFooter>
          </Card>
          <Card className="bg-surface">
            <CardHeader>
              <CardTitle>统计面板</CardTitle>
              <CardDescription>核心指标概览</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">总访问</span>
                  <span className="font-medium">12,345</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">活跃用户</span>
                  <span className="font-medium">1,029</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-text-secondary">仅正文的极简卡片</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. Badge 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Badge 标签
        </h2>
        <Card>
          <CardContent className="pt-6 flex flex-wrap items-center gap-3">
            {badgeVariants.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* 4. Tooltip 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Tooltip 工具提示
        </h2>
        <Card>
          <CardContent className="pt-6">
            <TooltipProvider delayDuration={200}>
              <div className="flex flex-wrap items-center gap-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停看上方</Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">上方提示</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停看右方</Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">右方提示</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停看下方</Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">下方提示</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">悬停看左方</Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">左方提示</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </section>

      {/* 5. Dialog 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Dialog 对话框
        </h2>
        <Card>
          <CardContent className="pt-6">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>打开对话框</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>确认操作</DialogTitle>
                <DialogDescription>
                  此操作将删除该条目且无法撤销，请确认是否继续。
                </DialogDescription>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
                  <Button variant="destructive" onClick={() => setDialogOpen(false)}>确认删除</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </section>

      {/* 6. Tabs 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Tabs 标签页
        </h2>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="detail">详情</TabsTrigger>
                <TabsTrigger value="settings">设置</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="p-4 text-sm text-text-secondary">
                概览标签内容：显示项目核心信息摘要
              </TabsContent>
              <TabsContent value="detail" className="p-4 text-sm text-text-secondary">
                详情标签内容：展示完整字段与历史记录
              </TabsContent>
              <TabsContent value="settings" className="p-4 text-sm text-text-secondary">
                设置标签内容：可配置项与偏好设置
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* 7. Accordion 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          Accordion 手风琴
        </h2>
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>什么是 FANDEX？</AccordionTrigger>
                <AccordionContent>
                  FANDEX 是协助零基础学习者迈出计算机科学学习第一步的完整自学平台， 涵盖 51
                  个模块、1995 篇文档。
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>技术栈是什么？</AccordionTrigger>
                <AccordionContent>
                  Astro 7 + React 19 + TypeScript + Tailwind CSS v4 + shadcn + radix，
                  静态站点生成 + 岛屿架构。
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>开源协议？</AccordionTrigger>
                <AccordionContent> MIT 协议，可自由获取、使用、修改和分发。 </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </section>

      {/* 8. ScrollArea 组件展示 */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold text-text-primary border-l-4 border-primary-600 pl-3">
          ScrollArea 滚动区域
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs text-text-tertiary uppercase tracking-wider">垂直滚动</span>
                <ScrollArea className="h-72 w-full rounded-md border border-border p-4">
                  <div className="flex flex-col gap-2">
                    {scrollItems.map((item) => (
                      <div
                        key={item}
                        className="text-sm text-text-secondary p-2 rounded-md bg-surface"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-text-tertiary uppercase tracking-wider">水平滚动</span>
                <ScrollArea className="w-full h-20 rounded-md border border-border p-4">
                  <div className="flex gap-2 w-max">
                    {scrollItems.map((item) => (
                      <div
                        key={item}
                        className="text-sm text-text-secondary p-2 rounded-md bg-surface whitespace-nowrap"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-border pt-6 pb-12 text-center text-sm text-text-tertiary">
        FANDEX Design System · Phase 1.3 · 8 个基础组件已就绪
      </footer>
    </div>
  );
}

export default DesignSystemDemo;
