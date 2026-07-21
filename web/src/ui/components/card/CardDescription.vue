<script setup lang="ts">
/**
 * CardDescription 卡片描述
 *
 * 用于补充说明标题，使用次级文字色 + sm 字号。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardDescriptionProps {
  class?: string;
}

const props = defineProps<CardDescriptionProps>();

const classes = computed(() => cn('text-sm text-text-secondary leading-relaxed', props.class));
</script>

<template>
  <p :class="classes">
    <slot />
  </p>
</template>
