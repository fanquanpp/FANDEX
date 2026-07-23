/**
 * useAnnotations Hook：文档批注管理
 *
 * 功能概述：
 * - 集成 annotations-store + IndexedDB
 * - 提供 annotations / add / update / remove / exportAll 接口
 * - 通过 selector 订阅指定 docId 的批注列表，最小化重渲染
 * - 自动同步新增/更新/删除到 IndexedDB（异步，不阻塞 UI）
 *
 * 使用示例：
 *   function AnnotationList({ docId }: { docId: string }) {
 *     const { annotations, add, remove } = useAnnotations(docId);
 *     return annotations.map(a => <div key={a.id} onClick={() => remove(a.id)}>{a.text}</div>);
 *   }
 */

import { useCallback, useMemo } from 'react';
import { deleteByIndex, deleteRecord, isIndexedDBAvailable, put } from '@/lib/db';
import {
  type Annotation,
  type NewAnnotationInput,
  useAnnotationsStore,
} from '@/lib/store/annotations-store';

/** useAnnotations 返回值类型 */
export interface UseAnnotationsReturn {
  /** 当前文档的批注列表（按 createdAt 升序） */
  annotations: Annotation[];
  /** 当前激活的批注 ID */
  activeAnnotationId: string | null;
  /** 新增批注 */
  add: (input: NewAnnotationInput) => Annotation;
  /** 更新批注 */
  update: (id: string, updates: Partial<Annotation>) => void;
  /** 删除单条批注 */
  remove: (id: string) => void;
  /** 删除当前文档的所有批注 */
  clearAll: () => void;
  /** 设置激活批注 */
  setActive: (id: string | null) => void;
  /** 导出批注为 Markdown */
  exportAll: () => string;
}

/**
 * 异步将批注同步到 IndexedDB
 *
 * 实现说明：
 * - IndexedDB 不可用时静默降级
 * - 失败仅打印日志，不阻塞主流程
 *
 * @param annotation - 批注对象
 */
async function syncAnnotationToDB(annotation: Annotation): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await put('annotations', annotation);
  } catch (err) {
    console.error('[use-annotations] syncAnnotationToDB failed:', err);
  }
}

/**
 * 异步从 IndexedDB 删除批注
 *
 * @param id - 批注 ID
 */
async function deleteAnnotationFromDB(id: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await deleteRecord('annotations', id);
  } catch (err) {
    console.error('[use-annotations] deleteAnnotationFromDB failed:', err);
  }
}

/**
 * 异步从 IndexedDB 删除文档所有批注
 *
 * @param docId - 文档 ID
 */
async function deleteDocAnnotationsFromDB(docId: string): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  try {
    await deleteByIndex('annotations', 'docId', docId);
  } catch (err) {
    console.error('[use-annotations] deleteDocAnnotationsFromDB failed:', err);
  }
}

/**
 * useAnnotations Hook
 *
 * 实现说明：
 * - selector 订阅指定 docId 的批注列表
 * - add/update/remove 包装为同步 IndexedDB 的方法
 * - exportAll 仅导出当前文档的批注
 *
 * @param docId - 文档 ID
 * @returns 批注管理接口
 */
export function useAnnotations(docId: string): UseAnnotationsReturn {
  // selector：仅订阅当前 docId 的批注
  const annotations = useAnnotationsStore((state) => state.annotations[docId] ?? []);
  const activeAnnotationId = useAnnotationsStore((state) => state.activeAnnotationId);
  const addAnnotationAction = useAnnotationsStore((state) => state.addAnnotation);
  const updateAnnotationAction = useAnnotationsStore((state) => state.updateAnnotation);
  const deleteAnnotationAction = useAnnotationsStore((state) => state.deleteAnnotation);
  const deleteDocAnnotationsAction = useAnnotationsStore((state) => state.deleteDocAnnotations);
  const setActiveAnnotationAction = useAnnotationsStore((state) => state.setActiveAnnotation);
  const exportAnnotationsAction = useAnnotationsStore((state) => state.exportAnnotations);

  /**
   * 新增批注（同步到 IndexedDB）
   */
  const add = useCallback(
    (input: NewAnnotationInput): Annotation => {
      const annotation = addAnnotationAction(input);
      // 异步同步到 IndexedDB
      void syncAnnotationToDB(annotation);
      return annotation;
    },
    [addAnnotationAction],
  );

  /**
   * 更新批注（同步到 IndexedDB）
   *
   * 实现说明：
   * - store 更新后通过 getAnnotations 获取最新数据同步到 DB
   * - 由于 updateAnnotation 内部按 id 查找，需要先确认 docId
   */
  const update = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      updateAnnotationAction(id, updates);
      // 更新后从 store 读取最新数据同步到 DB
      // 由于无法直接拿到更新后的对象，这里通过 store.getState 读取
      // 但为简化逻辑，仅在 IndexedDB 写入时构造部分字段（依赖 store 是 source of truth）
      // 这里改为从 store 读取最新批注
      const allAnnotations = useAnnotationsStore.getState().annotations;
      for (const list of Object.values(allAnnotations)) {
        const found = list.find((a) => a.id === id);
        if (found) {
          void syncAnnotationToDB(found);
          break;
        }
      }
    },
    [updateAnnotationAction],
  );

  /**
   * 删除单条批注（同步到 IndexedDB）
   */
  const remove = useCallback(
    (id: string) => {
      deleteAnnotationAction(id);
      void deleteAnnotationFromDB(id);
    },
    [deleteAnnotationAction],
  );

  /**
   * 删除当前文档所有批注（同步到 IndexedDB）
   */
  const clearAll = useCallback(() => {
    deleteDocAnnotationsAction(docId);
    void deleteDocAnnotationsFromDB(docId);
  }, [deleteDocAnnotationsAction, docId]);

  /**
   * 设置激活批注
   */
  const setActive = useCallback(
    (id: string | null) => {
      setActiveAnnotationAction(id);
    },
    [setActiveAnnotationAction],
  );

  /**
   * 导出当前文档批注为 Markdown
   */
  const exportAll = useCallback(() => {
    return exportAnnotationsAction(docId);
  }, [exportAnnotationsAction, docId]);

  return useMemo(
    () => ({
      annotations,
      activeAnnotationId,
      add,
      update,
      remove,
      clearAll,
      setActive,
      exportAll,
    }),
    [annotations, activeAnnotationId, add, update, remove, clearAll, setActive, exportAll],
  );
}

export default useAnnotations;
