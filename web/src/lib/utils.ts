/**
 * shadcn-vue 通用工具函数
 *
 * 功能概述：
 * 提供 cn 函数用于合并 Tailwind CSS 类名，处理冲突与条件类。该函数是 shadcn-vue
 * 组件库中所有组件的标准依赖，用于在 props.class 与组件内部默认类之间进行无冲突合并。
 *
 * 实现原理：
 * - clsx：将多种输入格式（字符串、数组、对象）规范化为单一类名字符串
 * - tailwind-merge：智能合并 Tailwind 类名，后定义的覆盖前定义的（如 px-2 与 px-4 取后者）
 *
 * 使用方式：
 *   cn('px-2 py-1', condition && 'bg-primary-500', { 'text-white': isActive })
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名，处理冲突与条件类
 *
 * @param inputs - 类名输入（可以是字符串、数组、对象、嵌套数组等任意 clsx 支持的格式）
 * @returns 合并后的类名字符串（已去重，Tailwind 冲突类已按后者优先解析）
 *
 * @example
 * cn('px-2 py-1', 'px-4')          // 'py-1 px-4'（px-4 覆盖 px-2）
 * cn('btn', isActive && 'btn-active')  // 'btn btn-active' 或 'btn'
 * cn('base', { 'text-red-500': hasError, 'text-green-500': !hasError })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
