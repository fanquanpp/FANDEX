<script setup lang="ts">
/**
 * Tooltip 工具提示根组件
 *
 * 功能概述：
 * radix-vue TooltipRoot 的薄包装，提供受控/非受控模式。
 * 必须搭配 TooltipTrigger 与 TooltipContent 一起使用。
 *
 * 使用示例：
 *   <Tooltip>
 *     <TooltipTrigger>悬停我</TooltipTrigger>
 *     <TooltipContent>提示文字</TooltipContent>
 *   </Tooltip>
 */

import { TooltipRoot, type TooltipRootProps, type TooltipRootEmits } from 'radix-vue';

interface TooltipProps extends TooltipRootProps {
  class?: string;
}

const props = defineProps<TooltipProps>();
const emits = defineEmits<TooltipRootEmits>();
</script>

<template>
  <TooltipRoot v-bind="props" @update:open="emits('update:open', $event)">
    <slot />
  </TooltipRoot>
</template>
