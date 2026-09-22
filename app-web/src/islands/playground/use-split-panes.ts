import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { FrontendPen } from './types';

export type PaneKey = 'html' | 'css' | 'js';
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.8;
const PANE_RATIO_MIN = 0.15;
const PANE_RATIO_MAX = 0.85;

interface UseSplitPanesOptions {
  pen: FrontendPen;
  updatePen: (patch: Partial<FrontendPen>) => void;
}

interface UseSplitPanesResult {
  split: number;
  setSplit: React.Dispatch<React.SetStateAction<number>>;
  dragging: boolean;
  editorsRef: React.RefObject<HTMLElement | null>;
  workspaceRef: React.RefObject<HTMLDivElement | null>;
  handleSplitStart: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleSplitMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handleSplitEnd: () => void;
  handlePaneSplitStart: (e: ReactPointerEvent<HTMLDivElement>, a: PaneKey, b: PaneKey) => void;
  handlePaneSplitMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  handlePaneSplitEnd: () => void;
}

export function useSplitPanes({ pen, updatePen }: UseSplitPanesOptions): UseSplitPanesResult {
  const [split, setSplit] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ start: number; value: number } | null>(null);
  const paneDragRef = useRef<{ a: PaneKey; b: PaneKey; start: number; wa: number; wb: number } | null>(null);
  const editorsRef = useRef<HTMLElement | null>(null);
  // split 以工作区（而非整个窗口）的尺寸为百分比基准，拖动必须量同一元素，否则滑块跟不上光标
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const handleSplitStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        start: pen.layout === 'left' ? e.clientX : e.clientY,
        value: split,
      };
      setDragging(true);
    },
    [pen.layout, split],
  );

  const handleSplitMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const el = workspaceRef.current;
      const total = el
        ? (pen.layout === 'left' ? el.clientWidth : el.clientHeight)
        : (pen.layout === 'left' ? window.innerWidth : window.innerHeight);
      if (total <= 0) return;
      const delta = (pen.layout === 'left' ? e.clientX : e.clientY) - dragRef.current.start;
      const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, dragRef.current.value + delta / total));
      setSplit(next);
    },
    [pen.layout],
  );

  const handleSplitEnd = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

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

  const handlePaneSplitEnd = useCallback(() => {
    paneDragRef.current = null;
    setDragging(false);
  }, []);

  return {
    split,
    setSplit,
    dragging,
    editorsRef,
    workspaceRef,
    handleSplitStart,
    handleSplitMove,
    handleSplitEnd,
    handlePaneSplitStart,
    handlePaneSplitMove,
    handlePaneSplitEnd,
  };
}
