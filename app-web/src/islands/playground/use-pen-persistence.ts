import { useCallback, useEffect, useRef, useState } from 'react';
import { savePen, savePenDraft } from './pg-storage';
import type { FrontendPen } from './types';

const AUTOSAVE_MS = 800;

export type SaveState = 'saved' | 'saving' | 'error';

interface UsePenPersistenceOptions {
  pen: FrontendPen;
  split: number;
  /** 初始草稿/深链加载完成前为 false，避免默认模板覆盖已存的草稿 */
  autosaveEnabled: boolean;
}

interface UsePenPersistenceResult {
  saveState: SaveState;
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>;
}

export function usePenPersistence({ pen, split, autosaveEnabled }: UsePenPersistenceOptions): UsePenPersistenceResult {
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const latestPenRef = useRef<FrontendPen | null>(null);
  useEffect(() => {
    latestPenRef.current = pen;
  }, [pen]);

  const enabledRef = useRef(autosaveEnabled);
  useEffect(() => {
    enabledRef.current = autosaveEnabled;
  }, [autosaveEnabled]);

  const flushPen = useCallback(
    (source: FrontendPen) => {
      if (!enabledRef.current) return;
      const now = Date.now();
      const payload: FrontendPen = {
        ...source,
        split,
        updatedAt: now,
        lastOpenedAt: source.lastOpenedAt || now,
      };
      if (payload.id === 'draft') {
        void savePenDraft(payload);
      } else {
        void savePen(payload).catch(() => {});
      }
    },
    [split],
  );

  useEffect(() => {
    if (!autosaveEnabled) return;
    const timer = setTimeout(async () => {
      setSaveState('saving');
      const now = Date.now();
      const payload: FrontendPen = {
        ...pen,
        split,
        updatedAt: now,
        lastOpenedAt: pen.lastOpenedAt || now,
      };
      try {
        let ok = true;
        if (pen.id === 'draft') {
          ok = await savePenDraft(payload);
        } else {
          await savePen(payload);
        }
        setSaveState(ok ? 'saved' : 'error');
      } catch {
        setSaveState('error');
      }
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [pen, split, autosaveEnabled]);

  useEffect(() => {
    const onHidden = () => {
      const source = latestPenRef.current;
      if (source && document.visibilityState === 'hidden') flushPen(source);
    };
    const onPageHide = () => {
      const source = latestPenRef.current;
      if (source) flushPen(source);
    };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [flushPen]);

  return { saveState, setSaveState };
}
