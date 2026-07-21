<script setup lang="ts">
/**
 * AccordionContent 手风琴内容
 *
 * radix-vue AccordionContent 包装，展开时显示，含 fade + slide 动画。
 * overflow-hidden 防止内容超出容器。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { AccordionContent, type AccordionContentProps } from 'radix-vue';

interface AccordionContentPropsExtended extends AccordionContentProps {
  class?: string;
}

const props = defineProps<AccordionContentPropsExtended>();

const classes = computed(() =>
  cn(
    'overflow-hidden text-sm text-text-secondary data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down',
    props.class
  )
);
</script>

<template>
  <AccordionContent v-bind="props" :class="classes">
    <div class="pb-4 pt-0">
      <slot />
    </div>
  </AccordionContent>
</template>
