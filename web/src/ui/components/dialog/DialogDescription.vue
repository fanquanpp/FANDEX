<script setup lang="ts">
/**
 * DialogDescription 对话框描述
 *
 * 用于无障碍语义（aria-describedby），sm 字号 + 次级文字色。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { DialogDescription, type DialogDescriptionProps } from 'radix-vue';

interface DialogDescriptionPropsExtended extends DialogDescriptionProps {
  class?: string;
}

const props = defineProps<DialogDescriptionPropsExtended>();

const classes = computed(() => cn('text-sm text-text-secondary leading-relaxed', props.class));
</script>

<template>
  <DialogDescription v-bind="props" :class="classes">
    <slot />
  </DialogDescription>
</template>
