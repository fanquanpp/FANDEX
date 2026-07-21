<script setup lang="ts">
/**
 * CardHeader 卡片头部
 *
 * 用于放置标题、描述等元信息，垂直布局，底部留 margin 与正文分隔。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardHeaderProps {
  class?: string;
}

const props = defineProps<CardHeaderProps>();

const classes = computed(() => cn('flex flex-col gap-1.5 p-6', props.class));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
