<script setup lang="ts">
/**
 * ScrollArea 滚动区域
 *
 * 功能概述：
 * radix-vue ScrollAreaRoot 的样式化包装，提供自定义滚动条样式的滚动容器。
 * 相比原生 overflow-auto，可统一亮暗主题下的滚动条视觉。
 *
 * 使用示例：
 *   <ScrollArea class="h-72 w-48">
 *     <div class="p-4">长内容...</div>
 *   </ScrollArea>
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import {
  ScrollAreaRoot,
  ScrollAreaViewport,
  ScrollAreaCorner,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  type ScrollAreaRootProps,
} from 'radix-vue';

interface ScrollAreaProps extends ScrollAreaRootProps {
  class?: string;
}

const props = defineProps<ScrollAreaProps>();

const classes = computed(() => cn('relative overflow-hidden', props.class));
</script>

<template>
  <ScrollAreaRoot v-bind="props" :class="classes">
    <ScrollAreaViewport class="h-full w-full rounded-[inherit]">
      <slot />
    </ScrollAreaViewport>
    <!-- 垂直滚动条 -->
    <ScrollAreaScrollbar
      orientation="vertical"
      class="flex w-2.5 touch-none select-none border-l border-l-transparent p-px transition-colors"
    >
      <ScrollAreaThumb
        class="relative flex-1 rounded-full bg-border-strong hover:bg-text-tertiary"
      />
    </ScrollAreaScrollbar>
    <!-- 水平滚动条 -->
    <ScrollAreaScrollbar
      orientation="horizontal"
      class="flex h-2.5 touch-none select-none border-t border-t-transparent p-px transition-colors"
    >
      <ScrollAreaThumb
        class="relative flex-1 rounded-full bg-border-strong hover:bg-text-tertiary"
      />
    </ScrollAreaScrollbar>
    <ScrollAreaCorner class="bg-transparent" />
  </ScrollAreaRoot>
</template>
