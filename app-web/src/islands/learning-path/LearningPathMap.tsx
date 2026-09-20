/**
 * 学习路径思维导图主岛
 * -----------------------------------------------------------------------------
 * 组合层：持有选中/悬停/折叠/学习进度状态，组装画布、控制条与详情面板。
 * 数据来源：由 Astro 页面注入的 TechVM（服务端组装，客户端不加载地图 JSON）。
 * 学习进度：localStorage 持久化（progress.ts），节点三态呈现 + Duolingo 式进度环。
 * 界面文案经 lib/i18n 的 t() 取当前语言（UI 双语）。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import type { NodeProgress, TechProgress, TechVM } from './types';
import { computeMapLayout } from './map-layout';
import { clearTechProgress, readTechProgress, writeNodeProgress } from './progress';
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
  /** 界面语言（全岛文案双语，订阅全局切换） */
  const lang = useLang();
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

  /** 重置当前技术的全部学习进度（带确认） */
  const handleResetProgress = useCallback(() => {
    if (doneCount + learningCount === 0) return;
    if (!window.confirm(t('lpMap.clearConfirm', { title: tech.title }, lang))) return;
    setProgress(clearTechProgress(tech.module));
  }, [doneCount, learningCount, tech.module, tech.title, lang]);

  // 键盘进度快捷键（roadmap.sh 模式）：D 已完成 / L 学习中 / S 清除标记。
  // 仅在详情面板有节点时生效；输入类元素聚焦与修饰键组合不接管
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'd' && key !== 'l' && key !== 's') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const id = hoverId ?? selectedId;
      if (!id) return;
      event.preventDefault();
      handleSetProgress(id, key === 'd' ? 'done' : key === 'l' ? 'learning' : null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSetProgress, hoverId, selectedId]);

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
          aria-label={t('lpMap.progressAria', { done: doneCount, total: totalNodes, learning: learningCount }, lang)}
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
            <span className="lp-progress__label">{t('lpMap.done', undefined, lang)}</span>
          </div>
          {learningCount > 0 && (
            <span className="lp-progress__learning">{t('lpMap.learning', { n: learningCount }, lang)}</span>
          )}
        </div>
        <MapControls
          scale={scale}
          onZoomOut={() => canvasRef.current?.zoomBy(1 / 1.25)}
          onZoomIn={() => canvasRef.current?.zoomBy(1.25)}
          onFit={() => canvasRef.current?.fit()}
          onReset={() => canvasRef.current?.reset()}
          onResetProgress={handleResetProgress}
          hasProgress={doneCount + learningCount > 0}
        />
      </div>

      {/* 键盘快捷键提示条 */}
      <div className="lp-map__shortcuts" aria-label={t('lpMap.shortcutsAria', undefined, lang)}>
        <span className="lp-map__shortcut"><kbd>+</kbd>/<kbd>-</kbd> {t('lpMap.scZoom', undefined, lang)}</span>
        <span className="lp-map__shortcut"><kbd>0</kbd>/<kbd>F</kbd> {t('lpMap.scFit', undefined, lang)}</span>
        <span className="lp-map__shortcut"><kbd>R</kbd> {t('lpMap.scReset', undefined, lang)}</span>
        <span className="lp-map__shortcut"><kbd>{t('lpMap.scPanKey', undefined, lang)}</kbd> {t('lpMap.scPan', undefined, lang)}</span>
        <span className="lp-map__shortcut"><kbd>D</kbd>/<kbd>L</kbd>/<kbd>S</kbd> {t('lpMap.scMark', undefined, lang)}</span>
        <span className="lp-map__shortcut"><kbd>Esc</kbd> {t('lpMap.scClose', undefined, lang)}</span>
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
      <div className="lp-map__legend" aria-label={t('lpMap.legendAria', undefined, lang)}>
        <span className="lp-legend-item">
          <i className="lp-legend-line" />
          {t('lpMap.legendDoc', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-line lp-legend-line--planned" />
          {t('lpMap.legendGap', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-state lp-legend-state--learning" />
          {t('lpMap.legendLearning', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-state lp-legend-state--done" />
          {t('lpMap.legendDone', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--beginner" />
          {t('lpMap.legendBeginner', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--intermediate" />
          {t('lpMap.legendIntermediate', undefined, lang)}
        </span>
        <span className="lp-legend-item">
          <i className="lp-legend-bar lp-legend-bar--advanced" />
          {t('lpMap.legendAdvanced', undefined, lang)}
        </span>
      </div>
    </div>
  );
}
