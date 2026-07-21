<script setup lang="ts">
/**
 * Dialog 对话框根组件
 *
 * 功能概述：
 * radix-vue DialogRoot 的薄包装，提供模态框的受控/非受控状态管理。
 * 必须搭配 DialogTrigger / DialogContent / DialogTitle 等子组件使用。
 *
 * 使用示例：
 *   <Dialog v-model:open="isOpen">
 *     <DialogTrigger as-child>
 *       <Button>打开</Button>
 *     </DialogTrigger>
 *     <DialogContent>
 *       <DialogTitle>标题</DialogTitle>
 *       <DialogDescription>描述</DialogDescription>
 *     </DialogContent>
 *   </Dialog>
 */

import { DialogRoot, type DialogRootProps, type DialogRootEmits } from 'radix-vue';

interface DialogProps extends DialogRootProps {
  class?: string;
}

const props = defineProps<DialogProps>();
const emits = defineEmits<DialogRootEmits>();
</script>

<template>
  <DialogRoot v-bind="props" @update:open="emits('update:open', $event)">
    <slot />
  </DialogRoot>
</template>
