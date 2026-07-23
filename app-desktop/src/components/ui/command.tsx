/**
 * Command 组件（Command Palette 命令面板）
 *
 * 功能概述：
 * - 基于 cmdk 实现可搜索的命令面板
 * - 支持键盘导航（上下方向键、回车选择、ESC 关闭）
 * - 包含 Command/CommandDialog/CommandInput/CommandList/CommandEmpty/CommandGroup
 *   /CommandItem/CommandShortcut/CommandSeparator 等子组件
 * - 适用于快捷搜索、命令执行、菜单导航场景
 *
 * 使用示例：
 *   <Command>
 *     <CommandInput placeholder="搜索..." />
 *     <CommandList>
 *       <CommandEmpty>无结果</CommandEmpty>
 *       <CommandGroup heading="建议">
 *         <CommandItem>首页</CommandItem>
 *       </CommandGroup>
 *     </CommandList>
 *   </Command>
 *
 *   // 对话框模式（CommandDialog）
 *   <CommandDialog open={open} onOpenChange={setOpen}>
 *     ... 同上
 *   </CommandDialog>
 */

import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import type * as React from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

/**
 * Command 根组件
 * 包含搜索逻辑与状态管理
 */
function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        // 弹性布局、撑满高度、背景色、文字色、圆角、边框
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Command 对话框模式
 * 在 Dialog 中嵌入 Command，提供模态搜索体验
 */
function CommandDialog({
  title = '命令面板',
  description,
  children,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
}) {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-xl">
        {/* 仅供屏幕阅读器识别，视觉隐藏 */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {description && <span className="sr-only">{description}</span>}
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** Command 输入框 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center border-b px-3"
      cmdk-input-wrapper=""
    >
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

/** Command 列表容器（支持滚动） */
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden scrollbar-thin', className)}
      {...props}
    />
  );
}

/** Command 空状态 */
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/** Command 分组容器 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/** Command 分隔符 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn('-mx-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/** Command 可选中的项目 */
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        // 相对定位、弹性布局、间距、内边距
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        // 选中状态：背景色与文字色
        'data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50',
        // 悬停状态
        'data-[selected=true]:bg-accent/80',
        className,
      )}
      {...props}
    />
  );
}

/** Command 快捷键标记 */
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
};

export default Command;
