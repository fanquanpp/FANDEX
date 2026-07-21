/**
 * Separator 分隔符组件
 *
 * 功能概述：
 * - 基于 @radix-ui/react-separator 实现无障碍分隔符
 * - 支持水平/垂直两种方向
 * - 用于内容分组、视觉分割
 *
 * 使用示例：
 *   <Separator />  // 默认水平
 *   <Separator orientation="vertical" />
 */

import * as SeparatorPrimitive from '@radix-ui/react-separator';
import type * as React from 'react';

import { cn } from '@/lib/cn';

/**
 * Separator 分隔符组件
 *
 * @param props.className - 外部类名
 * @param props.orientation - 方向（horizontal/vertical），默认 horizontal
 * @param props.decorative - 是否为装饰性元素（默认 true，不影响无障碍）
 * @param ref - React ref 引用
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ref,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        // 收缩-0 防止挤压
        'shrink-0 bg-border',
        // 水平：撑满宽度、固定高度；垂直：撑满高度、固定宽度
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };

export default Separator;
