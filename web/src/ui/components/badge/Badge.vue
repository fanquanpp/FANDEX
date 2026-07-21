<script setup lang="ts">
/**
 * Badge 小标签组件
 *
 * 功能概述：
 * 用于显示状态、计数、分类等小标签。支持 4 种 variant，
 * 基于 cva 生成类名，可通过 class prop 覆盖默认样式。
 *
 * 使用示例：
 *   <Badge>默认</Badge>
 *   <Badge variant="secondary">次级</Badge>
 *   <Badge variant="destructive">错误</Badge>
 *   <Badge variant="outline">描边</Badge>
 */

import { computed } from 'vue';
import { cn } from '@/lib/utils';
import { badgeVariants, type BadgeVariants } from './badge-variants';

interface BadgeProps {
  variant?: BadgeVariants['variant'];
  class?: string;
}

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: 'default',
});

const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class));
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
