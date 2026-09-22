import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import type { NodeProgress, TechProgress, TechVM } from './types';
import { computeMapLayout } from './map-layout';
import {
  PROGRESS_STORAGE_KEY,
  clearTechProgress,
  readTechProgress,
  writeNodeProgress,
} from './progress';
import MapCanvas, { type MapCanvasHandle } from './MapCanvas';
import MapControls from './MapControls';
import MapDetailPanel from './MapDetailPanel';

interface Props {
  tech: TechVM;
  base: string;
}

const RING_RADIUS = 15;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function LearningPathMap({ tech, base }: Props) {
  const lang = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [collapsedStageIds, setCollapsedStageIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [scale, setScale] = useState(100);
  const canvasRef = useRef<MapCanvasHandle>(null);
  // 初始为空、挂载后再读取：水合渲染期间读 localStorage 会造成 SSR/客户端标记不一致
  const [progress, setProgress] = useState<TechProgress>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 水合后同步本地进度，必须延迟到 effect
    setProgress(readTechProgress(tech.module));
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROGRESS_STORAGE_KEY) {
        setProgress(readTechProgress(tech.module));
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [tech.module]);

  const layout = useMemo(
    () => computeMapLayout(tech.stages, collapsedStageIds),
    [tech.stages, collapsedStageIds],
  );

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

  const panelNode = useMemo(() => {
    const id = hoverId ?? selectedId;
    if (!id) return null;
    for (const stage of tech.stages) {
      const node = stage.nodes.find((n) => n.id === id);
      if (node) return node;
    }
    return null;
  }, [hoverId, selectedId, tech.stages]);

  const handleSelectNode = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleHoverNode = useCallback((id: string | null) => {
    setHoverId(id);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedId(null);
    setHoverId(null);
  }, []);

  // 关闭详情面板后把焦点还给来源节点，键盘/读屏用户不会丢失位置
  const handleClosePanel = useCallback(() => {
    const id = selectedId ?? hoverId;
    setSelectedId(null);
    setHoverId(null);
    if (id) {
      const node = document.querySelector<SVGGElement>(
        `.lp-node[data-node-id="${CSS.escape(id)}"]`,
      );
      node?.focus?.({ preventScroll: true });
    }
  }, [selectedId, hoverId]);

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

  const handleLocate = useCallback(() => {
    const id = hoverId ?? selectedId;
    if (id) canvasRef.current?.focusNode(id);
  }, [hoverId, selectedId]);

  const handleSetProgress = useCallback(
    (nodeId: string, state: NodeProgress | null) => {
      setProgress(writeNodeProgress(tech.module, nodeId, state));
    },
    [tech.module],
  );

  const handleResetProgress = useCallback(() => {
    if (doneCount + learningCount === 0) return;
    if (!window.confirm(t('lpMap.clearConfirm', { title: tech.title }, lang))) return;
    setProgress(clearTechProgress(tech.module));
  }, [doneCount, learningCount, tech.module, tech.title, lang]);

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
          onClose={handleClosePanel}
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
