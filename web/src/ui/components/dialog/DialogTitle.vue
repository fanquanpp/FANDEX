<script setup lang="ts">
/**
 * DialogTitle 对话框标题
 *
 * 用于无障碍语义（aria-labelledby），使用 2xl 字号 + semibold。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { DialogTitle, type DialogTitleProps } from 'radix-vue';

interface DialogTitlePropsExtended extends DialogTitleProps {
  class?: string;
}

const props = defineProps<DialogTitlePropsExtended>();

const classes = computed(() =>
  cn('text-2xl font-semibold leading-tight tracking-tight', props.class)
);
</script>

<template>
  <DialogTitle v-bind="props" :class="classes">
    <slot />
  </DialogTitle>
</template>
