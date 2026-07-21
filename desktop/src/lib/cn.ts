/**
 * cn 工具函数：合并与去重 Tailwind CSS 类名
 *
 * 功能概述：
 * - 基于 clsx 实现条件类名拼接（支持字符串、对象、数组）
 * - 基于 tailwind-merge 解决 Tailwind 类名冲突（如 'px-2 px-4' → 'px-4'）
 * - 配合 shadcn/ui 组件使用，是 variants 与外部 className 合并的标准入口
 *
 * 输入：ClassValue[] - 任意数量的类名表达式
 * 输出：string - 合并去重后的类名字符串
 *
 * 使用示例：
 *   cn('px-2', isActive && 'bg-primary', 'px-4')  // 'bg-primary px-4'
 *   cn({ 'text-red-500': hasError }, ['font-bold', 'text-sm'])  // 'text-red-500 font-bold text-sm'
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并类名工具函数
 *
 * @param inputs - 任意数量的类名表达式（字符串、对象、数组等）
 * @returns 合并去重后的类名字符串
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;
