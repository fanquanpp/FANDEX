<script setup lang="ts">
/**
 * DialogContent 对话框内容
 *
 * 功能概述：
 * radix-vue DialogContent 的样式化包装，包含遮罩层、内容面板、关闭按钮。
 * 自动渲染 Portal、Overlay、Close 按钮。
 *
 * 设计原则：
 * - 遮罩：黑色半透明 + backdrop-blur 营造聚焦效果
 * - 面板：elevated 背景 + 边框 + 阴影 2xl + 圆角 2xl
 * - 居中定位：fixed + grid place-items-center
 * - 进入动画：fade + zoom，退出反向
 * - 内置右上角关闭按钮（X 图标）
 * - 宽度通过 size prop 显式控制（sm/md/lg/xl），避免依赖 tailwind-merge 覆盖
 *
 * 实现说明：
 * - 使用 defineProps 解构 + readonly 启用 Vue 3.4+ 的 props 解构默认值编译宏
 * - 显式从 props 中分离 class / size，避免通过 $attrs 透传到 DOM
 *   （否则 size="lg" / class="..." 会作为非法属性渲染到 DOM 元素上）
 * - 通过 v-bind="restProps" 仅透传 radix-vue 需要的原生属性（aria-*、id 等）
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import {
  DialogContent as DialogContentPrimitive,
  DialogOverlay,
  DialogPortal,
  DialogClose,
  type DialogContentProps as DialogContentPrimitiveProps,
} from 'radix-vue';
import { X } from '@lucide/vue';

/** 对话框尺寸类型：sm 窄 / md 中 / lg 宽 / xl 超宽 */
type DialogSize = 'sm' | 'md' | 'lg' | 'xl';

/** size prop 到 max-width 工具类的映射 */
const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

interface DialogContentProps extends DialogContentPrimitiveProps {
  /** 自定义附加类（tailwind-merge 处理冲突） */
  class?: string;
  /** 对话框宽度尺寸，默认 md（max-w-md / 28rem） */
  size?: DialogSize;
}

const props = withDefaults(defineProps<DialogContentProps>(), {
  size: 'md',
});

/**
 * 计算最终 class 字符串
 * 使用 cn()（tailwind-merge）合并基础类、size 类、外部传入类，
 * 自动去重并解决冲突（如 max-w-*、p-*、gap-* 等后面的覆盖前面的）
 */
const classes = computed(() =>
  cn(
    'fixed left-1/2 top-1/2 z-modal grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-elevated p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    sizeClasses[props.size],
    props.class
  )
);

/**
 * 透传给 radix-vue DialogContentPrimitive 的属性
 * 显式排除 class 与 size：
 * - class 已通过 :class="classes" 单独绑定，避免重复透传导致类名堆积
 * - size 是本组件自定义 prop，非 HTML 合法属性，避免透传到 DOM
 * 同时过滤值为 undefined / 空字符串的属性，避免渲染出 id="" 等非法空属性
 * 使用 computed 保留响应性（避免解构丢失 props 响应式追踪）
 */
const restProps = computed(() => {
  const { class: _omitClass, size: _omitSize, ...rest } = props;
  // 过滤空值：移除 undefined 与空字符串，避免渲染 id="" 等无效属性
  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined && value !== '') {
      filtered[key] = value;
    }
  }
  return filtered;
});
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-modal bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
    />
    <DialogContentPrimitive v-bind="restProps" :class="classes">
      <slot />
      <DialogClose
        class="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring"
      >
        <X class="size-4" />
        <span class="sr-only">关闭</span>
      </DialogClose>
    </DialogContentPrimitive>
  </DialogPortal>
</template>
