<script setup lang="ts">
/**
 * TabsContent 标签页内容
 *
 * radix-vue TabsContent 包装，仅当对应 value 的标签激活时显示。
 * 自带 fade + zoom 进入动画。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { TabsContent, type TabsContentProps } from 'radix-vue';

interface TabsContentPropsExtended extends TabsContentProps {
  class?: string;
}

const props = defineProps<TabsContentPropsExtended>();

const classes = computed(() =>
  cn(
    'mt-2 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:zoom-in-95',
    props.class
  )
);
</script>

<template>
  <TabsContent v-bind="props" :class="classes">
    <slot />
  </TabsContent>
</template>
