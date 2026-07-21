<script setup lang="ts">
/**
 * Card 卡片容器组件
 *
 * 功能概述：
 * 卡片的基础容器，提供边框、背景、阴影、圆角等视觉骨架。
 * 内部组合 CardHeader/CardTitle/CardDescription/CardContent/CardFooter 子组件。
 *
 * 设计原则：
 * - 纯 Tailwind 类实现，无 radix-vue 依赖
 * - 默认 surface 背景 + 默认边框 + sm 阴影，营造轻微浮起感
 * - 暗色模式自动切换为 surface 背景 + border 边框
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';

interface CardProps {
  class?: string;
}

const props = defineProps<CardProps>();

const classes = computed(() =>
  cn('rounded-xl border border-border bg-surface text-text-primary shadow-sm', props.class)
);
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
