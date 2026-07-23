/**
 * useProgress Hook：单文档阅读进度
 *
 * 功能概述：
 * - 集成 progress-store + IndexedDB + BroadcastChannel
 * - 提供 status / setProgress / toggleProgress 接口
 * - 自动在组件挂载时触发 store.initialize（如尚未初始化）
 * - 通过 selector 订阅最小化重渲染
 *
 * 使用示例：
 *   function DocProgressButton({ docId }: { docId: string }) {
 *     const { status, toggleProgress } = useProgress(docId);
 *     return <button onClick={toggleProgress}>{status}</button>;
 *   }
 */

import { useEffect, useMemo } from 'react';
import type { ProgressStatus } from '@/lib/progress-persist';
import { useProgressStore } from '@/lib/store/progress-store';

/** useProgress 返回值类型 */
export interface UseProgressReturn {
  /** 当前文档的阅读状态 */
  status: ProgressStatus;
  /** 设置文档进度 */
  setProgress: (status: ProgressStatus) => void;
  /** 切换文档进度（unread → reading → read → unread） */
  toggleProgress: () => void;
}

/**
 * useProgress Hook
 *
 * 实现说明：
 * - 使用 selector 仅订阅当前 docId 的状态，避免全量订阅
 * - 组件挂载时检查并触发 store.initialize（幂等）
 *
 * @param docId - 文档 ID
 * @returns { status, setProgress, toggleProgress }
 */
export function useProgress(docId: string): UseProgressReturn {
  // selector：仅订阅当前文档的进度状态
  const status = useProgressStore((state) => state.progress[docId] ?? 'unread');
  const setProgressAction = useProgressStore((state) => state.setProgress);
  const toggleProgressAction = useProgressStore((state) => state.toggleProgress);
  const initialize = useProgressStore((state) => state.initialize);
  const initialized = useProgressStore((state) => state.initialized);

  // 组件挂载时确保 store 已初始化（从 IndexedDB 同步数据）
  useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialized, initialize]);

  // 包装为 docId-bound 方法，便于组件直接调用
  return useMemo(
    () => ({
      status,
      setProgress: (next: ProgressStatus) => setProgressAction(docId, next),
      toggleProgress: () => toggleProgressAction(docId),
    }),
    [status, docId, setProgressAction, toggleProgressAction],
  );
}

export default useProgress;
