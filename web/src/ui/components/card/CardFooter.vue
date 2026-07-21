<script setup lang="ts">
/**
 * CardFooter 卡片底部
 *
 * 用于放置操作按钮等底部内容，水平布局，顶部 margin 与正文分隔。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardFooterProps {
  class?: string;
}

const props = defineProps<CardFooterProps>();

const classes = computed(() => cn('flex items-center p-6 pt-0', props.class));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
