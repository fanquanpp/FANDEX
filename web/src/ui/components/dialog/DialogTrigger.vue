<script setup lang="ts">
/**
 * DialogTrigger 对话框触发器
 *
 * radix-vue DialogTrigger 包装，用于触发对话框打开。
 * 推荐 as-child 模式搭配 Button 使用。
 */

import { DialogTrigger, type DialogTriggerProps } from 'radix-vue';

interface DialogTriggerPropsExtended extends DialogTriggerProps {
  class?: string;
}

const props = defineProps<DialogTriggerPropsExtended>();
</script>

<template>
  <DialogTrigger v-bind="props">
    <slot />
  </DialogTrigger>
</template>
