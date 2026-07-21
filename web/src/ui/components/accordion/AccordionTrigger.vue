<script setup lang="ts">
/**
 * AccordionTrigger 手风琴触发器
 *
 * 功能概述：
 * radix-vue AccordionTrigger 包装，点击切换展开/折叠。
 * 激活态旋转 180 度（chevron-down 图标），flex 布局水平对齐。
 * 外层包裹 AccordionHeader 提供正确的 h3 语义标签。
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { AccordionHeader, AccordionTrigger, type AccordionTriggerProps } from 'radix-vue';
import { ChevronDown } from '@lucide/vue';

interface AccordionTriggerPropsExtended extends AccordionTriggerProps {
  class?: string;
}

const props = defineProps<AccordionTriggerPropsExtended>();

const classes = computed(() =>
  cn(
    'flex flex-1 items-center justify-between py-4 text-base font-medium transition-all duration-fast ease-out hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring [&[data-state=open]>svg]:rotate-180',
    props.class
  )
);
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger v-bind="props" :class="classes">
      <slot />
      <ChevronDown
        class="size-4 shrink-none text-text-secondary transition-transform duration-fast ease-out"
      />
    </AccordionTrigger>
  </AccordionHeader>
</template>
