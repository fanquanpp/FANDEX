/**
 * ToggleGroup 开关组组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-toggle-group 实现多选/单选开关组
 * - 支持 type: 'single'（单选）/ 'multiple'（多选）两种模式
 * - 复用 toggle.tsx 的变体样式
 * - 包含 ToggleGroup/ToggleGroupItem 子组件
 * - 适用于工具栏、视图切换、筛选器场景
 *
 * 使用示例：
 *   // 单选模式
 *   <ToggleGroup type="single" defaultValue="a">
 *     <ToggleGroupItem value="a">A</ToggleGroupItem>
 *     <ToggleGroupItem value="b">B</ToggleGroupItem>
 *   </ToggleGroup>
 *
 *   // 多选模式
 *   <ToggleGroup type="multiple" defaultValue={['bold']}>
 *     <ToggleGroupItem value="bold" aria-label="粗体">B</ToggleGroupItem>
 *   </ToggleGroup>
 */

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';
import { createContext, useContext } from 'react';
import { toggleVariants } from '@/components/ui/toggle';
import { cn } from '@/lib/cn';

/** ToggleGroup 上下文：在 Group 内统一控制 variant 与 size */
const ToggleGroupContext = createContext<VariantProps<typeof toggleVariants>>({
  variant: 'default',
  size: 'default',
});

/** ToggleGroup 根组件 */
function ToggleGroup({
  className,
  variant,
  size,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      ref={ref}
      className={cn('flex items-center gap-1', className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
}

/** ToggleGroup 单项 */
function ToggleGroupItem({
  className,
  children,
  variant,
  size,
  ref,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleVariants>) {
  // 优先使用传入的 variant/size，否则使用 Group 上下文中的值
  const context = useContext(ToggleGroupContext);

  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      ref={ref}
      className={cn(
        toggleVariants({
          variant: variant ?? context.variant,
          size: size ?? context.size,
        }),
        // 在 Group 内首个/末项的圆角调整（连接外观）
        'rounded-md first:rounded-l-md last:rounded-r-md',
        // 边框去除中间分隔
        'border border-l-0 first:border-l',
        className,
      )}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
}

export { ToggleGroup, ToggleGroupItem };

export default ToggleGroup;
