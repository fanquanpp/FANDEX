<script setup lang="ts">
/**
 * TooltipProvider 工具提示上下文提供者
 *
 * 功能概述：
 * radix-vue Tooltip 的全局配置提供者，必须包裹所有 Tooltip 组件。
 * 通过 delayDuration 控制悬停到显示的延迟（毫秒）。
 *
 * 使用示例：
 *   <TooltipProvider :delay-duration="300">
 *     <Tooltip>...</Tooltip>
 *   </TooltipProvider>
 */

import {
  TooltipProvider as TooltipProviderPrimitive,
  type TooltipProviderProps as TooltipProviderPrimitiveProps,
} from 'radix-vue';

interface TooltipProviderProps extends TooltipProviderPrimitiveProps {
  class?: string;
}

const props = defineProps<TooltipProviderProps>();
</script>

<template>
  <TooltipProviderPrimitive v-bind="props">
    <slot />
  </TooltipProviderPrimitive>
</template>
