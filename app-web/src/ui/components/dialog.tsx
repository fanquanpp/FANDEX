/**
 * Dialog 对话框组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-dialog 实现无障碍模态对话框
 * - 支持遮罩层、关闭按钮、ESC 键关闭、焦点陷阱
 * - 包含 Dialog/DialogTrigger/DialogPortal/DialogOverlay/DialogClose/DialogContent
 *   /DialogHeader/DialogFooter/DialogTitle/DialogDescription 子组件
 * - 使用 CSS 变量实现亮/暗主题适配
 * - 支持入场/出场动画
 * - 宽度通过 size prop 显式控制（sm/md/lg/xl），避免依赖 tailwind-merge 覆盖
 *
 * 使用示例：
 *   <Dialog>
 *     <DialogTrigger asChild><Button>Open</Button></DialogTrigger>
 *     <DialogContent size="lg">
 *       <DialogHeader>
 *         <DialogTitle>标题</DialogTitle>
 *         <DialogDescription>描述文本</DialogDescription>
 *       </DialogHeader>
 *       <DialogFooter>
 *         <Button type="submit">确认</Button>
 *       </DialogFooter>
 *     </DialogContent>
 *   </Dialog>
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/** Dialog 根组件：控制打开/关闭状态，提供模态框的受控/非受控状态管理 */
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

/** Dialog 触发器：点击后打开对话框，推荐 asChild 模式搭配 Button 使用 */
function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

/** Dialog 关闭按钮：用于自定义关闭入口（DialogContent 已内置默认关闭按钮） */
function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/** Dialog Portal：将内容渲染到 body 下 */
function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

/** Dialog 遮罩层：黑色半透明 + backdrop-blur 营造聚焦效果 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-modal bg-black/50 backdrop-blur-sm',
        // 入场/出场动画：淡入淡出
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        className,
      )}
      {...props}
    />
  );
}

/** 对话框尺寸类型：sm 窄 / md 中 / lg 宽 / xl 超宽 */
type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

/** size prop 到 max-width 工具类的映射 */
const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

/** DialogContent Props 类型，扩展 size prop */
interface DialogContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** 对话框宽度尺寸，默认 md（max-w-md / 28rem） */
  size?: DialogSize;
}

/**
 * DialogContent 对话框内容主体
 *
 * 包含遮罩层、内容面板、关闭按钮。自动渲染 Portal、Overlay、Close 按钮。
 * - 居中定位：fixed + translate -1/2
 * - 面板：elevated 背景 + 边框 + 阴影 2xl + 圆角 2xl
 * - 进入动画：fade + zoom，退出反向
 * - 内置右上角关闭按钮（X 图标）
 * - 宽度通过 size prop 显式控制，避免依赖 tailwind-merge 覆盖
 */
function DialogContent({ className, children, size = 'md', ...props }: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          // 固定定位、居中
          'fixed left-1/2 top-1/2 z-modal grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-elevated p-6 shadow-2xl rounded-2xl',
          // 入场/出场动画：缩放 + 淡入淡出
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          // 尺寸类
          sizeClasses[size],
          className,
        )}
        {...props}
      >
        {children}
        {/* 右上角关闭按钮 */}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring">
          <X className="size-4" />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/** Dialog 头部区域：标题与描述的容器 */
function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  );
}

/** Dialog 底部区域：用于放置操作按钮 */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

/** Dialog 标题：用于无障碍语义（aria-labelledby），2xl 字号 + semibold */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-2xl font-semibold leading-tight tracking-tight', className)}
      {...props}
    />
  );
}

/** Dialog 描述文本：用于无障碍语义（aria-describedby），sm 字号 + 次级文字色 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-text-secondary leading-relaxed', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

export default Dialog;
