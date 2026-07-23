/**
 * 文档批注状态管理 Store（Zustand v5 + IndexedDB 持久化）
 *
 * 功能概述：
 * - 使用 Zustand v5 `create` + `persist` 中间件管理文档批注状态
 * - 状态字段：annotations（docId → Annotation[]）、activeAnnotationId
 * - localStorage 持久化（key: 'fandex-annotations'）
 * - 支持 TipTap JSON 与 HTML 两种批注内容格式
 * - 提供 Markdown 导出功能
 *
 * Annotation 类型设计：
 * - id：唯一标识（uuid）
 * - docId：所属文档 ID
 * - text：被批注的原文片段
 * - textOffset：原文中的字符偏移量（start/end）
 * - note：批注内容（TipTap JSON 字符串或 HTML）
 * - noteFormat：note 字段的格式
 * - color：高亮颜色
 * - createdAt / updatedAt：时间戳
 *
 * 使用示例：
 *   import { useAnnotationsStore } from '@/lib/store/annotations-store';
 *   const { annotations, addAnnotation, deleteAnnotation } = useAnnotationsStore();
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** 批注高亮颜色类型 */
export type AnnotationColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

/** 批注内容格式类型 */
export type AnnotationNoteFormat = 'json' | 'html';

/** 文档批注数据结构 */
export interface Annotation {
  /** 唯一标识（uuid） */
  id: string;
  /** 所属文档 ID */
  docId: string;
  /** 被批注的原文片段 */
  text: string;
  /** 原文中的字符偏移量 */
  textOffset: { start: number; end: number };
  /** 批注内容（TipTap JSON 字符串或 HTML） */
  note: string;
  /** note 字段的格式 */
  noteFormat: AnnotationNoteFormat;
  /** 高亮颜色 */
  color: AnnotationColor;
  /** 创建时间戳（ms） */
  createdAt: number;
  /** 最近更新时间戳（ms） */
  updatedAt: number;
}

/** 新增批注时的输入类型（由调用方提供，自动填充 id/timestamps） */
export type NewAnnotationInput = Omit<Annotation, 'id' | 'createdAt' | 'updatedAt'>;

/** annotations 持久化键名 */
const STORAGE_KEY = 'fandex-annotations';

/** 批注 Store 状态接口 */
export interface AnnotationsStoreState {
  /** 批注数据（docId → annotations 列表） */
  annotations: Record<string, Annotation[]>;
  /** 当前激活的批注 ID（编辑/聚焦中） */
  activeAnnotationId: string | null;

  /** 获取指定文档的所有批注（按 createdAt 升序） */
  getAnnotations: (docId: string) => Annotation[];
  /** 新增批注 */
  addAnnotation: (input: NewAnnotationInput) => Annotation;
  /** 更新批注 */
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  /** 删除单条批注 */
  deleteAnnotation: (id: string) => void;
  /** 删除指定文档的所有批注 */
  deleteDocAnnotations: (docId: string) => void;
  /** 设置激活的批注 ID */
  setActiveAnnotation: (id: string | null) => void;
  /** 导出批注为 Markdown 字符串 */
  exportAnnotations: (docId?: string) => string;
}

/**
 * 生成简易 UUID（用于批注 ID）
 *
 * 实现说明：
 * - 优先使用 crypto.randomUUID()
 * - 降级为时间戳 + 随机数拼接
 *
 * @returns 唯一标识字符串
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * 将 TipTap JSON 字符串解析为纯文本（用于 Markdown 导出）
 *
 * 实现说明：
 * - 简单递归提取 text 节点
 * - 解析失败时返回原始字符串
 *
 * @param jsonStr - TipTap JSON 字符串
 * @returns 纯文本内容
 */
function tipTapJsonToText(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
    /** 递归提取文本节点 */
    const extractText = (node: {
      text?: string;
      content?: Array<{ text?: string; content?: unknown[] }>;
    }): string => {
      if (typeof node.text === 'string') return node.text;
      if (Array.isArray(node.content)) {
        return node.content.map((child) => extractText(child as typeof node)).join('');
      }
      return '';
    };
    return extractText(parsed).trim();
  } catch {
    return jsonStr;
  }
}

/**
 * 将 HTML 字符串转换为纯文本（用于 Markdown 导出）
 *
 * 实现说明：
 * - 简单去除 HTML 标签
 * - 不做完整 HTML 解析（避免引入额外依赖）
 *
 * @param html - HTML 字符串
 * @returns 纯文本内容
 */
function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * 批注 Store 实现
 *
 * 设计要点：
 * 1. persist 持久化 annotations 字段（activeAnnotationId 不持久化）
 * 2. addAnnotation 自动生成 id 与 timestamps
 * 3. updateAnnotation 同步更新 updatedAt
 * 4. exportAnnotations 支持 Markdown 导出（单文档或全部）
 */
export const useAnnotationsStore = create<AnnotationsStoreState>()(
  persist(
    (set, get) => ({
      annotations: {},
      activeAnnotationId: null,

      /**
       * 获取指定文档的所有批注
       *
       * @param docId - 文档 ID
       * @returns 批注列表（按 createdAt 升序）
       */
      getAnnotations: (docId) => {
        const list = get().annotations[docId] ?? [];
        return [...list].sort((a, b) => a.createdAt - b.createdAt);
      },

      /**
       * 新增批注
       *
       * 实现说明：
       * - 自动生成 id 与 createdAt / updatedAt
       * - 添加到对应 docId 的列表
       * - 返回完整的 Annotation 对象
       *
       * @param input - 新增批注输入（不含 id/timestamps）
       * @returns 完整的 Annotation 对象
       */
      addAnnotation: (input) => {
        const now = Date.now();
        const annotation: Annotation = {
          ...input,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => {
          const existing = state.annotations[input.docId] ?? [];
          return {
            annotations: {
              ...state.annotations,
              [input.docId]: [...existing, annotation],
            },
          };
        });

        return annotation;
      },

      /**
       * 更新批注
       *
       * 实现说明：
       * - 通过 id 查找所属 docId（遍历所有文档）
       * - 更新对应字段，同步 updatedAt
       * - id 不存在时静默忽略
       *
       * @param id - 批注 ID
       * @param updates - 待更新字段
       */
      updateAnnotation: (id, updates) => {
        set((state) => {
          const newAnnotations = { ...state.annotations };
          let found = false;

          for (const docId of Object.keys(newAnnotations)) {
            const list = newAnnotations[docId];
            if (!list) continue;
            const idx = list.findIndex((a) => a.id === id);
            if (idx >= 0 && list[idx]) {
              const original = list[idx];
              const updated: Annotation = {
                ...original,
                ...updates,
                id: original.id, // id 不可更新
                createdAt: original.createdAt, // createdAt 不可更新
                updatedAt: Date.now(),
              };
              const newList = [...list];
              newList[idx] = updated;
              newAnnotations[docId] = newList;
              found = true;
              break;
            }
          }

          return found ? { annotations: newAnnotations } : state;
        });
      },

      /**
       * 删除单条批注
       *
       * @param id - 批注 ID
       */
      deleteAnnotation: (id) => {
        set((state) => {
          const newAnnotations = { ...state.annotations };
          let found = false;

          for (const docId of Object.keys(newAnnotations)) {
            const list = newAnnotations[docId];
            if (!list) continue;
            const idx = list.findIndex((a) => a.id === id);
            if (idx >= 0) {
              const newList = list.filter((_, i) => i !== idx);
              newAnnotations[docId] = newList;
              found = true;
              break;
            }
          }

          return found ? { annotations: newAnnotations } : state;
        });

        // 如删除的是当前激活批注，清除激活状态
        if (get().activeAnnotationId === id) {
          set({ activeAnnotationId: null });
        }
      },

      /**
       * 删除指定文档的所有批注
       *
       * @param docId - 文档 ID
       */
      deleteDocAnnotations: (docId) => {
        set((state) => {
          if (!(docId in state.annotations)) return state;
          const newAnnotations = { ...state.annotations };
          delete newAnnotations[docId];
          return { annotations: newAnnotations };
        });
      },

      /**
       * 设置激活的批注 ID
       *
       * @param id - 批注 ID（或 null 取消激活）
       */
      setActiveAnnotation: (id) => set({ activeAnnotationId: id }),

      /**
       * 导出批注为 Markdown 字符串
       *
       * 实现说明：
       * - 单文档模式：导出指定文档的所有批注
       * - 全部模式：导出所有文档的所有批注
       * - 批注内容自动转换为纯文本（JSON/HTML → text）
       * - 输出格式：## 文档名 / ### 批注 / 原文 + 内容
       *
       * @param docId - 文档 ID（可选，未提供时导出全部）
       * @returns Markdown 字符串
       */
      exportAnnotations: (docId) => {
        const allAnnotations = get().annotations;

        /** 渲染单条批注为 Markdown 段 */
        const renderAnnotation = (ann: Annotation, index: number): string => {
          const noteText =
            ann.noteFormat === 'json' ? tipTapJsonToText(ann.note) : htmlToText(ann.note);
          const colorTag = `颜色: ${ann.color}`;
          const time = new Date(ann.createdAt).toLocaleString('zh-CN');
          return [
            `### 批注 ${index + 1}`,
            '',
            `> ${ann.text}`,
            '',
            `**批注内容**：${noteText}`,
            '',
            `**元信息**：${colorTag} | 创建于 ${time}`,
            '',
          ].join('\n');
        };

        /** 渲染单文档批注为 Markdown 块 */
        const renderDoc = (id: string, list: Annotation[]): string => {
          const header = `## 文档：${id}`;
          const body = list
            .slice()
            .sort((a, b) => a.createdAt - b.createdAt)
            .map((ann, idx) => renderAnnotation(ann, idx))
            .join('\n---\n\n');
          return `${header}\n\n${body}`;
        };

        if (docId) {
          const list = allAnnotations[docId] ?? [];
          if (list.length === 0) return '# 文档批注导出\n\n该文档暂无批注。';
          return `# 文档批注导出\n\n${renderDoc(docId, list)}\n`;
        }

        // 全部导出
        const allDocIds = Object.keys(allAnnotations);
        if (allDocIds.length === 0) return '# 文档批注导出\n\n暂无任何批注。';

        const blocks = allDocIds
          .filter((id) => (allAnnotations[id]?.length ?? 0) > 0)
          .map((id) => renderDoc(id, allAnnotations[id] ?? []));

        return `# 文档批注导出\n\n${blocks.join('\n\n---\n\n')}\n`;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 仅持久化 annotations 字段（activeAnnotationId 不持久化）
      partialize: (state) => ({ annotations: state.annotations }),
    },
  ),
);

export default useAnnotationsStore;
