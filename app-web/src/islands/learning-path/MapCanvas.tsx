/**
 * 思维导图 SVG 画布
 * -----------------------------------------------------------------------------
 * 职责：
 * - 渲染根节点、阶段列、连线与知识点节点（全部自绘 SVG，无第三方图形库）
 * - 提供平移（拖拽）、缩放（滚轮/按钮/键盘）、适应视口与节点定位能力
 *
 * 性能设计：
 * - 变换矩阵存放在 ref 中，直接修改 DOM transform 属性，避免拖动/滚轮时触发 React 重渲染
 * - 缩放读数通过 rAF 节流回传，面板状态更新频率受限
 * - 布局由父组件 useMemo 计算，画布内不做重复计算
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from 'react';
import type { TechProgress, TechVM } from './types';
import {
  LAYOUT,
  getNodeCenters,
  type LayoutEdge,
  type MapLayout,
} from './map-layout';
import MapEdge from './MapEdge';
import MapNode from './MapNode';
import MapStage from './MapStage';

/** 画布对外能力（供主岛调用） */
export interface MapCanvasHandle {
  /** 以画布中心为锚点缩放 */
  zoomBy: (factor: number) => void;
  /** 适应视口 */
  fit: () => void;
  /** 复位到 100% */
  reset: () => void;
  /** 将指定节点居中 */
  focusNode: (id: string) => void;
}

interface Props {
  /** 技术视图模型 */
  tech: TechVM;
  /** 站点基础路径 */
  base: string;
  /** 布局结果 */
  layout: MapLayout;
  /** 折叠的阶段 ID 集合 */
  collapsedStageIds: ReadonlySet<string>;
  /** 选中节点 ID */
  selectedId: string | null;
  /** 悬停节点 ID */
  hoverId: string | null;
  /** 节点学习进度表（节点 ID -> learning/done） */
  nodeProgress: TechProgress;
  /** 选中节点 */
  onSelectNode: (id: string) => void;
  /** 悬停/移出节点 */
  onHoverNode: (id: string | null) => void;
  /** 折叠/展开阶段 */
  onToggleStage: (id: string) => void;
  /** 缩放百分比回传（rAF 节流） */
  onScaleChange?: (percent: number) => void;
  /** 关闭详情面板（Esc 快捷键） */
  onClearSelection?: () => void;
}

/** 缩放范围 */
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
/** 拖拽与点击的位移阈值（超过则视为拖拽） */
const DRAG_THRESHOLD = 4;
/** 舒适阅读缩放下限：首屏视图低于该值时节点文字不可读，改用聚焦首阶段的初始视图 */
const COMFORT_SCALE = 0.75;

/**
 * 计算视口可用尺寸（容器减去留白）
 */
function viewportSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return { width: Math.max(rect.width, 120), height: Math.max(rect.height, 120) };
}

/**
 * SVG 画布组件
 * 通过 forwardRef 暴露缩放/定位命令式接口
 */
const MapCanvas = forwardRef<MapCanvasHandle, Props>(function MapCanvas(
  {
    tech,
    base,
    layout,
    collapsedStageIds,
    selectedId,
    hoverId,
    nodeProgress,
    onSelectNode,
    onHoverNode,
    onToggleStage,
    onScaleChange,
    onClearSelection,
  },
  ref,
) {
  /** 容器（决定视口尺寸） */
  const containerRef = useRef<HTMLDivElement>(null);
  /** SVG 元素 */
  const svgRef = useRef<SVGSVGElement>(null);
  /** 内容组（transform 直接作用于此） */
  const contentRef = useRef<SVGGElement>(null);
  /** 当前变换：x/y 平移、k 缩放 */
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  /** 拖拽状态 */
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, tx: 0, ty: 0 });
  /** 活动触点表（触屏双指捏合缩放用）：pointerId -> 客户端坐标 */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  /** 捏合手势状态：初始双指间距与中点（SVG 本地坐标） */
  const pinchRef = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  /** 缩放读数 rAF 节流标志 */
  const scaleRafRef = useRef(0);

  /** 应用当前变换到内容组（直接改 DOM，不触发 React 重渲染） */
  const applyTransform = useCallback(() => {
    const { x, y, k } = transformRef.current;
    contentRef.current?.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    if (onScaleChange && scaleRafRef.current === 0) {
      scaleRafRef.current = requestAnimationFrame(() => {
        scaleRafRef.current = 0;
        onScaleChange(k * 100);
      });
    }
  }, [onScaleChange]);

  /** 缩放（围绕锚点） */
  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const t = transformRef.current;
      const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.k * factor));
      if (nextK === t.k) return;
      // 保持锚点（cx, cy）在缩放前后指向相同的内容坐标
      t.x = cx - ((cx - t.x) * nextK) / t.k;
      t.y = cy - ((cy - t.y) * nextK) / t.k;
      t.k = nextK;
      applyTransform();
    },
    [applyTransform],
  );

  /** 适应视口：整图缩放并居中 */
  const fit = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width: vw, height: vh } = viewportSize(container);
    const pad = 24;
    const k = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((vw - pad * 2) / layout.width, (vh - pad * 2) / layout.height)),
    );
    const t = transformRef.current;
    t.k = k;
    t.x = (vw - layout.width * k) / 2;
    t.y = (vh - layout.height * k) / 2;
    applyTransform();
  }, [applyTransform, layout]);

  /**
   * 首屏默认视图：可读优先
   * 整图适配缩放 >= COMFORT_SCALE 时直接整图居中；
   * 否则不再整体缩小到不可读，而是以舒适缩放聚焦"根节点 + 首阶段"，
   * 用户可通过滚轮/按钮/适应视口查看其余阶段
   */
  const fitStart = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width: vw, height: vh } = viewportSize(container);
    const pad = 24;
    const kFit = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, Math.min((vw - pad * 2) / layout.width, (vh - pad * 2) / layout.height)),
    );
    const t = transformRef.current;
    if (kFit >= COMFORT_SCALE) {
      // 整图可读：整图居中
      t.k = kFit;
      t.x = (vw - layout.width * kFit) / 2;
      t.y = (vh - layout.height * kFit) / 2;
      applyTransform();
      return;
    }
    // 整图过小时以舒适缩放聚焦首阶段（垂直居中该列，水平从画布起点开始）
    const firstStage = layout.stages[0];
    const k = Math.min(0.85, Math.max(COMFORT_SCALE, Math.min(0.85, (vh - pad * 2) / layout.height)));
    t.k = k;
    t.x = pad;
    const focusY = firstStage
      ? firstStage.y + firstStage.height / 2
      : layout.height / 2;
    t.y = Math.min(
      pad,
      Math.max(vh - layout.height * k - pad, vh / 2 - focusY * k),
    );
    applyTransform();
  }, [applyTransform, layout]);

  /** 复位：100% 并居中 */
  const reset = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { width: vw, height: vh } = viewportSize(container);
    const t = transformRef.current;
    t.k = 1;
    t.x = (vw - layout.width) / 2;
    t.y = (vh - layout.height) / 2;
    applyTransform();
  }, [applyTransform, layout]);

  /** 将指定节点居中（保持当前缩放，至少放大到 100%） */
  const focusNode = useCallback(
    (id: string) => {
      const container = containerRef.current;
      const center = getNodeCenters(layout).get(id);
      if (!container || !center) return;
      const { width: vw, height: vh } = viewportSize(container);
      const t = transformRef.current;
      if (t.k < 1) t.k = 1;
      t.x = vw / 2 - center.x * t.k;
      t.y = vh / 2 - center.y * t.k;
      applyTransform();
    },
    [applyTransform, layout],
  );

  /** 对外暴露命令式接口 */
  useImperativeHandle(ref, () => ({
    zoomBy: (factor: number) => {
      const container = containerRef.current;
      if (!container) return;
      const { width: vw, height: vh } = viewportSize(container);
      zoomAt(vw / 2, vh / 2, factor);
    },
    fit,
    reset,
    focusNode,
  }));

  /** 首次渲染与布局变化后使用"可读优先"初始视图 */
  useLayoutEffect(() => {
    const raf = requestAnimationFrame(fitStart);
    return () => cancelAnimationFrame(raf);
  }, [fitStart]);

  /** 容器尺寸变化时重新适应 */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fit]);

  /** 滚轮缩放：原生监听以支持 preventDefault（React 的 wheel 为 passive） */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomAt(event.clientX - rect.left, event.clientY - rect.top, Math.exp(-event.deltaY * 0.0012));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /** 将客户端坐标换算为 SVG 本地坐标 */
  const toLocalPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  /** 拖拽平移 + 双指捏合缩放 */
  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // 触点登记：无论落点在空白处还是节点上，双指手势都需要完整跟踪
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // 第二根手指落下：进入捏合模式，取消单指平移
    if (pointersRef.current.size === 2) {
      dragRef.current.active = false;
      const [firstPoint, secondPoint] = [...pointersRef.current.values()];
      if (!firstPoint || !secondPoint) return;
      pinchRef.current = {
        dist: Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y),
        mid: toLocalPoint((firstPoint.x + secondPoint.x) / 2, (firstPoint.y + secondPoint.y) / 2),
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    // 仅在点击画布空白处时启动平移；
    // 若从节点按下，指针捕获会把后续 click 重定向到画布，导致节点链接无法打开
    if (event.target !== event.currentTarget) return;
    const t = transformRef.current;
    dragRef.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
      tx: t.x,
      ty: t.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    // 捏合模式：以双指间距比例缩放（锚点为中点），中点位移作为平移
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }
    const pinch = pinchRef.current;
    if (pinch && pointersRef.current.size >= 2) {
      const [firstPoint, secondPoint] = [...pointersRef.current.values()];
      if (!firstPoint || !secondPoint) return;
      const dist = Math.hypot(firstPoint.x - secondPoint.x, firstPoint.y - secondPoint.y);
      const mid = toLocalPoint((firstPoint.x + secondPoint.x) / 2, (firstPoint.y + secondPoint.y) / 2);
      if (pinch.dist > 0 && dist > 0) {
        // 先按中点位移平移，再围绕新中点缩放
        const t = transformRef.current;
        t.x += mid.x - pinch.mid.x;
        t.y += mid.y - pinch.mid.y;
        applyTransform();
        zoomAt(mid.x, mid.y, dist / pinch.dist);
      }
      pinchRef.current = { dist, mid };
      return;
    }

    const drag = dragRef.current;
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) drag.moved = true;
    if (drag.moved) {
      const t = transformRef.current;
      t.x = drag.tx + dx;
      t.y = drag.ty + dy;
      applyTransform();
    }
  };

  const onPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    // 手指少于两根时退出捏合模式
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  /** 触点中断（来电/系统手势）：与抬指同等清理，避免捏合状态残留 */
  const onPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current.active = false;
  };

  /** 拖拽结束后抑制一次点击（防止拖拽触发链接跳转） */
  const onClickCapture = (event: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  /** 页面级键盘快捷键：+/- 缩放、0/F 适应视口、R 复位、方向键平移、Esc 关闭详情 */
  useEffect(() => {
    const mapRoot = containerRef.current?.closest('.lp-map');
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // 输入类元素与修饰键组合不接管，避免与浏览器/无障碍快捷键冲突
      if (target && /^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const t = transformRef.current;
      const isArrow = event.key.startsWith('Arrow');
      // 方向键仅在焦点位于地图区域内时接管，避免破坏页面滚动
      if (isArrow && (!mapRoot || !mapRoot.contains(target))) return;

      const container = containerRef.current;
      switch (event.key) {
        case '+':
        case '=': {
          if (!container) return;
          const { width: vw, height: vh } = viewportSize(container);
          zoomAt(vw / 2, vh / 2, 1.2);
          break;
        }
        case '-': {
          if (!container) return;
          const { width: vw, height: vh } = viewportSize(container);
          zoomAt(vw / 2, vh / 2, 1 / 1.2);
          break;
        }
        case '0':
        case 'f':
        case 'F':
          fit();
          break;
        case 'r':
        case 'R':
          reset();
          break;
        case 'Escape':
          onClearSelection?.();
          break;
        case 'ArrowLeft':
          t.x += 48;
          applyTransform();
          break;
        case 'ArrowRight':
          t.x -= 48;
          applyTransform();
          break;
        case 'ArrowUp':
          t.y += 48;
          applyTransform();
          break;
        case 'ArrowDown':
          t.y -= 48;
          applyTransform();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [zoomAt, fit, reset, applyTransform, onClearSelection]);

  /** 进入页面即聚焦画布，方向键/缩放快捷键立即可用（编程式聚焦不触发 :focus-visible） */
  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      className="lp-canvas"
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label={`${tech.title} 学习路线思维导图，支持拖拽平移、滚轮缩放；快捷键：+/- 缩放、0/F 适应视口、R 复位、方向键平移、Esc 关闭详情`}
    >
      <svg
        className="lp-canvas__svg"
        ref={svgRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClickCapture={onClickCapture}
      >
        <defs>
          {/* 根节点到阶段连线的箭头标记（按阶段独立着色） */}
          {layout.stages.map((stage) => (
            <marker
              key={stage.id}
              id={`lp-arrow-${stage.id}`}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={tech.color} />
            </marker>
          ))}
        </defs>
        <g ref={contentRef}>
          {/* 根节点：技术入口，点击进入模块文档列表 */}
          <g transform={`translate(${layout.root.x} ${layout.root.y})`}>
            <a href={`${base}${tech.module}/`} className="lp-root">
              <rect
                className="lp-root__rect"
                width={layout.root.width}
                height={layout.root.height}
                rx={2}
              />
              <text className="lp-root__icon" x={12} y={22}>
                {tech.icon}
              </text>
              <text className="lp-root__title" x={12} y={42}>
                {tech.title}
              </text>
              <text className="lp-root__count" x={layout.root.width - 12} y={20} textAnchor="end">
                {tech.stats.nodes} 知识点
              </text>
            </a>
          </g>

          {/* 连线层 */}
          {layout.edges.map((edge: LayoutEdge, index: number) => (
            <MapEdge key={`${edge.stageId}-${index}`} edge={edge} color={tech.color} />
          ))}

          {/* 阶段层：标题 + 节点链 */}
          {layout.stages.map((placedStage, stageIndex) => {
            const stage = tech.stages[stageIndex];
            if (!stage) return null;
            return (
              <MapStage
                key={stage.id}
                stage={stage}
                index={stageIndex + 1}
                x={placedStage.x}
                y={placedStage.y}
                color={tech.color}
                collapsed={collapsedStageIds.has(stage.id)}
                onToggle={onToggleStage}
              >
                {placedStage.nodes.map((placedNode, nodeIndex) => {
                  const node = stage.nodes.find((n) => n.id === placedNode.id);
                  if (!node) return null;
                  return (
                    <MapNode
                      key={node.id}
                      node={node}
                      x={placedNode.x - placedStage.x}
                      y={placedNode.y - placedStage.y}
                      index={nodeIndex + 1}
                      width={LAYOUT.nodeWidth}
                      height={LAYOUT.nodeHeight}
                      selected={selectedId === node.id}
                      hovered={hoverId === node.id}
                      progress={nodeProgress[node.id] ?? null}
                      onSelect={onSelectNode}
                      onHover={onHoverNode}
                    />
                  );
                })}
              </MapStage>
            );
          })}
        </g>
      </svg>
    </div>
  );
});

export default MapCanvas;
