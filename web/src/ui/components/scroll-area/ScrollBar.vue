<script setup lang="ts">
/**
 * ScrollBar 独立滚动条
 *
 * 功能概述：
 * radix-vue ScrollAreaScrollbar 包装，用于单独渲染垂直或水平滚动条。
 * 通常搭配 ScrollArea 组件使用，本组件作为命名导出供高级场景使用。
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { ScrollAreaScrollbar, type ScrollAreaScrollbarProps } from 'radix-vue';

interface ScrollBarProps extends ScrollAreaScrollbarProps {
  class?: string;
}

const props = defineProps<ScrollBarProps>();

const classes = computed(() =>
  cn(
    'flex touch-none select-none transition-colors',
    props.orientation === 'vertical'
      ? 'w-2.5 border-l border-l-transparent p-px'
      : 'h-2.5 flex-col border-t border-t-transparent p-px',
    props.class
  )
);
</script>

<template>
  <ScrollAreaScrollbar v-bind="props" :class="classes">
    <slot />
  </ScrollAreaScrollbar>
</template>
