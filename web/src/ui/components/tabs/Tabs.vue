<script setup lang="ts">
/**
 * Tabs 标签页根组件
 *
 * 功能概述：
 * radix-vue TabsRoot 的薄包装，提供受控/非受控模式切换标签页。
 * 必须搭配 TabsList / TabsTrigger / TabsContent 使用。
 *
 * 使用示例：
 *   <Tabs default-value="tab1">
 *     <TabsList>
 *       <TabsTrigger value="tab1">标签 1</TabsTrigger>
 *       <TabsTrigger value="tab2">标签 2</TabsTrigger>
 *     </TabsList>
 *     <TabsContent value="tab1">内容 1</TabsContent>
 *     <TabsContent value="tab2">内容 2</TabsContent>
 *   </Tabs>
 */

import { TabsRoot, type TabsRootProps, type TabsRootEmits } from 'radix-vue';

interface TabsProps extends TabsRootProps {
  class?: string;
}

const props = defineProps<TabsProps>();
const emits = defineEmits<TabsRootEmits>();
</script>

<template>
  <TabsRoot v-bind="props" @update:model-value="emits('update:modelValue', $event)">
    <slot />
  </TabsRoot>
</template>
