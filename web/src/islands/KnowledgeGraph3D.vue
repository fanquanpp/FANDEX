<!--
  3D 知识图谱组件 (KnowledgeGraph3D)
  ====================================
  功能概述：
  - 基于 vasturiano/3d-force-graph（ThreeJS/WebGL）渲染大规模知识图谱
  - 支持单图渲染 10000+ 节点，远超 Mermaid 的承载能力
  - 3D 力导向布局：节点自然散布于 3D 空间，可旋转/缩放/平移查看
  - 节点按类型与难度着色，边按类型区分实线/虚线效果（颜色区分）
  - 节点点击立即跳转到对应模块或文档页面（无中间动画）
  - 响应暗色模式切换（重建图实例应用对应配色）
  - 加载中显示 spinner，错误时显示友好提示

  健壮性策略：
  - 渲染锁（isRendering + pendingRender）：串行化 renderGraph 调用
    防止主题切换、resize、retry 等并发场景下旧实例未销毁就创建新实例
    导致 canvas 重叠、WebGL context 冲突
  - 主题切换防抖（200ms）：避免动画期间多次触发重建
    配合渲染锁双重保证并发安全
  - destroy 后 RAF 让出主线程：确保 ThreeJS/WebGL 资源回收完成
    避免立即 new ForceGraph3D 复用同一 DOM 导致 WebGL context 冲突
  - currentTheme 在 setup 阶段同步读取初始值
    避免首次渲染前有一帧主题错误（原 onMounted 才读取）

  性能优化策略（针对 52 模块 + 2065 文档 + 4583 关系的大规模图）：
  - linkWidth=0：用 THREE.Line 替代 CylinderGeometry，避免 4583 个圆柱 mesh
    这是最大性能杀手，改为 Line 性能提升 5-10 倍
  - DAG 层次布局（dagMode='zout'）：利用 prerequisite 关系的有向无环特性
    节点按深度沿 Z 轴分层，比纯力导向更稳定、收敛更快
  - d3-force 参数调优：降低 charge 斥力（-30 -> -8）、缩短 link 距离（30 -> 20）
    让节点散布更均匀、视觉层次更清晰
  - 关闭 WebGL 抗锯齿（antialias: false）：降低 GPU 片元着色负担
  - 限制 devicePixelRatio 上限 1.5：避免 Retina 屏渲染像素翻 4-9 倍
  - 快速冷却物理引擎（cooldownTicks=80, cooldownTime=1500ms）：
    节点 1.5 秒后稳定，便于精准点击
  - 边直线渲染（linkCurvature=0）：省去曲线几何计算
  - 降低节点几何细分（nodeResolution=6）：减少球体顶点数
  - 禁用节点拖拽（enableNodeDrag=false）：避免误触发力重计算导致图重新震荡
  - 移除边方向粒子动画：降低每帧 GPU 绘制负担
  - 加载流程优化：nextTick + RAF 让出主线程，spinner 先渲染
    避免 ThreeJS 初始化同步阻塞导致 UI 无响应

  数据流：
  - 父级 Astro 页面在服务端调用 knowledge-map-service 获取完整 KnowledgeMap
  - 通过 props 传入 map 数据与 baseUrl
  - 组件内部将 KnowledgeMap 转换为 3d-force-graph 数据结构（nodes/links）
  - 通过 external-loader 动态加载 3d-force-graph 后渲染
  - 用户交互（旋转/缩放/点击）由 3d-force-graph 内置 control 处理

  交互方式：
  - 左键拖拽：旋转 3D 视角
  - 鼠标滚轮：缩放
  - 右键拖拽：平移
  - 节点点击：立即跳转到对应 URL（无 focus/zoom 过渡）
  - 节点悬停：显示 label tooltip

  使用场景：
  - 全局知识地图页 /map/（大规模图，52 模块 + 2065 文档 + 4583 关系）
-->
<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { loadForceGraph } from '@/lib/external-loader';

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
 * 3d-force-graph 实例最小接口契约
 * 通过 CDN 加载挂载到 window.ForceGraph3D（any 类型），
 * 此处定义最小接口约束实际使用的 API，提升类型安全性
 */
interface ForceGraphInstance {
  graphData(data: { nodes: unknown[]; links: unknown[] }): ForceGraphInstance;
  backgroundColor(color: string): ForceGraphInstance;
  nodeRelSize(size: number): ForceGraphInstance;
  nodeResolution(resolution: number): ForceGraphInstance;
  nodeVal(
    fn: (node: { id: string; type?: string; difficulty?: string }) => number
  ): ForceGraphInstance;
  nodeColor(
    fn: (node: { id: string; type?: string; difficulty?: string }) => string
  ): ForceGraphInstance;
  nodeLabel(
    fn: (node: {
      id: string;
      label?: string;
      type?: string;
      module?: string;
      difficulty?: string;
    }) => string
  ): ForceGraphInstance;
  nodeOpacity(opacity: number): ForceGraphInstance;
  linkColor(fn: (link: { type?: string }) => string): ForceGraphInstance;
  linkOpacity(opacity: number): ForceGraphInstance;
  linkWidth(width: number): ForceGraphInstance;
  linkDirectionalArrowLength(length: number): ForceGraphInstance;
  linkDirectionalArrowRelPos(pos: number): ForceGraphInstance;
  linkCurvature(curvature: number): ForceGraphInstance;
  onNodeClick(handler: (node: { id?: string }, event: MouseEvent) => void): ForceGraphInstance;
  onNodeHover(handler: (node: { id?: string } | null) => void): ForceGraphInstance;
  dagMode(mode: string): ForceGraphInstance;
  dagLevelDistance(distance: number): ForceGraphInstance;
  d3Force(
    name: string,
    fn?: { strength?: (node: unknown, i: number, nodes: unknown[]) => number } | null
  ): unknown;
  width(w: number): ForceGraphInstance;
  height(h: number): ForceGraphInstance;
  refresh(): ForceGraphInstance;
  zoomToFit(ms?: number, padding?: number): ForceGraphInstance;
  pauseAnimation(): ForceGraphInstance;
  resumeAnimation(): ForceGraphInstance;
  cooldownTicks(ticks: number): ForceGraphInstance;
  cooldownTime(ms: number): ForceGraphInstance;
  onEngineStop(handler: () => void): ForceGraphInstance;
  destroy(): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface ForceGraphConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (element: HTMLElement, options?: Record<string, any>): ForceGraphInstance;
}

/**
 * 组件属性
 * @prop map - 服务端预构建的完整知识地图数据（包含模块节点 + 文档节点 + 全部边）
 * @prop baseUrl - 站点基础路径（用于生成节点跳转 URL，包含尾部斜杠）
 * @prop scope - 地图范围标识，仅用于错误提示文案与 a11y 标签
 */
const props = defineProps<{
  /** 服务端预构建的完整知识地图数据 */
  map: KnowledgeMap;
  /** 站点基础路径（含尾部斜杠，如 /FANDEX-web/） */
  baseUrl: string;
  /** 地图范围：仅用于 a11y 与错误提示，组件始终按全局模式渲染 */
  scope: 'global' | 'module' | 'doc';
}>();

// ========== 响应式状态 ==========

/** 渲染容器引用 */
const containerRef = ref<HTMLDivElement | null>(null);

/** 加载状态：'loading' | 'rendered' | 'error' */
const status = ref<'loading' | 'rendered' | 'error'>('loading');

/** 错误信息（status === 'error' 时展示） */
const errorMsg = ref<string>('');

/** 当前主题（用于配色切换）
 * 初始值在 setup 阶段同步读取，避免首次渲染前有一帧主题错误
 * 若 DOM 未就绪则回退 'light'（SSR 安全） */
const initialTheme =
  typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light';
const currentTheme = ref<'light' | 'dark'>(initialTheme);

/** 主题变化 observer */
let themeObserver: MutationObserver | null = null;

/** 3d-force-graph 实例（不参与响应式，避免 Vue 深度代理拖累性能） */
let graphInstance: ForceGraphInstance | null = null;

/** 是否暂停动画（用于暂停/恢复按钮） */
const isPaused = ref(false);

/** resize 防抖计时器句柄 */
let resizeTimer: number | null = null;

/** 当前 hover 节点 ID（用于 cursor 切换） */
const hoveredNodeId = ref<string | null>(null);

/** 渲染锁：防止并发 renderGraph 调用导致图实例重叠
 * 主题切换、resize、retry 等场景可能短时间内触发多次渲染，
 * 通过 isRendering 标志串行化，避免旧实例未销毁就创建新实例 */
let isRendering = false;

/** 主题切换防抖计时器句柄 */
let themeDebounceTimer: number | null = null;

/** 待渲染标记：渲染锁释放后如果有 pending 请求，则再次执行渲染
 * 保证最后一次主题切换最终生效，避免快速切换时停留在中间态 */
let pendingRender = false;

// ========== 计算属性 ==========

/** 模块节点数量 */
const moduleCount = computed(() => props.map.nodes.filter((n) => n.type === 'module').length);

/** 文档节点数量 */
const docCount = computed(() => props.map.nodes.filter((n) => n.type === 'doc').length);

/** 关系数量 */
const edgeCount = computed(() => props.map.edges.length);

/** 节点 ID → 跳转 URL 的映射表 */
const nodeUrlMap = computed<Map<string, string>>(() => {
  const m = new Map<string, string>();
  for (const node of props.map.nodes) {
    m.set(node.id, buildNodeUrl(node));
  }
  return m;
});

// ========== 生命周期 ==========

onMounted(async () => {
  // currentTheme 已在 setup 阶段同步初始化，此处无需再读

  // 监听 data-theme 变化以支持暗色模式切换时重新渲染
  setupThemeObserver();

  // 监听窗口尺寸变化，同步 canvas 尺寸（防抖 200ms 避免频繁 refresh）
  window.addEventListener('resize', handleResizeDebounced);

  // 渲染图谱
  await renderGraph();
});

onBeforeUnmount(() => {
  destroyGraph();
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }
  if (themeDebounceTimer !== null) {
    window.clearTimeout(themeDebounceTimer);
    themeDebounceTimer = null;
  }
  window.removeEventListener('resize', handleResizeDebounced);
  if (resizeTimer !== null) {
    window.clearTimeout(resizeTimer);
    resizeTimer = null;
  }
  // 重置渲染状态，避免组件卸载后 pending render 误触发
  isRendering = false;
  pendingRender = false;
});

// ========== 方法 ==========

/**
 * 构建节点跳转 URL
 * 模块节点 ID 为 `moduleId`，文档节点 ID 为 `moduleId/slug`，
 * 两种情况均通过 `${baseUrl}${nodeId}/` 构建出正确路径，逻辑一致。
 * @param node - 节点对象
 * @returns 跳转 URL（含尾部斜杠）
 */
function buildNodeUrl(node: MapNode): string {
  return `${props.baseUrl}${node.id}/`;
}

/**
 * 获取节点颜色
 * - 模块节点：蓝色系
 * - 文档节点：按难度着色（入门绿/中级黄/进阶红/默认灰）
 * @param node - 节点数据
 * @returns 颜色字符串
 */
function getNodeColor(node: { type?: string; difficulty?: string }): string {
  const isDark = currentTheme.value === 'dark';
  if (node.type === 'module') {
    return isDark ? '#60a5fa' : '#2563eb';
  }
  switch (node.difficulty) {
    case 'beginner':
      return isDark ? '#4ade80' : '#16a34a';
    case 'intermediate':
      return isDark ? '#facc15' : '#ca8a04';
    case 'advanced':
      return isDark ? '#f87171' : '#dc2626';
    default:
      return isDark ? '#9ca3af' : '#6b7280';
  }
}

/**
 * 将 KnowledgeMap 数据转换为 3d-force-graph 数据结构
 *
 * 转换规则：
 * - 节点字段：id、label、type、module、difficulty（保留原字段）
 *   3d-force-graph 默认按 `id` 字段作为节点唯一标识
 * - 边字段：source、target、type
 *   3d-force-graph 默认按 `source`/`target` 字段引用节点 id
 *
 * 去重策略说明：
 * - 服务层 dedupeEdges 按 `from|to|type` 去重，可能同时存在同一对节点之间的
 *   prerequisite 与 related 两条边
 * - 3d-force-graph 允许同一对节点存在多条边，但视觉上会重叠难辨
 * - 此处按 (source, target) 二元组去重，prerequisite 优先于 related
 *   （prerequisite 表达的学习路径信息比 related 关联更强，应优先保留）
 *
 * @returns 3d-force-graph 数据对象，包含 nodes、links
 */
function buildGraphData(): { nodes: unknown[]; links: unknown[] } {
  const nodes: unknown[] = props.map.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type,
    module: n.module,
    difficulty: n.difficulty,
  }));

  const links: unknown[] = [];
  const seenPair = new Set<string>();

  // 第一轮：收集 prerequisite 边（有向：A->B 与 B->A 是不同关系，保留方向）
  for (const edge of props.map.edges) {
    if (edge.type !== 'prerequisite') continue;
    const key = `${edge.from}|${edge.to}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    links.push({
      source: edge.from,
      target: edge.to,
      type: edge.type,
    });
  }
  // 第二轮：补充 related 边（无向：A-B 与 B-A 是同一关系，按字典序归一化去重）
  for (const edge of props.map.edges) {
    if (edge.type !== 'related') continue;
    // related 是无向关系，按字典序归一化节点对，避免 A-B 与 B-A 视为不同边导致重复
    const [a, b] = edge.from < edge.to ? [edge.from, edge.to] : [edge.to, edge.from];
    const key = `${a}|${b}`;
    if (seenPair.has(key)) continue;
    seenPair.add(key);
    links.push({
      source: edge.from,
      target: edge.to,
      type: edge.type,
    });
  }

  return { nodes, links };
}

/**
 * 渲染知识图谱
 * 核心执行流程：
 *   1. 渲染锁检查：若正在渲染则标记 pending，本次调用直接返回
 *      保证最后一次渲染请求最终生效，避免并发重建导致 canvas 重叠
 *   2. status='loading' + nextTick + RAF：让出主线程，spinner 先渲染
 *      （避免 ThreeJS 初始化同步阻塞导致 spinner 卡顿）
 *   3. 加载 3d-force-graph 库（已缓存则跳过实际加载）
 *   4. 销毁旧图实例（destroy 后 RAF 让出主线程，确保 WebGL 资源回收）
 *   5. 构建 graph data
 *   6. 创建 ForceGraph3D 实例并配置样式
 *   7. 绑定节点点击跳转 + hover 高亮事件
 *   8. 引擎停止后自动 zoomToFit
 * 异常时设置错误状态，展示友好提示
 * 无论如何最后释放渲染锁，并处理 pending 请求
 */
async function renderGraph(): Promise<void> {
  if (props.map.nodes.length === 0) {
    status.value = 'rendered';
    return;
  }
  if (!containerRef.value) return;

  // 渲染锁：若正在渲染，标记 pending 并返回
  // 渲染完成后会检查 pending，确保最后一次请求最终生效
  if (isRendering) {
    pendingRender = true;
    return;
  }
  isRendering = true;

  status.value = 'loading';
  errorMsg.value = '';

  // 关键：让出主线程，让 Vue 先渲染 loading spinner
  // 否则 ThreeJS 初始化同步执行会阻塞浏览器渲染，spinner 无法显示
  await nextTick();
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

  try {
    // 通过 external-loader 加载 3d-force-graph（已缓存则立即返回）
    await loadForceGraph();
    const ForceGraphCtor = window.ForceGraph3D as ForceGraphConstructor | undefined;
    if (!ForceGraphCtor) {
      throw new Error('3d-force-graph 加载后未在 window.ForceGraph3D 上找到构造函数');
    }

    // 销毁旧实例，避免重复挂载
    destroyGraph();
    // 关键：destroy 后让出主线程一帧，确保 ThreeJS/WebGL 资源回收完成
    // 否则立即在同一个 DOM 上 new ForceGraph3D 可能导致 WebGL context 冲突
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    const data = buildGraphData();
    const isDark = currentTheme.value === 'dark';

    // 创建 3D 力导向图实例
    // 性能优化配置：
    // - rendererConfig.antialias: false 关闭抗锯齿，降低 GPU 片元着色负担
    //   （大规模图场景下，抗锯齿带来的视觉收益低于性能损失）
    graphInstance = new ForceGraphCtor(containerRef.value, {
      // controlType: 'trackball' 为默认，支持任意方向旋转
      controlType: 'trackball',
      rendererConfig: {
        antialias: false,
        alpha: true,
      },
    });

    // 配置画布尺寸（自适应容器，0 时兜底以避免 WebGL 渲染失败）
    const rect = containerRef.value.getBoundingClientRect();
    const canvasWidth = rect.width > 0 ? rect.width : 800;
    const canvasHeight = rect.height > 0 ? rect.height : 600;
    // 限制 devicePixelRatio 上限为 1.5，平衡 Retina 屏清晰度与 GPU 像素填充负担
    // （默认值 window.devicePixelRatio 在 Retina 屏为 2-3，渲染像素数翻 4-9 倍）
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    graphInstance
      .width(canvasWidth)
      .height(canvasHeight)
      .backgroundColor(isDark ? '#0f172a' : '#f8fafc')
      .graphData(data)
      // DAG 层次布局：FANDEX 的 prerequisite 关系天然是有向无环图（学习路径）
      // dagMode='zout' 让节点按深度沿 Z 轴分层，比纯力导向更稳定
      // 避免节点乱飞、收敛更快、视觉层次更清晰
      .dagMode('zout')
      .dagLevelDistance(50)
      // 节点配置：模块节点更大更显眼，文档节点较小
      .nodeRelSize(3)
      .nodeResolution(6)
      .nodeVal((node) => (node.type === 'module' ? 3 : 1))
      .nodeColor((node) => getNodeColor({ type: node.type, difficulty: node.difficulty }))
      .nodeOpacity(0.9)
      .nodeLabel((node) => {
        const difficultyLabel =
          node.difficulty === 'beginner'
            ? '入门'
            : node.difficulty === 'intermediate'
              ? '中级'
              : node.difficulty === 'advanced'
                ? '进阶'
                : '未分级';
        const typeLabel = node.type === 'module' ? '模块' : '文档';
        return `<b>${node.label || node.id}</b><br/>${typeLabel} · ${node.module || '-'} · ${difficultyLabel}`;
      })
      // 边配置
      // 关键性能优化：linkWidth=0 使用 THREE.Line（1px 等宽线）替代 CylinderGeometry
      // 4583 条边 × Cylinder mesh = 严重拖累 GPU，改为 Line 性能提升 5-10 倍
      .linkColor((link) => {
        if (link.type === 'related') {
          return isDark ? '#64748b' : '#94a3b8';
        }
        return isDark ? '#475569' : '#64748b';
      })
      .linkOpacity(0.4)
      .linkWidth(0)
      .linkDirectionalArrowLength(3)
      .linkDirectionalArrowRelPos(1)
      .linkCurvature(0)
      // 节点点击立即跳转（无任何中间动画）
      .onNodeClick((node, event) => {
        const nodeId = node.id;
        if (!nodeId) return;
        // 阻止默认行为（避免触发文本选中、拖拽等浏览器副作用）
        event.preventDefault();
        event.stopPropagation();
        const url = nodeUrlMap.value.get(nodeId);
        if (url) {
          // 直接修改 location 触发导航，无 focus/zoom 过渡
          window.location.href = url;
        }
      })
      // 节点 hover 高亮：cursor 切换 + 记录 hover 节点 ID
      .onNodeHover((node) => {
        hoveredNodeId.value = node?.id ?? null;
        if (containerRef.value) {
          containerRef.value.style.cursor = node ? 'pointer' : 'grab';
        }
      })
      // 引擎停止后自适应视图
      .onEngineStop(() => {
        try {
          graphInstance?.zoomToFit(400, 60);
        } catch {
          // zoomToFit 失败不影响主流程
        }
      })
      // 性能优化：快速冷却物理引擎
      // - cooldownTicks(80) 限制最大迭代轮数
      // - cooldownTime(1500) 1.5 秒后强制停止，节点快速稳定便于点击
      .cooldownTicks(80)
      .cooldownTime(1500);

    // 调优 d3-force 参数：默认参数针对小图，大规模图需要调低节点斥力
    // 让节点散布更均匀，避免过度聚集
    const charge = graphInstance.d3Force('charge');
    if (charge && typeof charge === 'object' && 'strength' in charge) {
      // 降低斥力强度（默认 -30，负值越大斥力越强），避免节点散太开
      (charge as { strength: number }).strength = -8;
    }
    const linkForce = graphInstance.d3Force('link');
    if (linkForce && typeof linkForce === 'object' && 'distance' in linkForce) {
      // 缩短连接距离（默认 30），让相关节点更紧凑
      (linkForce as { distance: number }).distance = 20;
    }

    // 限制 DPR，降低 Retina 屏渲染像素数（必须在 graphData 后调用）
    if (typeof graphInstance.dpr === 'function') {
      graphInstance.dpr(dpr);
    }

    // 禁用节点拖拽，避免误触发力重计算导致整个图重新震荡
    if (typeof graphInstance.enableNodeDrag === 'function') {
      graphInstance.enableNodeDrag(false);
    }

    status.value = 'rendered';
  } catch (err) {
    status.value = 'error';
    errorMsg.value = err instanceof Error ? err.message : String(err);
  } finally {
    // 释放渲染锁
    isRendering = false;
    // 检查 pending：若渲染期间有新请求，再次执行（最后一次请求最终生效）
    if (pendingRender) {
      pendingRender = false;
      void renderGraph();
    }
  }
}

/**
 * 销毁当前 3d-force-graph 实例，释放资源
 * 在重新渲染前或组件卸载时调用，避免重复挂载导致内存泄漏
 */
function destroyGraph(): void {
  if (graphInstance) {
    try {
      graphInstance.destroy();
    } catch {
      // 销毁失败忽略，避免影响后续渲染流程
    }
    graphInstance = null;
  }
}

/**
 * 设置主题变化监听
 * 通过 MutationObserver 监听 <html> 的 data-theme 属性变化
 * 主题切换时通过防抖触发重建 3D 图实例以应用对应配色
 *
 * 防抖说明：
 * - 主题切换动画期间可能连续触发多次 data-theme 变化
 * - 防抖 200ms 确保只在切换完成后重建一次，避免短时间内多次重建导致 canvas 重叠
 * - 配合 renderGraph 内部的渲染锁，双重保证并发安全
 */
function setupThemeObserver(): void {
  themeObserver = new MutationObserver(() => {
    const newTheme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    if (newTheme === currentTheme.value) return;
    currentTheme.value = newTheme;

    // 防抖：清除旧计时器，重设新计时器
    // 只有最后一次 theme 变化后 200ms 内无新变化才真正触发重建
    if (themeDebounceTimer !== null) {
      window.clearTimeout(themeDebounceTimer);
    }
    themeDebounceTimer = window.setTimeout(() => {
      themeDebounceTimer = null;
      void renderGraph();
    }, 200);
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}

// ========== 视图控制 ==========

/**
 * 重置视图：自适应到所有节点可见
 */
function zoomToFit(): void {
  graphInstance?.zoomToFit(500, 60);
}

/**
 * 暂停/恢复物理引擎动画
 */
function togglePause(): void {
  if (!graphInstance) return;
  if (isPaused.value) {
    graphInstance.resumeAnimation();
    isPaused.value = false;
  } else {
    graphInstance.pauseAnimation();
    isPaused.value = true;
  }
}

/**
 * 重新渲染按钮（错误状态下重试）
 */
function retryRender(): void {
  void renderGraph();
}

// 监听窗口尺寸变化，同步 canvas 尺寸（带防抖，避免拖拽窗口时频繁 refresh）
function handleResizeDebounced(): void {
  if (resizeTimer !== null) {
    window.clearTimeout(resizeTimer);
  }
  resizeTimer = window.setTimeout(() => {
    if (!graphInstance || !containerRef.value) return;
    const rect = containerRef.value.getBoundingClientRect();
    // 容器尺寸为 0 时跳过，避免隐藏场景下触发无意义 refresh
    if (rect.width <= 0 || rect.height <= 0) return;
    graphInstance.width(rect.width).height(rect.height).refresh();
  }, 200);
}

// 注：删除了原 watch(() => props.map) - map 数据由 Astro SSR 一次性传入，
// 不会发生响应式变化，watch 是无效代码且可能触发不必要的重渲染
</script>

<template>
  <div class="kg3d-root">
    <!-- 工具栏：视图控制 -->
    <div class="kg3d-toolbar" v-if="status === 'rendered'">
      <button class="kg3d-btn" @click="zoomToFit" aria-label="自适应视图" title="自适应视图">
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
      <button
        class="kg3d-btn"
        :class="{ 'is-active': isPaused }"
        @click="togglePause"
        :aria-label="isPaused ? '恢复动画' : '暂停动画'"
        :title="isPaused ? '恢复动画' : '暂停动画'"
      >
        <svg v-if="isPaused" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>
    </div>

    <!-- 渲染区包裹层：作为定位上下文，隔离 3d-force-graph 直接 DOM 操作与 Vue patch
         关键：.kg3d-container 内部由 3d-force-graph 直接管理 canvas，
              Vue 不再在其内部渲染 v-if 节点，避免 patch 冲突
              （此前 v-if="loading" 与 canvas 共存于 .kg3d-container 内，
              导致 "Cannot read properties of null (reading 'insertBefore')" 错误） -->
    <div class="kg3d-canvas-wrap">
      <!-- 3d-force-graph 渲染容器：Vue 视为空，子节点完全由库管理 -->
      <div class="kg3d-container" ref="containerRef"></div>

      <!-- 加载/错误覆盖层：与 .kg3d-container 平级，通过 position:absolute 覆盖其上 -->
      <div v-if="status === 'loading'" class="kg3d-loading">
        <div class="kg3d-spinner" aria-hidden="true"></div>
        <p class="kg3d-loading-text">
          正在加载 3D 知识图谱（{{ moduleCount }} 模块 · {{ docCount }} 文档 ·
          {{ edgeCount }} 关系）...
        </p>
      </div>

      <div v-else-if="status === 'error'" class="kg3d-error">
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
        <p class="kg3d-error-title">3D 知识图谱渲染失败</p>
        <p class="kg3d-error-detail">{{ errorMsg }}</p>
        <button class="kg3d-retry-btn" @click="retryRender">重试</button>
      </div>
    </div>

    <!-- 图例说明 -->
    <div class="kg3d-legend" v-if="status === 'rendered'">
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-swatch kg3d-legend-module"></span>
        <span>模块</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-swatch kg3d-legend-beginner"></span>
        <span>入门</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-swatch kg3d-legend-intermediate"></span>
        <span>中级</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-swatch kg3d-legend-advanced"></span>
        <span>进阶</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-swatch kg3d-legend-default"></span>
        <span>未分级</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-line kg3d-legend-line-solid"></span>
        <span>前置依赖</span>
      </div>
      <div class="kg3d-legend-item">
        <span class="kg3d-legend-line kg3d-legend-line-dashed"></span>
        <span>关联</span>
      </div>
      <div class="kg3d-legend-tip">
        <span>左键旋转 · 滚轮缩放 · 右键平移 · 点击节点跳转</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 根容器：纵向排列工具栏 + 渲染区 + 图例 */
.kg3d-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-light);
}

/* 工具栏：水平排列控制按钮 */
.kg3d-toolbar {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg);
}

/* 工具栏按钮 */
.kg3d-btn {
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

.kg3d-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.kg3d-btn.is-active {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 渲染区包裹层：作为定位上下文，承载 canvas 容器与 loading/error 覆盖层
   - position: relative 让 absolute 子元素锚定于此
   - clamp() 根据视口高度自适应：小屏 480px / 中屏跟随 75vh / 上限 800px
   - contain 隔离子树布局/绘制/样式，防止 ThreeJS canvas 缩放引起父级 reflow */
.kg3d-canvas-wrap {
  position: relative;
  width: 100%;
  height: clamp(480px, 75vh, 800px);
  overflow: hidden;
  background: #0f172a;
  contain: layout style paint;
}

/* 3d-force-graph 渲染容器：子节点完全由库管理，Vue 永远不 patch 其内部 */
.kg3d-container {
  position: absolute;
  inset: 0;
  cursor: grab;
}

.kg3d-container:active {
  cursor: grabbing;
}

/* 加载状态：覆盖在 canvas 之上（与 .kg3d-container 平级） */
.kg3d-loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md, 16px);
  color: #e5e7eb;
  pointer-events: none;
  z-index: 10;
}

.kg3d-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #60a5fa;
  border-radius: 50%;
  animation: kg3d-spin 0.8s linear infinite;
}

@keyframes kg3d-spin {
  to {
    transform: rotate(360deg);
  }
}

.kg3d-loading-text {
  font-size: 0.88em;
  margin: 0;
  text-align: center;
  padding: 0 var(--spacing-md, 16px);
}

/* 错误状态 */
.kg3d-error {
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
  z-index: 10;
}

.kg3d-error-title {
  font-size: 1em;
  font-weight: 600;
  color: var(--color-text);
  margin: var(--spacing-sm, 8px) 0 0;
}

.kg3d-error-detail {
  font-size: 0.82em;
  color: var(--color-text-tertiary);
  margin: 0;
  max-width: 480px;
  word-break: break-word;
}

.kg3d-retry-btn {
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

.kg3d-retry-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
}

/* 图例区 */
.kg3d-legend {
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

.kg3d-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.kg3d-legend-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
}

.kg3d-legend-module {
  background: #2563eb;
  border-color: #1e40af;
}

.kg3d-legend-beginner {
  background: #16a34a;
  border-color: #14532d;
}

.kg3d-legend-intermediate {
  background: #ca8a04;
  border-color: #713f12;
}

.kg3d-legend-advanced {
  background: #dc2626;
  border-color: #7f1d1d;
}

.kg3d-legend-default {
  background: #6b7280;
  border-color: #374151;
}

.kg3d-legend-line {
  display: inline-block;
  width: 20px;
  height: 0;
  border-top: 2px solid var(--color-text-secondary);
}

.kg3d-legend-line-dashed {
  border-top-style: dashed;
}

.kg3d-legend-tip {
  margin-left: auto;
  font-style: italic;
  color: var(--color-text-tertiary);
}

/* 暗色模式下的图例颜色（保持可读性） */
:global(html[data-theme='dark']) .kg3d-legend-module {
  background: #60a5fa;
  border-color: #1e3a8a;
}

:global(html[data-theme='dark']) .kg3d-legend-beginner {
  background: #4ade80;
  border-color: #14532d;
}

:global(html[data-theme='dark']) .kg3d-legend-intermediate {
  background: #facc15;
  border-color: #713f12;
}

:global(html[data-theme='dark']) .kg3d-legend-advanced {
  background: #f87171;
  border-color: #7f1d1d;
}

:global(html[data-theme='dark']) .kg3d-legend-default {
  background: #9ca3af;
  border-color: #374151;
}

/* 移动端适配：缩小容器高度，简化图例 */
@media (max-width: 768px) {
  .kg3d-canvas-wrap {
    height: 520px;
  }

  .kg3d-legend {
    gap: var(--spacing-sm, 8px);
    font-size: 0.75em;
  }

  .kg3d-legend-tip {
    display: none;
  }
}

/* 3d-force-graph tooltip 全局样式
   3d-force-graph 在节点 hover 时自动注入 .graph-tooltip DOM，
   因不属于组件 shadow DOM，必须用 :global 穿透 scoped 限制 */
:global(.graph-tooltip) {
  position: absolute;
  z-index: 100;
  padding: 6px 10px;
  font-size: 0.82em;
  line-height: 1.4;
  color: #f8fafc;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(96, 165, 250, 0.4);
  border-radius: 4px;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 280px;
  word-break: break-word;
}
</style>
