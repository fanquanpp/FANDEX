<script setup lang="ts">
/**
 * TooltipTrigger 工具提示触发器
 *
 * 功能概述：
 * radix-vue TooltipTrigger 的薄包装，作为触发悬停事件的元素。
 * 默认 asChild=true，将事件透传给子元素。
 */

import { TooltipTrigger, type TooltipTriggerProps } from 'radix-vue';

interface TooltipTriggerPropsExtended extends TooltipTriggerProps {
  class?: string;
}

const props = defineProps<TooltipTriggerPropsExtended>();
</script>

<template>
  <TooltipTrigger v-bind="props">
    <slot />
  </TooltipTrigger>
</template>
