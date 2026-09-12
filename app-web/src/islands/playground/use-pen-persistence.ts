/**
 * 作品持久化 Hook（use-pen-persistence）
 * =============================================================================
 * 从 FrontendLab 拆出的保存域状态机（纯代码搬移，行为与拆分前一致）：
 * - 自动保存（防抖 800ms）：草稿与作品库记录实时落盘，失败进入 error 态
 * - 页面隐藏/关闭兜底落盘：visibilitychange + pagehide 互补，
 *   latest ref 保证兜底读到最新内容
 * - 保存状态三态：saved / saving / error（工具栏文案消费）
 * =============================================================================
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { savePen, savePenDraft } from './pg-storage';
import type { FrontendPen } from './types';

/** 自动保存防抖时长（毫秒） */
const AUTOSAVE_MS = 800;

/** 保存状态文案 */
export type SaveState = 'saved' | 'saving' | 'error';

/** Hook 入参 */
interface UsePenPersistenceOptions {
  /** 当前编辑中的作品（内容变化触发防抖保存） */
  pen: FrontendPen;
  /** 编辑器占比（随内容一同持久化） */
  split: number;
}

/** Hook 返回值 */
interface UsePenPersistenceResult {
  /** 保存状态（工具栏文案消费） */
  saveState: SaveState;
  /** 直接设置保存状态（显式保存动作后即时反馈，如另存为新作品） */
  setSaveState: React.Dispatch<React.SetStateAction<SaveState>>;
}

/**
 * 作品持久化：防抖自动保存 + 页面隐藏兜底落盘
 */
export function usePenPersistence({ pen, split }: UsePenPersistenceOptions): UsePenPersistenceResult {
  /** 自动保存状态 */
  const [saveState, setSaveState] = useState<SaveState>('saved');

  /**
   * 立即落盘当前作品（跳过防抖），供页面隐藏/关闭前兜底调用。
   * IndexedDB 写入在 pagehide 阶段发起即可被浏览器接受（尽力而为），
   * 与防抖自动保存互补，把"最后几百毫秒输入丢失"的窗口压到最小。
   */
  // latest ref 模式：渲染期不入 ref（react-hooks/refs），改在渲染提交后同步
  const latestPenRef = useRef<FrontendPen | null>(null);
  useEffect(() => {
    latestPenRef.current = pen;
  }, [pen]);

  const flushPen = useCallback(
    (source: FrontendPen) => {
      const now = Date.now();
      const payload: FrontendPen = {
        ...source,
        split,
        updatedAt: now,
        lastOpenedAt: source.lastOpenedAt || now,
      };
      // 兜底路径静默执行：页面正在卸载，状态更新无意义
      if (payload.id === 'draft') {
        void savePenDraft(payload);
      } else {
        void savePen(payload).catch(() => {});
      }
    },
    [split],
  );

  /**
   * 自动保存（防抖）：草稿与作品库记录都实时落盘；
   * 写入失败时进入 error 态（工具栏显示「未保存」），不静默假报已保存
   */
  useEffect(() => {
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
  }, [pen, split]);

  /**
   * 页面隐藏/关闭前的兜底落盘：visibilitychange 覆盖切标签/最小化，
   * pagehide 覆盖关闭与跳转，两者互补把丢失窗口压到最小
   */
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
