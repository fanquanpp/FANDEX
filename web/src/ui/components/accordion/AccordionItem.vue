<script setup lang="ts">
/**
 * AccordionItem 手风琴项
 *
 * radix-vue AccordionItem 包装，单个可展开项的容器，底部带分隔边框。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { AccordionItem, type AccordionItemProps } from 'radix-vue';

interface AccordionItemPropsExtended extends AccordionItemProps {
  class?: string;
}

const props = defineProps<AccordionItemPropsExtended>();

const classes = computed(() => cn('border-b border-border', props.class));
</script>

<template>
  <AccordionItem v-bind="props" :class="classes">
    <slot />
  </AccordionItem>
</template>
