<script setup lang="ts">
/**
 * CardTitle 卡片标题
 *
 * 使用 2xl 字号 + semibold 字重，确保视觉层级突出。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardTitleProps {
  class?: string;
}

const props = defineProps<CardTitleProps>();

const classes = computed(() =>
  cn('text-2xl font-semibold leading-tight tracking-tight', props.class)
);
</script>

<template>
  <h3 :class="classes">
    <slot />
  </h3>
</template>
