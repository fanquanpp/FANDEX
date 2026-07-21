<script setup lang="ts">
/**
 * TooltipContent 工具提示内容
 *
 * 功能概述：
 * radix-vue TooltipContent 的样式化包装，定义提示气泡的视觉样式。
 * 通过 side prop 控制气泡方向（top/right/bottom/left）。
 *
 * 设计原则：
 * - 暗色 elevated 背景 + 反色文字，确保可读性
 * - 圆角 md + 阴影 md + 边框 subtle
 * - 进入动画：fade + zoom，时长 fast
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import {
  TooltipContent as TooltipContentPrimitive,
  type TooltipContentProps as TooltipContentPrimitiveProps,
} from 'radix-vue';

interface TooltipContentProps extends TooltipContentPrimitiveProps {
  class?: string;
}

const props = withDefaults(defineProps<TooltipContentProps>(), {
  side: 'top',
  sideOffset: 4,
});

const classes = computed(() =>
  cn(
    'z-tooltip overflow-hidden rounded-md bg-elevated px-3 py-1.5 text-xs text-text-inverse shadow-md border border-border-subtle animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    props.class
  )
);
</script>

<template>
  <TooltipContentPrimitive v-bind="props" :class="classes">
    <slot />
  </TooltipContentPrimitive>
</template>
