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
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';

export interface MapCanvasHandle {
  zoomBy: (factor: number) => void;
  fit: () => void;
  reset: () => void;
  focusNode: (id: string) => void;
}

interface Props {
  tech: TechVM;
  base: string;
  layout: MapLayout;
  collapsedStageIds: ReadonlySet<string>;
  selectedId: string | null;
  hoverId: string | null;
  nodeProgress: TechProgress;
  onSelectNode: (id: string) => void;
  onHoverNode: (id: string | null) => void;
  onToggleStage: (id: string) => void;
  onScaleChange?: (percent: number) => void;
  onClearSelection?: () => void;
}

const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const DRAG_THRESHOLD = 4;
const COMFORT_SCALE = 0.75;

function viewportSize(container: HTMLElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return { width: Math.max(rect.width, 120), height: Math.max(rect.height, 120) };
}

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
  const containerRef = useRef<HTMLDivElement>(null);
  const lang = useLang();
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, tx: 0, ty: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const scaleRafRef = useRef(0);

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

  useEffect(
    () => () => {
      if (scaleRafRef.current) {
        cancelAnimationFrame(scaleRafRef.current);
        scaleRafRef.current = 0;
      }
    },
    [],
  );

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number): boolean => {
      const t = transformRef.current;
      const nextK = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.k * factor));
      if (nextK === t.k) return false;
      t.x = cx - ((cx - t.x) * nextK) / t.k;
      t.y = cy - ((cy - t.y) * nextK) / t.k;
      t.k = nextK;
      applyTransform();
      return true;
    },
    [applyTransform],
  );

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
      t.k = kFit;
      t.x = (vw - layout.width * kFit) / 2;
      t.y = (vh - layout.height * kFit) / 2;
      applyTransform();
      return;
    }
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

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(fitStart);
    return () => cancelAnimationFrame(raf);
  }, [fitStart]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(container);
    return () => observer.disconnect();
  }, [fit]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      // Firefox 鼠标滚轮上报 deltaMode=line（deltaY 约为 ±3），需归一化为像素再换算缩放
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16;
      else if (event.deltaMode === 2) delta *= 100;
      const rect = svg.getBoundingClientRect();
      const changed = zoomAt(
        event.clientX - rect.left,
        event.clientY - rect.top,
        Math.exp(-delta * 0.0012),
      );
      // 缩放已达边界时不再吞掉滚动，让页面可以继续滚动
      if (changed) event.preventDefault();
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const toLocalPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) };
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    // 每次按压先清掉上一手势的 moved 残留：pointercancel / 双指升级结束时不会触发
    // click 来重置它，若不清会把下一次对节点的点击误判为拖拽结束而吞掉
    dragRef.current.active = false;
    dragRef.current.moved = false;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2) {
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
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onPointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    dragRef.current.active = false;
  };

  const onClickCapture = (event: React.MouseEvent<SVGSVGElement>) => {
    if (dragRef.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current.moved = false;
    }
  };

  useEffect(() => {
    const mapRoot = containerRef.current?.closest('.lp-map');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (/^(INPUT|TEXTAREA|SELECT)$/i.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const t = transformRef.current;
      const isArrow = event.key.startsWith('Arrow');
      if (isArrow && (!mapRoot || !mapRoot.contains(target))) return;

      const container = containerRef.current;
      switch (event.key) {
        case '+':
        case '=': {
          if (!container) return;
          const { width: vw, height: vh } = viewportSize(container);
          zoomAt(vw / 2, vh / 2, 1.25);
          break;
        }
        case '-': {
          if (!container) return;
          const { width: vw, height: vh } = viewportSize(container);
          zoomAt(vw / 2, vh / 2, 1 / 1.25);
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

  return (
    <div
      className="lp-canvas"
      ref={containerRef}
      tabIndex={0}
      role="application"
      aria-label={t('lpMap.canvasAria', { title: tech.title }, lang)}
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
                {t('lpMap.rootNodes', { n: tech.stats.nodes }, lang)}
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
