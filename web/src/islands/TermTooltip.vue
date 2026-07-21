<!--
  术语悬浮提示组件 (TermTooltip)
  ===============================
  功能概述：
  - 全页单例岛屿（client:load），通过事件委托统一管理文档中所有术语触发元素
  - remark 插件（src/plugins/remark-term-tooltip.ts）扫描 markdown 文本节点，
    将命中的术语包裹为 <span class="term-tooltip-trigger" data-term="...">...</span>
  - 本组件挂载后扫描这些触发元素，附加交互：
    * 桌面端（matchMedia 检测 hover 能力）：hover 触发自定义定位 Tooltip，debounce 200ms 显示
      Tooltip 视觉风格与 shadcn-vue Tooltip 对齐（elevated 背景、阴影、圆角、淡入动画）
      内容含术语、英文、词源、定义、参考链接
    * 移动端（touch 设备）：点击触发 shadcn-vue Dialog，展示完整释义
  - 数据来源：通过 @services/glossary-service 的同步 lookup() API 直接读取
    src/data/glossary.json，无运行期网络请求

  设计说明：
  - 桌面端不使用 radix-vue Tooltip 的原因是触发元素由 remark 注入、不在 Vue 组件树中，
    radix-vue TooltipTrigger 要求真实子元素。改用自定义定位 Tooltip 实现等效视觉与交互。
  - 移动端 Dialog 由本组件受控开关，shadcn-vue Dialog 完美契合此场景。

  三层架构：
  - UI 层（本组件）：交互、状态、视觉呈现
  - Service 层：glossary-service.ts 的 lookup() 函数
  - Data 层：src/data/glossary.json 静态数据

  使用方式：
  - 在 Layout.astro 中通过 client:load 水合一次（全页单例）
  - 由 remark 插件自动注入触发元素，无需手动编写 <TermTooltip>
-->

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, computed } from 'vue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/ui/components/dialog';
import { lookup } from '@/services/glossary-service';
import type { GlossaryEntry } from '@/types/glossary';
import { ExternalLink } from '@lucide/vue';

// ============================================================================
// 常量
// ============================================================================

/** hover 触发的 debounce 延迟（毫秒），避免鼠标快速滑过时闪烁 */
const HOVER_DEBOUNCE_MS = 200;

/** 触发元素选择器（与 remark 插件输出的 HTML 结构对齐） */
const TRIGGER_SELECTOR = '.term-tooltip-trigger';

/** Tooltip 最大宽度（像素） */
const TOOLTIP_MAX_WIDTH = 360;

/** Tooltip 与触发元素的间距（像素） */
const TOOLTIP_GAP = 8;

/** Tooltip 视口边距（像素，避免溢出屏幕） */
const TOOLTIP_VIEWPORT_MARGIN = 8;

// ============================================================================
// 响应式状态
// ============================================================================

/** 当前 hover 显示的术语条目（用于 Tooltip 内容） */
const activeEntry = ref<GlossaryEntry | null>(null);

/** Tooltip 是否可见 */
const tooltipVisible = ref(false);

/** Tooltip 定位样式（top/left，单位 px） */
const tooltipStyle = ref<{ top: string; left: string; maxWidth: string }>({
  top: '0px',
  left: '0px',
  maxWidth: TOOLTIP_MAX_WIDTH + 'px',
});

/** Tooltip 是否在触发元素上方（默认在下方，空间不足时翻转到上方） */
const tooltipPlacement = ref<'bottom' | 'top'>('bottom');

/** 当前 Dialog 打开状态（移动端使用） */
const dialogOpen = ref(false);

/** Dialog 中展示的术语条目 */
const dialogEntry = ref<GlossaryEntry | null>(null);

/** 是否为触摸设备（决定走 hover 还是 click 路径） */
const isTouchDevice = ref(false);

// ============================================================================
// 内部状态（非响应式）
// ============================================================================

/** debounce 定时器句柄 */
let hoverTimer: ReturnType<typeof setTimeout> | null = null;

/** 当前 hover 中的触发元素 */
let currentTriggerEl: HTMLElement | null = null;

/** MutationObserver 实例（监听 DOM 变化以处理视图切换后的新触发元素） */
let observer: MutationObserver | null = null;

/** 触发元素 -> 事件处理器映射，便于卸载时精确移除 */
const triggerHandlers = new Map<
  HTMLElement,
  {
    enter: (e: Event) => void;
    leave: (e: Event) => void;
    click: (e: Event) => void;
    focus: (e: Event) => void;
    blur: (e: Event) => void;
  }
>();

// ============================================================================
// 计算属性
// ============================================================================

/** Dialog 标题 */
const dialogTitleText = computed<string>(() => dialogEntry.value?.term ?? '术语详情');

/** Dialog 副标题（英文） */
const dialogEnglish = computed<string>(() => dialogEntry.value?.english ?? '');

// ============================================================================
// 生命周期
// ============================================================================

/**
 * 组件挂载：
 * 1. 检测设备类型（touch / non-touch）
 * 2. 扫描 DOM 中的触发元素并绑定事件
 * 3. 注册 MutationObserver 监听 DOM 变化
 * 4. 注册 Astro 页面切换事件
 */
onMounted(() => {
  detectDeviceType();
  bindAllTriggers();
  window.addEventListener('astro:page-load', handlePageLoad);
  registerMutationObserver();
});

/**
 * 组件卸载前：清理所有事件、observer、定时器
 */
onBeforeUnmount(() => {
  unbindAllTriggers();
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  window.removeEventListener('astro:page-load', handlePageLoad);
  window.removeEventListener('resize', detectDeviceType);
});

// ============================================================================
// 设备检测与事件绑定
// ============================================================================

/**
 * 检测当前设备是否为触摸设备
 * 使用 matchMedia 检测 hover 能力与 pointer 类型
 */
function detectDeviceType(): void {
  try {
    const hoverMatch = window.matchMedia('(hover: none)');
    const pointerMatch = window.matchMedia('(pointer: coarse)');
    isTouchDevice.value = hoverMatch.matches || pointerMatch.matches;
  } catch {
    isTouchDevice.value = false;
  }
  window.removeEventListener('resize', detectDeviceType);
  window.addEventListener('resize', detectDeviceType);
}

/**
 * 扫描文档内容区中所有触发元素，绑定事件监听
 * 仅在 article.prose 范围内查找，避免误绑定非术语元素
 */
function bindAllTriggers(): void {
  const article = document.querySelector('article.prose');
  const root: ParentNode = article ?? document;
  const triggers = root.querySelectorAll<HTMLElement>(TRIGGER_SELECTOR);
  triggers.forEach(bindTrigger);
}

/**
 * 为单个触发元素绑定事件
 * - 桌面端：mouseenter/leave + focus/blur（键盘可达性）
 * - 移动端：click 触发 Dialog
 */
function bindTrigger(el: HTMLElement): void {
  if (triggerHandlers.has(el)) return;

  const enter = (e: Event): void => {
    if (isTouchDevice.value) return;
    const target = e.currentTarget as HTMLElement;
    scheduleHoverShow(target);
  };
  const leave = (e: Event): void => {
    if (isTouchDevice.value) return;
    const target = e.currentTarget as HTMLElement;
    scheduleHoverHide(target);
  };
  const click = (e: Event): void => {
    e.preventDefault();
    e.stopPropagation();
    if (!isTouchDevice.value) return;
    const target = e.currentTarget as HTMLElement;
    const term = target.getAttribute('data-term') ?? '';
    const entry = lookup(term);
    if (entry) {
      dialogEntry.value = entry;
      dialogOpen.value = true;
    }
  };
  const focus = (e: Event): void => {
    if (isTouchDevice.value) return;
    const target = e.currentTarget as HTMLElement;
    scheduleHoverShow(target);
  };
  const blur = (e: Event): void => {
    if (isTouchDevice.value) return;
    const target = e.currentTarget as HTMLElement;
    scheduleHoverHide(target);
  };

  el.addEventListener('mouseenter', enter);
  el.addEventListener('mouseleave', leave);
  el.addEventListener('click', click);
  el.addEventListener('focus', focus);
  el.addEventListener('blur', blur);

  triggerHandlers.set(el, { enter, leave, click, focus, blur });
}

/**
 * 移除所有触发元素的事件监听
 */
function unbindAllTriggers(): void {
  for (const [el, handlers] of triggerHandlers) {
    el.removeEventListener('mouseenter', handlers.enter);
    el.removeEventListener('mouseleave', handlers.leave);
    el.removeEventListener('click', handlers.click);
    el.removeEventListener('focus', handlers.focus);
    el.removeEventListener('blur', handlers.blur);
  }
  triggerHandlers.clear();
}

// ============================================================================
// hover debounce 与 Tooltip 定位
// ============================================================================

/**
 * 安排 hover 显示：debounce 200ms 后展示 Tooltip
 * 200ms 内鼠标移出则取消展示，避免误触
 *
 * @param el - 触发 hover 的元素
 */
function scheduleHoverShow(el: HTMLElement): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  currentTriggerEl = el;
  hoverTimer = setTimeout(() => {
    const term = el.getAttribute('data-term') ?? '';
    const entry = lookup(term);
    if (!entry || currentTriggerEl !== el) return;
    activeEntry.value = entry;
    // 先设为可见再计算位置，否则无法获取 Tooltip 实际高度做翻转判断
    tooltipVisible.value = true;
    // nextTick 等 Tooltip 渲染到 DOM 后再计算定位
    void nextTick(() => positionTooltip(el));
  }, HOVER_DEBOUNCE_MS);
}

/**
 * 安排 hover 隐藏：立即清除待展示定时器，关闭 Tooltip
 *
 * @param el - 当前移出的元素
 */
function scheduleHoverHide(el: HTMLElement): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  if (currentTriggerEl === el) {
    tooltipVisible.value = false;
    activeEntry.value = null;
    currentTriggerEl = null;
  }
}

/**
 * 计算 Tooltip 浮层位置
 * 默认放在触发元素下方，空间不足时翻转到上方；同时做水平边界裁剪
 *
 * @param triggerEl - 触发元素
 */
function positionTooltip(triggerEl: HTMLElement): void {
  const triggerRect = triggerEl.getBoundingClientRect();
  const tooltipEl = document.querySelector<HTMLElement>('.term-tooltip-floating');
  if (!tooltipEl) return;

  const tooltipRect = tooltipEl.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  // 垂直定位：默认下方，空间不足翻转到上方
  let top: number;
  let placement: 'bottom' | 'top';
  const spaceBelow = viewportH - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  if (
    spaceBelow >= tooltipRect.height + TOOLTIP_GAP + TOOLTIP_VIEWPORT_MARGIN ||
    spaceBelow >= spaceAbove
  ) {
    top = triggerRect.bottom + TOOLTIP_GAP;
    placement = 'bottom';
  } else {
    top = triggerRect.top - tooltipRect.height - TOOLTIP_GAP;
    placement = 'top';
  }
  tooltipPlacement.value = placement;

  // 水平定位：默认左对齐触发元素，溢出右侧时左移
  let left = triggerRect.left;
  if (left + tooltipRect.width + TOOLTIP_VIEWPORT_MARGIN > viewportW) {
    left = viewportW - tooltipRect.width - TOOLTIP_VIEWPORT_MARGIN;
  }
  if (left < TOOLTIP_VIEWPORT_MARGIN) {
    left = TOOLTIP_VIEWPORT_MARGIN;
  }

  tooltipStyle.value = {
    top: top + 'px',
    left: left + 'px',
    maxWidth: TOOLTIP_MAX_WIDTH + 'px',
  };
}

// ============================================================================
// Astro 页面切换与 MutationObserver
// ============================================================================

/**
 * 处理 Astro 视图切换事件：DOM 已替换，需重新绑定触发元素
 */
function handlePageLoad(): void {
  detectDeviceType();
  unbindAllTriggers();
  // 隐藏可能残留的 Tooltip
  tooltipVisible.value = false;
  activeEntry.value = null;
  void nextTick(bindAllTriggers);
}

/**
 * 注册 MutationObserver 监听 article.prose 子树变化
 * 用于动态加载内容（如 Mermaid 渲染后）扫描新的触发元素
 */
function registerMutationObserver(): void {
  if (typeof MutationObserver === 'undefined') return;
  const article = document.querySelector('article.prose');
  if (!article) return;
  observer = new MutationObserver((mutations) => {
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (!hasNewNodes) return;
    // 防抖：避免连续 mutation 触发多次扫描
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    hoverTimer = setTimeout(() => {
      bindAllTriggers();
    }, 100);
  });
  observer.observe(article, { childList: true, subtree: true });
}
</script>

<template>
  <!--
    桌面端 Tooltip：固定定位浮层，由 tooltipVisible 控制显隐
    使用 Teleport 到 body 避免 z-index 与父容器裁剪问题
    视觉风格与 shadcn-vue Tooltip 对齐：elevated 背景、阴影、淡入动画
  -->
  <Teleport to="body">
    <div
      v-if="tooltipVisible && activeEntry"
      class="term-tooltip-floating"
      :class="`term-tooltip-placement-${tooltipPlacement}`"
      :style="tooltipStyle"
      role="tooltip"
      @mouseenter="
        /* 鼠标进入浮层时保持显示 */ (() => {
          /* no-op */
        })()
      "
      @mouseleave="scheduleHoverHide(currentTriggerEl ?? document.body)"
    >
      <div class="term-tooltip-body">
        <!-- 头部：术语 + 英文 -->
        <div class="term-tooltip-header">
          <span class="term-tooltip-term">{{ activeEntry.term }}</span>
          <span v-if="activeEntry.english" class="term-tooltip-english">
            {{ activeEntry.english }}
          </span>
        </div>
        <!-- 词源（可选） -->
        <p v-if="activeEntry.etymology" class="term-tooltip-etymology">
          {{ activeEntry.etymology }}
        </p>
        <!-- 定义 -->
        <p class="term-tooltip-definition">{{ activeEntry.definition }}</p>
        <!-- 参考链接 -->
        <div
          v-if="activeEntry.references && activeEntry.references.length > 0"
          class="term-tooltip-refs"
        >
          <a
            v-for="(ref, i) in activeEntry.references"
            :key="i"
            :href="ref"
            target="_blank"
            rel="noopener noreferrer"
            class="term-tooltip-ref-link"
            @click.stop
          >
            <ExternalLink class="size-3" />
            <span>{{ ref }}</span>
          </a>
        </div>
      </div>
      <!-- 小箭头（指向触发元素） -->
      <span class="term-tooltip-arrow" :class="`term-tooltip-arrow-${tooltipPlacement}`"></span>
    </div>
  </Teleport>

  <!--
    移动端 Dialog：基于 shadcn-vue Dialog
    由 dialogOpen 受控，dialogEntry 提供内容
  -->
  <Dialog v-model:open="dialogOpen">
    <DialogContent class="term-dialog-content">
      <DialogTitle class="term-dialog-title">{{ dialogTitleText }}</DialogTitle>
      <DialogDescription class="term-dialog-english">
        {{ dialogEnglish }}
      </DialogDescription>
      <div v-if="dialogEntry" class="term-dialog-body">
        <div v-if="dialogEntry.etymology" class="term-dialog-section">
          <h4 class="term-dialog-section-title">词源</h4>
          <p class="term-dialog-section-text">{{ dialogEntry.etymology }}</p>
        </div>
        <div class="term-dialog-section">
          <h4 class="term-dialog-section-title">定义</h4>
          <p class="term-dialog-section-text">{{ dialogEntry.definition }}</p>
        </div>
        <div
          v-if="dialogEntry.references && dialogEntry.references.length > 0"
          class="term-dialog-section"
        >
          <h4 class="term-dialog-section-title">参考</h4>
          <ul class="term-dialog-ref-list">
            <li v-for="(ref, i) in dialogEntry.references" :key="i">
              <a :href="ref" target="_blank" rel="noopener noreferrer" class="term-dialog-ref-link">
                <ExternalLink class="size-3.5" />
                <span>{{ ref }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
/* ============================================================================
   TermTooltip 局部样式
   ----------------------------------------------------------------------------
   样式策略：
   - 桌面端 Tooltip 视觉风格对齐 shadcn-vue Tooltip（elevated 背景、阴影、圆角）
   - 移动端 Dialog 使用 shadcn-vue 默认样式，仅微调内部布局
   ============================================================================ */

/* ----- 桌面端 Tooltip 浮层 ----- */
.term-tooltip-floating {
  position: fixed;
  z-index: 9999; /* 高于普通内容，低于 modal */
  background: var(--color-bg-elevated, #1f2937);
  color: var(--color-text-inverse, #ffffff);
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-md, 6px);
  box-shadow:
    0 4px 16px rgba(0, 0, 0, 0.18),
    0 1px 4px rgba(0, 0, 0, 0.12);
  padding: 0;
  overflow: visible;
  pointer-events: auto;
  animation: term-tooltip-fade-in 0.15s ease-out;
}

@keyframes term-tooltip-fade-in {
  from {
    opacity: 0;
    transform: translateY(2px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.term-tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.55;
  max-height: 320px;
  overflow-y: auto;
}

/* 头部：术语（粗体）+ 英文（次要色，斜体） */
.term-tooltip-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.term-tooltip-term {
  font-weight: 600;
  font-size: 13px;
  color: var(--color-text-inverse, #ffffff);
}

.term-tooltip-english {
  font-family: var(--font-display, ui-monospace, monospace);
  font-size: 11px;
  font-style: italic;
  color: rgba(255, 255, 255, 0.65);
}

/* 词源段落 */
.term-tooltip-etymology {
  margin: 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  border-left: 2px solid rgba(255, 255, 255, 0.2);
  padding-left: 6px;
  line-height: 1.5;
}

/* 定义段落 */
.term-tooltip-definition {
  margin: 0;
  color: var(--color-text-inverse, #ffffff);
}

/* 参考链接区 */
.term-tooltip-refs {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
}

.term-tooltip-ref-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10.5px;
  color: #93c5fd;
  text-decoration: none;
  word-break: break-all;
  transition: color 0.15s;
}

.term-tooltip-ref-link:hover {
  color: #bfdbfe;
  text-decoration: underline;
}

/* 小箭头 */
.term-tooltip-arrow {
  position: absolute;
  width: 8px;
  height: 8px;
  background: var(--color-bg-elevated, #1f2937);
  border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.12));
  transform: rotate(45deg);
}

/* 箭头位置：下方时位于顶部边缘 */
.term-tooltip-arrow-bottom {
  top: -5px;
  left: 16px;
  border-right: none;
  border-bottom: none;
}

/* 箭头位置：上方时位于底部边缘 */
.term-tooltip-arrow-top {
  bottom: -5px;
  left: 16px;
  border-left: none;
  border-top: none;
}

/* ----- 移动端 Dialog 内容 ----- */
.term-dialog-content {
  max-width: 540px;
}

.term-dialog-title {
  font-size: 1.4em;
  font-weight: 700;
  color: var(--color-text-primary, #1f2937);
}

.term-dialog-english {
  font-family: var(--font-display, ui-monospace, monospace);
  font-style: italic;
  color: var(--color-text-secondary, #6b7280);
  font-size: 0.95em;
}

.term-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 8px;
}

.term-dialog-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.term-dialog-section-title {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--color-text-tertiary, #9ca3af);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.term-dialog-section-text {
  font-size: 0.95em;
  line-height: 1.7;
  color: var(--color-text-primary, #1f2937);
  margin: 0;
}

.term-dialog-ref-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.term-dialog-ref-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.88em;
  color: var(--color-primary-600, #2563eb);
  text-decoration: none;
  word-break: break-all;
  transition: color 0.15s;
}

.term-dialog-ref-link:hover {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: underline;
}

/* ============================================================================
   暗色模式适配
   ============================================================================ */

[data-theme='dark'] .term-dialog-title {
  color: var(--color-text-primary, #f9fafb);
}

[data-theme='dark'] .term-dialog-english {
  color: var(--color-text-secondary, #9ca3af);
}

[data-theme='dark'] .term-dialog-section-text {
  color: var(--color-text-primary, #f9fafb);
}

/* ============================================================================
   响应式
   ============================================================================ */

@media (max-width: 640px) {
  .term-dialog-content {
    width: calc(100vw - 2rem);
    max-width: calc(100vw - 2rem);
  }
}
</style>
