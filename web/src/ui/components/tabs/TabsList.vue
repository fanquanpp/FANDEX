<script setup lang="ts">
/**
 * TabsList 标签页列表容器
 *
 * 功能概述：
 * radix-vue TabsList 的样式化包装，水平排列 TabsTrigger。
 * 视觉为 inline-flex 横向布局，sunken 背景 + 圆角 lg。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { TabsList, type TabsListProps } from 'radix-vue';

interface TabsListPropsExtended extends TabsListProps {
  class?: string;
}

const props = defineProps<TabsListPropsExtended>();

const classes = computed(() =>
  cn(
    'inline-flex h-10 items-center justify-center rounded-lg bg-sunken p-1 text-text-secondary',
    props.class
  )
);
</script>

<template>
  <TabsList v-bind="props" :class="classes">
    <slot />
  </TabsList>
</template>
