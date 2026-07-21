<!--
  主题切换组件 (ThemeToggle)
  ========================
  功能概述：
  - 在亮色(light)和暗色(dark)模式之间切换
  - 主题状态持久化到 localStorage（键名: fandex-theme），刷新页面后保持用户选择
  - 首次访问时跟随系统偏好（prefers-color-scheme）
  - SSR 阶段渲染不可见占位按钮（保留布局空间避免 CLS），
    客户端挂载后填充实际图标，避免水合后布局偏移

  数据流：
  - onMounted 时从 localStorage 读取已保存的主题，无保存值时检测系统偏好
  - 切换时同步更新：theme(ref) → document.documentElement data-theme 属性 → localStorage
  - 通过 data-theme 属性驱动全局 CSS 变量切换（在全局样式中定义）

  事件处理：
  - 点击按钮调用 toggle()，切换主题并持久化

  使用场景：
  - 放置在页面顶部导航栏，作为全局主题控制入口
  - 配合 Astro 岛屿架构，仅客户端交互
-->
<script setup lang="ts">
import { ref, onMounted } from 'vue';

/**
 * 当前主题状态：'light' 亮色 | 'dark' 暗色
 * 初始值为 'light'，在 onMounted 中根据 localStorage 或系统偏好修正
 */
const theme = ref<'light' | 'dark'>('light');

/**
 * 是否已完成客户端挂载
 * 用于控制图标的可见性：
 * - SSR 阶段渲染透明占位按钮（保留 32x32 布局空间，CLS=0）
 * - 客户端挂载后通过 opacity 平滑显示图标
 */
const mounted = ref(false);

/**
 * 组件挂载后的初始化逻辑
 * 1. 标记已挂载，触发图标淡入
 * 2. 从 localStorage 读取用户保存的主题偏好
 * 3. 如果没有保存值，则检测系统暗色模式偏好
 * 4. 根据结果设置 theme 值，并同步刷新 data-theme 属性与 colorScheme
 *    （作为 BaseLayout 初始化脚本的二次保险：当组件被重新挂载、
 *    或初始化脚本因故未执行时，确保 data-theme 始终处于显式声明状态，
 *    避免 tokens.css 的 :root:not([data-theme]) 兜底逻辑误覆盖用户选择）
 */
onMounted(() => {
  // 读取用户保存的主题偏好，无保存值时跟随系统
  const saved = localStorage.getItem('fandex-theme');
  let initial: 'light' | 'dark';
  if (saved === 'dark' || saved === 'light') {
    initial = saved;
  } else {
    initial = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  theme.value = initial;
  // 同步显式声明 data-theme，消除"无属性"中间态
  document.documentElement.setAttribute('data-theme', initial);
  document.documentElement.style.colorScheme = initial;
  // 下一帧标记挂载完成，触发 opacity 过渡（避免初始渲染闪烁）
  requestAnimationFrame(() => {
    mounted.value = true;
  });
});

/**
 * 切换主题并持久化到 localStorage
 * 逻辑：
 *   1. 翻转当前主题（dark → light, light → dark）
 *   2. 设置 <html> 元素的 data-theme 属性，触发全局 CSS 变量切换
 *   3. 将新主题保存到 localStorage，确保刷新后保持
 */
function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', theme.value);
  document.documentElement.style.colorScheme = theme.value;
  localStorage.setItem('fandex-theme', theme.value);
}
</script>

<template>
  <!--
    始终渲染按钮以保留布局空间（避免水合后 CLS）：
    - SSR 阶段：按钮透明不可点击（mounted=false）
    - 客户端挂载后：opacity 过渡到 1，pointer-events 启用
  -->
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle--ready': mounted }"
    @click="mounted ? toggle() : undefined"
    :title="theme === 'dark' ? '亮色模式' : '暗色模式'"
    :aria-label="theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'"
    :tabindex="mounted ? 0 : -1"
    :aria-hidden="!mounted"
  >
    <!-- 暗色模式下显示太阳图标（提示用户可切换到亮色） -->
    <svg
      v-show="mounted && theme === 'dark'"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
    <!-- 亮色模式下显示月亮图标（提示用户可切换到暗色） -->
    <svg
      v-show="mounted && theme === 'light'"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  </button>
</template>

<style scoped>
/* 主题切换按钮：方形图标按钮，居中对齐 */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  /* SSR 阶段透明占位，避免水合后图标突然出现造成 CLS */
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 200ms ease,
    background 150ms ease,
    color 150ms ease;
}

/* 客户端挂载完成：淡入并启用交互 */
.theme-toggle--ready {
  opacity: 1;
  pointer-events: auto;
}

/* 悬停效果：背景变浅，图标变为主题色 */
.theme-toggle:hover {
  background: var(--color-bg-hover);
  color: var(--color-primary);
}
</style>
