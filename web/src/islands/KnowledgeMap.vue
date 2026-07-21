<!--
  知识地图组件 (KnowledgeMap)
  ===========================
  功能概述：
  - 接收服务端预构建的 KnowledgeMap 数据，客户端渲染为 Mermaid 图
  - 支持缩放（鼠标滚轮 + 按钮）、拖拽平移、节点点击跳转
  - 响应暗色模式切换（监听 data-theme 属性变化，重新渲染）
  - 加载中显示 spinner，错误时显示友好提示
  - 节点点击后跳转到对应模块或文档页面

  数据流：
  - 父级 Astro 页面在服务端调用 knowledge-map-service 获取 KnowledgeMap
  - 通过 props 传入 map 数据与 baseUrl
  - 组件内部调用 toMermaidGraph 生成 Mermaid 语法字符串
  - 通过 external-loader 加载 Mermaid 后渲染为 SVG
  - 用户交互（缩放/拖拽/点击）由本地状态控制

  事件处理：
  - 鼠标滚轮：缩放 SVG（以鼠标位置为中心）
  - 鼠标按下 + 移动：拖拽平移
  - 节点点击：根据节点 ID 跳转到对应 URL
  - 主题切换：监听 data-theme 变化重新渲染

  使用场景：
  - 模块知识地图页 /module/map/
  - 全局知识地图页 /map/
-->
<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { loadMermaid, loadDOMPurify } from '@/lib/external-loader';

// ========== 类型定义（内联以避免客户端岛屿间接导入 astro:content） ==========
/** 节点类型：模块节点或文档节点 */
type MapNodeType = 'module' | 'doc';
/** 难度等级 */
type MapDifficulty = 'beginner' | 'intermediate' | 'advanced';
/** 知识地图节点 */
interface MapNode {
  id: string;
  label: string;
  type: MapNodeType;
  module: string;
  difficulty?: MapDifficulty;
  tags?: string[];
}
/** 知识地图边 */
interface MapEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'related';
}
/** 知识地图完整结构 */
interface KnowledgeMap {
  nodes: MapNode[];
  edges: MapEdge[];
}

/**
 * 组件属性
 * @prop map - 服务端预构建的知识地图数据（用于节点点击跳转映射）
 * @prop graphSource - 服务端预生成的 Mermaid 语法字符串（避免客户端导入 astro:content）
 * @prop baseUrl - 站点基础路径（用于生成节点跳转 URL，包含尾部斜杠）
 * @prop scope - 地图范围标识，仅用于错误提示文案与 a11y 标签
 */
const props = defineProps<{
  /** 服务端预构建的知识地图数据（用于节点点击跳转映射） */
  map: KnowledgeMap;
  /** 服务端预生成的 Mermaid 语法字符串 */
  graphSource: string;
  /** 站点基础路径（含尾部斜杠，如 /FANDEX-web/） */
  baseUrl: string;
  /** 地图范围：'global' | 'module' | 'doc'，用于 a11y 与错误提示 */
  scope: 'global' | 'module' | 'doc';
}>();

// ========== 响应式状态 ==========

/** 渲染容器引用 */
const containerRef = ref<HTMLDivElement | null>(null);
/** SVG 容器引用（用于变换操作） */
const svgWrapperRef = ref<HTMLDivElement | null>(null);

/** 加载状态：'loading' | 'rendered' | 'error' */
const status = ref<'loading' | 'rendered' | 'error'>('loading');

/** 错误信息（status === 'error' 时展示） */
const errorMsg = ref<string>('');

/** 当前缩放比例（1 = 原始大小） */
const scale = ref(1);
/** 当前平移 X 偏移（px） */
const translateX = ref(0);
/** 当前平移 Y 偏移（px） */
const translateY = ref(0);

/** 是否正在拖拽 */
const isDragging = ref(false);

/** 拖拽起始坐标（用于计算偏移量） */
const dragStart = reactive({ x: 0, y: 0, originX: 0, originY: 0 });

/** 当前主题（用于 Mermaid 重新渲染） */
const currentTheme = ref<'light' | 'dark'>('light');

/** 主题变化 observer */
let themeObserver: MutationObserver | null = null;

// ========== 计算属性 ==========

/** SVG wrapper 的 transform 字符串 */
const transformStyle = computed(
  () => `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value})`
);

/** 节点 ID → 跳转 URL 的映射表 */
const nodeUrlMap = computed<Map<string, string>>(() => {
  const m = new Map<string, string>();
  for (const node of props.map.nodes) {
    m.set(node.id, buildNodeUrl(node));
  }
  return m;
});

/** 节点数量（用于空状态判断） */
const nodeCount = computed(() => props.map.nodes.length);

/** 空状态文案（根据 scope 给出更具体的提示） */
const emptyText = computed<string>(() => {
  switch (props.scope) {
    case 'module':
      return '该模块暂无知识地图数据';
    case 'doc':
      return '该文档暂无前置或关联文档';
    case 'global':
    default:
      return '暂无知识地图数据';
  }
});

// ========== 生命周期 ==========

onMounted(async () => {
  // 读取初始主题
  currentTheme.value =
    document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  // 监听 data-theme 变化以支持暗色模式切换时重新渲染
  setupThemeObserver();

  // 渲染地图
  await renderMap();
});

onBeforeUnmount(() => {
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
});

// ========== 方法 ==========

/**
 * 构建节点跳转 URL
 * - 模块节点：跳转到 /moduleId/
 * - 文档节点：跳转到 /moduleId/slug/
 * @param node - 节点对象
 * @returns 跳转 URL
 */
function buildNodeUrl(node: MapNode): string {
  if (node.type === 'module') {
    return `${props.baseUrl}${node.id}/`;
  }
  // 文档节点 ID 格式为 `moduleId/slug`
  return `${props.baseUrl}${node.id}/`;
}

/**
 * 设置主题变化监听
 * 通过 MutationObserver 监听 <html> 的 data-theme 属性变化
 * 主题切换时重新渲染 Mermaid 以应用对应配色
 */
function setupThemeObserver(): void {
  themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'data-theme') {
        const newTheme =
          document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        if (newTheme !== currentTheme.value) {
          currentTheme.value = newTheme;
          // 主题变化后重新渲染
          void renderMap();
        }
      }
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

/**
 * 渲染知识地图
 * 核心执行流程：
 *   1. 加载 Mermaid 库（已缓存则跳过实际加载）
 *   2. 调用 mermaid.initialize 配置主题
 *   3. 调用 mermaid.render 生成 SVG 字符串
 *   4. 将 SVG 插入容器，并绑定节点点击事件
 * 异常时设置错误状态，展示友好提示
 */
async function renderMap(): Promise<void> {
  if (nodeCount.value === 0) {
    status.value = 'rendered';
    return;
  }

  status.value = 'loading';
  errorMsg.value = '';

  try {
    // 通过 external-loader 加载 Mermaid（已缓存则立即返回）
    await loadMermaid();
    const mermaid = window.mermaid;
    if (!mermaid) {
      throw new Error('Mermaid 加载后未在 window 上找到');
    }

    // 每次渲染都重新 initialize，确保主题正确
    mermaid.initialize({
      startOnLoad: false,
      theme: currentTheme.value === 'dark' ? 'dark' : 'default',
      securityLevel: 'loose',
    });

    const code = props.graphSource;
    const id = `kmap-svg-${Date.now()}`;
    const { svg } = await mermaid.render(id, code);

    // 等待 DOM 更新后插入 SVG
    // 安全策略：Mermaid securityLevel 为 loose，SVG 须经过 DOMPurify 消毒后再注入 DOM，
    // 防止 Mermaid 渲染产物中潜在的恶意内容触发 XSS。
    await nextTick();
    if (svgWrapperRef.value) {
      try {
        await loadDOMPurify();
        const purify = window.DOMPurify;
        // DOMPurify 可用时消毒 SVG；不可用时降级为 textContent 显示源码，禁止注入未消毒 SVG
        if (purify) {
          svgWrapperRef.value.innerHTML = purify.sanitize(svg);
        } else {
          svgWrapperRef.value.textContent = '知识地图渲染失败：DOMPurify 不可用';
          status.value = 'error';
          return;
        }
      } catch {
        // DOMPurify 加载失败：显示错误，不注入未消毒 SVG
        svgWrapperRef.value.textContent = '知识地图渲染失败：DOMPurify 加载失败';
        status.value = 'error';
        return;
      }
      bindNodeClickHandlers();
      // 重置变换
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
    }

    status.value = 'rendered';
  } catch (err) {
    status.value = 'error';
    errorMsg.value = err instanceof Error ? err.message : String(err);
  }
}

/**
 * 为 SVG 中的节点绑定点击事件
 * Mermaid 渲染的节点为 <g class="node"> 或 <g class="node default">，
 * 内部包含一个 <text> 元素显示 label，节点 ID 通过 data-id 或在 g.node 上
 * 通过 id 属性的前缀匹配
 *
 * 由于 Mermaid 生成的 SVG 节点 ID 可能含特殊字符，这里采用通用策略：
 * 遍历所有 g.node 元素，读取其 id（Mermaid 会以 "flowchart-<NodeID>-N" 命名），
 * 反查 nodeUrlMap，命中则绑定 click 跳转
 *
 * 节点 ID 反转义：toMermaidGraph 在 service 端将原始节点 ID 中的 `/` 转义为 `__`
 * （因 Mermaid 不允许 `/` 出现在节点 ID 中），此处需将 `__` 还原为 `/`，
 * 才能与 props.map.nodes 中的原始 ID 匹配，进而查到跳转 URL
 */
function bindNodeClickHandlers(): void {
  if (!svgWrapperRef.value) return;
  const svg = svgWrapperRef.value.querySelector('svg');
  if (!svg) return;

  // Mermaid 生成的节点 <g> 通常带 class="node"，id 形如 "flowchart-<NodeID>-N"
  const nodeGroups = svg.querySelectorAll<SVGGElement>('g.node');
  nodeGroups.forEach((g) => {
    const rawId = g.getAttribute('id') || '';
    // 从 "flowchart-<NodeID>-N" 中提取 <NodeID>
    const match = rawId.match(/^flowchart-(.+)-\d+$/);
    if (!match) return;
    // noUncheckedIndexedAccess：match[1] 类型为 string | undefined，已通过 !match 排除
    // 将 Mermaid 安全 ID 中的 `__` 还原为 `/`，对应 toMermaidGraph 中的转义
    const mermaidId = match[1] || '';
    const nodeId = mermaidId.replace(/__/g, '/');
    const url = nodeUrlMap.value.get(nodeId);
    if (!url) return;

    // 设置 cursor 与 role，提示可点击
    g.style.cursor = 'pointer';
    g.setAttribute('role', 'link');
    g.setAttribute('tabindex', '0');
    g.setAttribute('aria-label', `跳转到节点 ${nodeId}`);

    // 点击跳转
    g.addEventListener('click', (e: MouseEvent) => {
      e.preventDefault();
      window.location.href = url;
    });
    // 键盘 Enter 跳转（a11y）
    g.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.location.href = url;
      }
    });
  });
}

// ========== 缩放与拖拽 ==========

/**
 * 鼠标滚轮缩放
 * 以鼠标位置为缩放中心，调整 translateX/Y 以保持鼠标点不动
 * @param e - 鼠标滚轮事件
 */
function onWheel(e: WheelEvent): void {
  if (!containerRef.value) return;
  e.preventDefault();

  const rect = containerRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // 缩放因子：向下滚动缩小，向上滚动放大
  const delta = e.deltaY < 0 ? 1.1 : 0.9;
  const newScale = Math.min(Math.max(scale.value * delta, 0.2), 5);
  const scaleRatio = newScale / scale.value;

  // 调整 translate 以鼠标位置为缩放中心
  translateX.value = mouseX - (mouseX - translateX.value) * scaleRatio;
  translateY.value = mouseY - (mouseY - translateY.value) * scaleRatio;
  scale.value = newScale;
}

/**
 * 放大按钮
 */
function zoomIn(): void {
  scale.value = Math.min(scale.value * 1.2, 5);
}

/**
 * 缩小按钮
 */
function zoomOut(): void {
  scale.value = Math.max(scale.value / 1.2, 0.2);
}

/**
 * 重置缩放与平移
 */
function zoomReset(): void {
  scale.value = 1;
  translateX.value = 0;
  translateY.value = 0;
}

/**
 * 鼠标按下：开始拖拽
 * @param e - 鼠标事件
 */
function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0) return;
  isDragging.value = true;
  dragStart.x = e.clientX;
  dragStart.y = e.clientY;
  dragStart.originX = translateX.value;
  dragStart.originY = translateY.value;
}

/**
 * 鼠标移动：拖拽平移
 * @param e - 鼠标事件
 */
function onMouseMove(e: MouseEvent): void {
  if (!isDragging.value) return;
  translateX.value = dragStart.originX + (e.clientX - dragStart.x);
  translateY.value = dragStart.originY + (e.clientY - dragStart.y);
}

/**
 * 鼠标松开：结束拖拽
 */
function onMouseUp(): void {
  isDragging.value = false;
}

/**
 * 鼠标离开容器：结束拖拽
 */
function onMouseLeave(): void {
  isDragging.value = false;
}

/**
 * 重新渲染按钮（错误状态下重试）
 */
function retryRender(): void {
  void renderMap();
}

// 当 map 数据变化时（例如 view transitions 后），重新渲染
watch(
  () => props.map,
  () => {
    void renderMap();
  },
  { deep: false }
);
</script>

<template>
  <div class="kmap-root">
    <!-- 工具栏：缩放控制 + 重新渲染 -->
    <div class="kmap-toolbar" v-if="status === 'rendered' && nodeCount > 0">
      <button class="kmap-btn" @click="zoomOut" aria-label="缩小" title="缩小">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span class="kmap-scale">{{ Math.round(scale * 100) }}%</span>
      <button class="kmap-btn" @click="zoomIn" aria-label="放大" title="放大">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        class="kmap-btn kmap-reset-btn"
        @click="zoomReset"
        aria-label="重置视图"
        title="重置视图"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
    </div>

    <!-- 主渲染容器 -->
    <div
      class="kmap-container"
      ref="containerRef"
      :class="{ 'is-dragging': isDragging, 'is-empty': nodeCount === 0 }"
      @wheel.prevent="onWheel"
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseLeave"
    >
      <!-- 加载中 spinner -->
      <div v-if="status === 'loading'" class="kmap-loading">
        <div class="kmap-spinner" aria-hidden="true"></div>
        <p class="kmap-loading-text">正在加载知识地图...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="status === 'error'" class="kmap-error">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p class="kmap-error-title">知识地图渲染失败</p>
        <p class="kmap-error-detail">{{ errorMsg }}</p>
        <button class="kmap-retry-btn" @click="retryRender">重试</button>
      </div>

      <!-- 空状态 -->
      <div v-else-if="nodeCount === 0" class="kmap-empty">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
        <p class="kmap-empty-text">{{ emptyText }}</p>
      </div>

      <!-- SVG 渲染区（可缩放/拖拽） -->
      <div
        v-show="status === 'rendered' && nodeCount > 0"
        class="kmap-svg-wrapper"
        ref="svgWrapperRef"
        :style="{ transform: transformStyle }"
      ></div>
    </div>

    <!-- 图例说明 -->
    <div class="kmap-legend" v-if="status === 'rendered' && nodeCount > 0">
      <div class="kmap-legend-item">
        <span class="kmap-legend-swatch kmap-legend-module"></span>
        <span>模块</span>
      </div>
      <div class="kmap-legend-item">
        <span class="kmap-legend-swatch kmap-legend-beginner"></span>
        <span>入门</span>
      </div>
      <div class="kmap-legend-item">
        <span class="kmap-legend-swatch kmap-legend-intermediate"></span>
        <span>中级</span>
      </div>
      <div class="kmap-legend-item">
        <span class="kmap-legend-swatch kmap-legend-advanced"></span>
        <span>进阶</span>
      </div>
      <div class="kmap-legend-item">
        <span class="kmap-legend-line kmap-legend-line-solid"></span>
        <span>前置依赖</span>
      </div>
      <div class="kmap-legend-item">
        <span class="kmap-legend-line kmap-legend-line-dashed"></span>
        <span>关联</span>
      </div>
      <div class="kmap-legend-tip">
        <span>提示：滚轮缩放，拖拽平移，点击节点跳转</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 根容器：纵向排列工具栏 + 渲染区 + 图例 */
.kmap-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
}

/* 工具栏：水平排列缩放按钮 */
.kmap-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg);
}

/* 工具栏按钮：方形小按钮 */
.kmap-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition:
    color var(--transition-fast, 0.15s),
    border-color var(--transition-fast, 0.15s);
}

.kmap-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 当前缩放比例显示 */
.kmap-scale {
  font-size: 0.82em;
  color: var(--color-text-secondary);
  min-width: 48px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.kmap-reset-btn {
  margin-left: var(--spacing-xs, 4px);
}

/* 渲染容器：响应式高度 + 布局隔离，避免固定高度导致移动端 CLS 与可视区浪费
   - clamp() 根据视口高度自适应：小屏 380px / 中屏跟随 60vh / 上限 600px
   - contain 隔离子树布局/绘制/样式，防止 SVG 缩放引起父级 reflow 造成 CLS */
.kmap-container {
  position: relative;
  width: 100%;
  height: clamp(380px, 60vh, 600px);
  overflow: hidden;
  background: var(--color-bg);
  cursor: grab;
  user-select: none;
  contain: layout style paint;
}

.kmap-container.is-dragging {
  cursor: grabbing;
}

.kmap-container.is-empty {
  cursor: default;
}

/* SVG wrapper：可变换 */
.kmap-svg-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  /* 通过 inline style 设置实际 transform */
  will-change: transform;
}

/* 兼容暗色模式：SVG 文本颜色继承 */
.kmap-svg-wrapper :deep(svg) {
  max-width: none;
  display: block;
}

.kmap-svg-wrapper :deep(svg .node text) {
  fill: var(--color-text);
}

.kmap-svg-wrapper :deep(svg .edgeLabel) {
  background: var(--color-bg);
}

/* 加载状态 */
.kmap-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md, 16px);
  color: var(--color-text-secondary);
}

.kmap-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: kmap-spin 0.8s linear infinite;
}

@keyframes kmap-spin {
  to {
    transform: rotate(360deg);
  }
}

.kmap-loading-text {
  font-size: 0.88em;
  margin: 0;
}

/* 错误状态 */
.kmap-error {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  color: var(--color-text-secondary);
  padding: var(--spacing-lg, 24px);
  text-align: center;
}

.kmap-error-title {
  font-size: 1em;
  font-weight: 600;
  color: var(--color-text);
  margin: var(--spacing-sm, 8px) 0 0;
}

.kmap-error-detail {
  font-size: 0.82em;
  color: var(--color-text-tertiary);
  margin: 0;
  max-width: 480px;
  word-break: break-word;
}

.kmap-retry-btn {
  margin-top: var(--spacing-md, 16px);
  padding: 6px 16px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  color: var(--color-text);
  font-size: 0.88em;
  cursor: pointer;
  transition:
    color var(--transition-fast, 0.15s),
    border-color var(--transition-fast, 0.15s);
}

.kmap-retry-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 空状态 */
.kmap-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  color: var(--color-text-tertiary);
}

.kmap-empty-text {
  font-size: 0.9em;
  margin: 0;
}

/* 图例区 */
.kmap-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-md, 16px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-top: 1px solid var(--color-border-light);
  background: var(--color-bg);
  font-size: 0.8em;
  color: var(--color-text-secondary);
}

.kmap-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kmap-legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 1px solid var(--color-border);
}

.kmap-legend-module {
  background: #dbeafe;
  border-color: #2563eb;
}

.kmap-legend-beginner {
  background: #dcfce7;
  border-color: #16a34a;
}

.kmap-legend-intermediate {
  background: #fef9c3;
  border-color: #ca8a04;
}

.kmap-legend-advanced {
  background: #fee2e2;
  border-color: #dc2626;
}

.kmap-legend-line {
  display: inline-block;
  width: 20px;
  height: 0;
  border-top: 2px solid var(--color-text-secondary);
}

.kmap-legend-line-dashed {
  border-top-style: dashed;
}

.kmap-legend-tip {
  margin-left: auto;
  font-style: italic;
  color: var(--color-text-tertiary);
}

/* 暗色模式下的图例颜色（保持可读性） */
:global(html[data-theme='dark']) .kmap-legend-module {
  background: #1e3a8a;
  border-color: #60a5fa;
}

:global(html[data-theme='dark']) .kmap-legend-beginner {
  background: #14532d;
  border-color: #4ade80;
}

:global(html[data-theme='dark']) .kmap-legend-intermediate {
  background: #713f12;
  border-color: #facc15;
}

:global(html[data-theme='dark']) .kmap-legend-advanced {
  background: #7f1d1d;
  border-color: #f87171;
}

/* 移动端适配：缩小容器高度 */
@media (max-width: 768px) {
  .kmap-container {
    height: 420px;
  }

  .kmap-legend {
    gap: var(--spacing-sm, 8px);
    font-size: 0.75em;
  }

  .kmap-legend-tip {
    display: none;
  }
}
</style>
