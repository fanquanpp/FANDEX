<script setup lang="ts">
/**
 * TabsTrigger 标签页触发器
 *
 * 功能概述：
 * radix-vue TabsTrigger 的样式化包装，作为单个标签按钮。
 * 激活态（data-[state=active]）：elevated 背景 + 反色文字 + 阴影 sm。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { TabsTrigger, type TabsTriggerProps } from 'radix-vue';

interface TabsTriggerPropsExtended extends TabsTriggerProps {
  class?: string;
}

const props = defineProps<TabsTriggerPropsExtended>();

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-fast ease-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-elevated data-[state=active]:text-text-primary data-[state=active]:shadow-sm',
    props.class
  )
);
</script>

<template>
  <TabsTrigger v-bind="props" :class="classes">
    <slot />
  </TabsTrigger>
</template>
