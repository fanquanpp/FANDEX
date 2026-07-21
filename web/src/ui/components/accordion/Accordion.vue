<script setup lang="ts">
/**
 * Accordion 手风琴根组件
 *
 * 功能概述：
 * radix-vue AccordionRoot 的薄包装，提供可展开/折叠的内容区域。
 * 支持 single（默认）与 multiple 两种模式。
 *
 * 使用示例：
 *   <Accordion type="single" collapsible>
 *     <AccordionItem value="item-1">
 *       <AccordionTrigger>第一节</AccordionTrigger>
 *       <AccordionContent>内容</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 */

import { AccordionRoot, type AccordionRootProps, type AccordionRootEmits } from 'radix-vue';

interface AccordionProps extends AccordionRootProps {
  class?: string;
}

const props = defineProps<AccordionProps>();
const emits = defineEmits<AccordionRootEmits>();
</script>

<template>
  <AccordionRoot v-bind="props" @update:model-value="emits('update:modelValue', $event)">
    <slot />
  </AccordionRoot>
</template>
