/**
 * 编辑区分栏拖拽 Hook（use-split-panes）
 * =============================================================================
 * 从 FrontendLab 拆出的布局域（纯代码搬移，行为与拆分前一致）：
 * - 编辑器区/预览区分隔条拖拽（占比 0.2-0.8，写回作品随自动保存持久化）
 * - HTML/CSS/JS 三栏权重拖拽（单侧最小占比 0.15/最大 0.85）
 * - 拖拽态标记（body 类消费：拖拽期间禁用文本选中）
 * =============================================================================
 */
import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { FrontendPen } from './types';

/** 编辑器面板 key（与作品字段一一对应） */
export type PaneKey = 'html' | 'css' | 'js';
/** 编辑器区域占预览区的比例范围 */
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.8;
/** 拖拽调整面板权重时的最小/最大占比 */
const PANE_RATIO_MIN = 0.15;
const PANE_RATIO_MAX = 0.85;

/** Hook 入参 */
interface UseSplitPanesOptions {
  /** 当前作品（消费 layout 方向与 paneWeights） */
  pen: FrontendPen;
  /** 作品更新入口（拖拽结束时写回面板权重） */
  updatePen: (patch: Partial<FrontendPen>) => void;
}

/** Hook 返回值 */
interface UseSplitPanesResult {
  /** 编辑器区域占比（0-1） */
  split: number;
  /** 设置占比（打开作品/恢复草稿时写回） */
  setSplit: React.Dispatch<React.SetStateAction<number>>;
  /** 是否正在拖拽任意分隔条 */
  dragging: boolean;
  /** 编辑器区域容器引用（用于计算面板权重拖拽比例） */
  editorsRef: React.RefObject<HTMLElement | null>;
  /** 分隔条拖拽三事件 */
  handleSplitStart: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleSplitMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleSplitEnd: () => void;
  /** 面板权重拖拽三事件 */
  handlePaneSplitStart: (e: ReactPointerEvent<HTMLDivElement>, a: PaneKey, b: PaneKey) => void;
  handlePaneSplitMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handlePaneSplitEnd: () => void;
}

/**
 * 编辑区分栏：分隔条与面板权重的指针拖拽
 */
export function useSplitPanes({ pen, updatePen }: UseSplitPanesOptions): UseSplitPanesResult {
  /** 编辑器区域占比（0-1） */
  const [split, setSplit] = useState(0.5);
  /** 是否正在拖拽分隔条 */
  const [dragging, setDragging] = useState(false);
  /** 拖拽起始信息 */
  const dragRef = useRef<{ start: number; value: number } | null>(null);
  /** 面板权重拖拽起始信息 */
  const paneDragRef = useRef<{ a: PaneKey; b: PaneKey; start: number; wa: number; wb: number } | null>(null);
  /** 编辑器区域容器引用（用于计算拖拽比例） */
  const editorsRef = useRef<HTMLElement | null>(null);

  /** 开始拖拽分隔条 */
  const handleSplitStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      // 捕获指针，保证拖拽移出分隔条后仍能持续更新比例
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        start: pen.layout === 'left' ? e.clientX : e.clientY,
        value: split,
      };
      setDragging(true);
    },
    [pen.layout, split],
  );

  /** 拖拽过程中更新分隔比例 */
  const handleSplitMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const total = pen.layout === 'left' ? window.innerWidth : window.innerHeight;
      const delta = (pen.layout === 'left' ? e.clientX : e.clientY) - dragRef.current.start;
      const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, dragRef.current.value + delta / total));
      setSplit(next);
    },
    [pen.layout],
  );

  /** 结束拖拽：把最终比例写回作品（随自动保存持久化） */
  const handleSplitEnd = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  /** 开始拖拽面板权重（HTML/CSS/JS 三栏边界）
   * 捕获指针，保证拖出分隔条后仍能持续更新 */
  const handlePaneSplitStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, a: PaneKey, b: PaneKey) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      paneDragRef.current = {
        a,
        b,
        start: pen.layout === 'left' ? e.clientY : e.clientX,
        wa: pen.paneWeights[a],
        wb: pen.paneWeights[b],
      };
      setDragging(true);
    },
    [pen.layout, pen.paneWeights],
  );

  /** 拖拽过程中更新两侧面板权重
   * 位移换算为总权重内的增量，并限制单侧最小占比。
   * 基线写入 dragRef：同帧多次 move 事件在渲染前到达时仍能正确累积
   * （与原函数式 setPen 的连续更新语义一致） */
  const handlePaneSplitMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = paneDragRef.current;
      const container = editorsRef.current;
      if (!drag || !container) return;
      const size = pen.layout === 'left' ? container.clientHeight : container.clientWidth;
      if (size <= 0) return;
      const total = drag.wa + drag.wb;
      const delta = (pen.layout === 'left' ? e.clientY : e.clientX) - drag.start;
      const nextA = Math.min(
        total * PANE_RATIO_MAX,
        Math.max(total * PANE_RATIO_MIN, drag.wa + total * (delta / size)),
      );
      paneDragRef.current = { ...drag, wa: nextA, wb: total - nextA };
      updatePen({
        paneWeights: { ...pen.paneWeights, [drag.a]: nextA, [drag.b]: total - nextA },
      });
    },
    [pen.layout, pen.paneWeights, updatePen],
  );

  /** 结束面板权重拖拽 */
  const handlePaneSplitEnd = useCallback(() => {
    paneDragRef.current = null;
    setDragging(false);
  }, []);

  return {
    split,
    setSplit,
    dragging,
    editorsRef,
    handleSplitStart,
    handleSplitMove,
    handleSplitEnd,
    handlePaneSplitStart,
    handlePaneSplitMove,
    handlePaneSplitEnd,
  };
}
