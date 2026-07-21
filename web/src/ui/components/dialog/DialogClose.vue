<script setup lang="ts">
/**
 * DialogClose 对话框关闭触发器
 *
 * radix-vue DialogClose 包装，用于自定义关闭按钮。
 * DialogContent 已内置默认关闭按钮，此组件用于额外的关闭入口。
 */
import { DialogClose, type DialogCloseProps } from 'radix-vue';

interface DialogClosePropsExtended extends DialogCloseProps {
  class?: string;
}

const props = defineProps<DialogClosePropsExtended>();
</script>

<template>
  <DialogClose v-bind="props">
    <slot />
  </DialogClose>
</template>
