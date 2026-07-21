<script setup lang="ts">
/**
 * CardContent 卡片正文
 *
 * 用于放置主内容，与 Header/Footer 通过 padding 隔离。
 */
import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardContentProps {
  class?: string;
}

const props = defineProps<CardContentProps>();

const classes = computed(() => cn('p-6 pt-0', props.class));
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
