/**
 * 学习路径思维导图主岛
 * -----------------------------------------------------------------------------
 * 组合层：持有选中/悬停/折叠/学习进度状态，组装画布、控制条与详情面板。
 * 数据来源：由 Astro 页面注入的 TechVM（服务端组装，客户端不加载地图 JSON）。
 * 学习进度：localStorage 持久化（progress.ts），节点三态呈现 + Duolingo 式进度环。
 */
import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { NodeProgress, TechProgress, TechVM } from './types';
import { computeMapLayout } from './map-layout';
import { readTechProgress, writeNodeProgress } from './progress';
import MapCanvas, { type MapCanvasHandle } from './MapCanvas';
import MapControls from './MapControls';
import MapDetailPanel from './MapDetailPanel';

interface Props {
  /** 技术视图模型 */
  tech: TechVM;
  /** 站点基础路径 */
  base: string;
}

/** 进度环半径与周长（SVG stroke-dasharray 用） */
const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/** 学习路径思维导图 */
export default function LearningPathMap({ tech, base }: Props) {
  /** 选中节点 ID（点击待补充节点触发） */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 悬停节点 ID（优先于选中态展示） */
  const [hoverId, setHoverId] = useState<string | null>(null);
  /** 折叠的阶段 ID 集合 */
  const [collapsedStageIds, setCollapsedStageIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  /** 缩放百分比 */
  const [scale, setScale] = useState(100);
  /** 画布命令式接口 */
  const canvasRef = useRef<MapCanvasHandle>(null);
  /** 学习进度表：节点 ID -> learning/done（首帧从 localStorage 恢复） */
  const [progress, setProgress] = useState<TechProgress>(() => readTechProgress(tech.module));

  /** 布局：阶段/节点/连线坐标（折叠变化时增量重算） */
  const layout = useMemo(
    () => computeMapLayout(tech.stages, collapsedStageIds),
    [tech.stages, collapsedStageIds],
  );

  /** 进度统计：已完成 / 学习中数量（用于进度环与读数） */
  const { doneCount, learningCount } = useMemo(() => {
    let done = 0;
    let learning = 0;
    for (const stage of tech.stages) {
      for (const node of stage.nodes) {
        if (progress[node.id] === 'done') done += 1;
        else if (progress[node.id] === 'learning') learning += 1;
      }
    }
    return { doneCount: done, learningCount: learning };
  }, [progress, tech.stages]);

  /** 面板展示节点：优先悬停，其次选中 */
  const panelNode = useMemo(() => {
    const id = hoverId ?? selectedId;
    if (!id) return null;
    for (const stage of tech.stages) {
      const node = stage.nodes.find((n) => n.id === id);
      if (node) return node;
    }
    return null;
  }, [hoverId, selectedId, tech.stages]);

  /** 选中节点 */
  const handleSelectNode = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  /** 悬停节点 */
  const handleHoverNode = useCallback((id: string | null) => {
    setHoverId(id);
  }, []);

  /** 清空选中与悬停（Esc 快捷键） */
  const handleClearSelection = useCallback(() => {
    setSelectedId(null);
    setHoverId(null);
  }, []);

  /** 折叠/展开阶段 */
  const handleToggleStage = useCallback((id: string) => {
    setCollapsedStageIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /** 在地图中定位当前节点 */
  const handleLocate = useCallback(() => {
    const id = hoverId ?? selectedId;
    if (id) canvasRef.current?.focusNode(id);
  }, [hoverId, selectedId]);

  /** 设置节点进度（null = 清除标记），同步持久化到 localStorage */
  const handleSetProgress = useCallback(
    (nodeId: string, state: NodeProgress | null) => {
      setProgress(writeNodeProgress(tech.module, nodeId, state));
    },
    [tech.module],
  );

  /** 进度环填充比例（已完成 / 总节点数） */
  const totalNodes = tech.stats.nodes;
  const ringRatio = totalNodes > 0 ? doneCount / totalNodes : 0;

  return (
    <div className="lp-map" style={{ '--lp-color': tech.color } as CSSProperties}>
      {/* 顶部控制条：左侧学习进度环 + 右侧缩放控制 */}
      <div className="lp-map__toolbar">
        {/* Duolingo 式进度环：已完成占比 + mono 读数（已完成/学习中/总数） */}
        <div
          className="lp-progress"
          role="status"
          aria-label={`学习进度：已完成 ${doneCount} / 共 ${totalNodes} 个知识点，学习中 ${learningCount} 个`}
        >
          <svg className="lp-progress__ring" viewBox="0 0 36 36" aria-hidden="true">
            <circle className="lp-progress__track" cx="18" cy="18" r={RING_RADIUS} />
            <circle
              className="lp-progress__fill"
              cx="18"
              cy="18"
              r={RING_RADIUS}
              strokeDasharray={`${(ringRatio * RING_CIRCUMFERENCE).toFixed(2)} ${RING_CIRCUMFERENCE.toFixed(2)}`}
              transform="rotate(-90 18 18)"
            />
          </svg>
          <div className="lp-progress__readout">
            <span className="lp-progress__num">{doneCount}/{totalNodes}</span>
            <span className="lp-progress__label">已完成</span>
          </div>
          {learningCount > 0 && (
            <span className="lp-progress__learning">学习中 {learningCount}</span>
          )}
        </div>
        <MapControls
          scale={scale}
          onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.25)}
          onZoomIn={() => canvasRef.current?.zoomBy(1.25)}
          onFit={() => canvasRef.current?.fit()}
          onReset={() => canvasRef.current?.reset()}
        />
      </div>

      {/* 键盘快捷键提示条 */}
      <div className="lp-map__shortcuts" aria-label="键盘快捷键">
        <span className="lp-map__shortcut"><kbd>+</kbd>/<kbd>-</kbd> 缩放</span>
        <span className="lp-map__shortcut"><kbd>0</kbd>/<kbd>F</kbd> 适应视口</span>
        <span className="lp-map__shortcut"><kbd>R</kbd> 复位</span>
        <span className="lp-map__shortcut"><kbd>方向键</kbd> 平移</span>
        <span className="lp-map__shortcut"><kbd>Esc</kbd> 关闭详情</span>
      </div>

      {/* 画布 + 详情面板 */}
      <div className="lp-map__body">
        <MapCanvas
          ref={canvasRef}
          tech={tech}
          base={base}
          layout={layout}
          collapsedStageIds={collapsedStageIds}
          selectedId={selectedId}
          hoverId={hoverId}
          nodeProgress={progress}
          onSelectNode={handleSelectNode}
          onHoverNode={handleHoverNode}
          onToggleStage={handleToggleStage}
          onScaleChange={setScale}
          onClearSelection={handleClearSelection}
        />
        <MapDetailPanel
          node={panelNode}
          techTitle={tech.title}
          color={tech.color}
          progress={panelNode ? (progress[panelNode.id] ?? null) : null}
          onSetProgress={handleSetProgress}
          onClose={() => {
            setSelectedId(null);
            setHoverId(null);
          }}
          onFocus={handleLocate}
        />
      </div>

      {/* 图例 */}
      <div className="lp-map__legend" aria-label="图例">
        <span className="lp-legend-item">
          <i className="lp-legend-line" />
          已发布文档
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-line lp-legend-line--planned" />
          文档待补充
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-state lp-legend-state--learning" />
          学习中
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-state lp-legend-state--done" />
          已完成
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--beginner" />
          入门
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--intermediate" />
          中级
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--advanced" />
          进阶
        </span>
      </div>
    </div>
  );
}
