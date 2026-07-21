<script setup lang="ts">
/**
 * Button 通用按钮组件
 *
 * 功能概述：
 * 基于 HTML <button> / <a> 标签封装的可变体按钮，支持 6 种 variant 与 4 种 size，
 * 通过 as prop 切换渲染的 HTML 标签。视觉风格由 buttonVariants (CVA) 驱动，
 * 类名通过 cn() 合并，允许外部 class 覆盖内部默认样式。
 *
 * 设计原则：
 * - 不使用 radix-vue 的 Primitive（避免不必要的依赖）
 * - 通过动态 :is 渲染不同 HTML 标签
 * - 所有原生 button 属性透传至根元素
 * - 类型严格：variant/size 类型由 CVA 自动推导，无 any
 *
 * 使用示例：
 *   <Button variant="default">提交</Button>
 *   <Button variant="outline" size="sm" as="a" href="/">首页</Button>
 *   <Button variant="icon" @click="onDelete"><TrashIcon /></Button>
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { buttonVariants, type ButtonVariants } from './button-variants';

/**
 * Button Props 类型定义
 *
 * - variant/size: 从 cva 推导的可选联合类型，不指定时使用默认值
 * - as: 渲染的 HTML 标签，默认 'button'
 * - class: 外部传入的额外类名（与 cva 生成的类名合并）
 * - type: 当 as='button' 时的 type 属性，默认 'button'（避免触发表单提交）
 */
interface ButtonProps {
  variant?: ButtonVariants['variant'];
  size?: ButtonVariants['size'];
  as?: string;
  class?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'default',
  size: 'default',
  as: 'button',
  type: 'button',
  disabled: false,
});

/**
 * 计算最终类名：合并 cva 生成的变体类与外部 class
 * cn() 会智能处理 Tailwind 类冲突，外部 class 优先级更高
 */
const classes = computed(() =>
  cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)
);
</script>

<template>
  <component
    :is="as"
    :class="classes"
    :type="as === 'button' ? type : undefined"
    :disabled="as === 'button' ? disabled : undefined"
    :aria-disabled="as !== 'button' && disabled ? 'true' : undefined"
  >
    <slot />
  </component>
</template>
