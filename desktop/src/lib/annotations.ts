/**
 * 文档批注管理高级 API（Phase 5）
 *
 * 功能概述：
 * - 基于 Phase 4 创建的 Zustand `annotations-store` 封装
 * - 提供面向业务的高级 API：CRUD、批量导出/导入、TipTap JSON <-> HTML 转换
 * - 集成 TipTap 编辑器（`@tiptap/starter-kit`、`@tiptap/react`），通过 `generateHTML` / `generateJSON` 实现格式互转
 * - 兼容 SSR 环境（所有 API 在 SSR 下返回安全默认值）
 *
 * 设计要点：
 * - 不修改 Phase 4 创建的 store 文件，仅作为薄包装层
 * - 通过 `useAnnotationsStore.getState()` 在非 React 上下文中调用 store
 * - TipTap 转换函数提供 fallback 实现，避免导入失败导致整个模块不可用
 * - 所有异步函数使用 try-catch 错误处理
 *
 * 依赖关系：
 * - @/lib/store/annotations-store：Zustand store（状态管理 + localStorage 持久化）
 * - @tiptap/starter-kit、@tiptap/react：TipTap 编辑器核心
 * - @/lib/logger：日志输出
 *
 * 使用示例：
 *   import { getDocAnnotations, addAnnotation, exportAnnotations } from '@/lib/annotations';
 *   const list = getDocAnnotations('frontend/javascript/概述');
 *   const ann = addAnnotation({ docId, text, textOffset, note, noteFormat, color });
 *   const markdown = exportAnnotations(docId, 'markdown');
 */

import type { AnnotationColor } from '@/lib/constants';
import { logger } from '@/lib/logger';
import {
  type Annotation,
  type NewAnnotationInput,
  useAnnotationsStore,
} from '@/lib/store/annotations-store';

/** TipTap 转换器接口（仅约束使用的两个方法，签名放宽以兼容 TipTap 实际类型） */
export interface TipTapConverters {
  // biome-ignore lint/suspicious/noExplicitAny: TipTap generateHTML 签名要求 JSONContent 与 Extensions，此处放宽为 any 兼容动态加载
  generateHTML: (doc: any, extensions: any) => string;
  // biome-ignore lint/suspicious/noExplicitAny: TipTap generateJSON 签名要求 Extensions，此处放宽为 any 兼容动态加载
  generateJSON: (html: string, extensions: any) => Record<string, unknown>;
}

/** 已加载的 TipTap 转换器（懒加载） */
let tipTapConverters: TipTapConverters | null = null;

/** 已加载的 TipTap 扩展集合（用于 generateHTML/generateJSON） */
let tipTapExtensions: unknown[] | null = null;

/** TipTap 加载失败标志（避免重复尝试加载） */
let tipTapLoadFailed = false;

/**
 * 懒加载 TipTap 转换器与扩展
 *
 * 实现说明：
 * - 首次调用时动态 import `@tiptap/react` 与 `@tiptap/starter-kit`
 * - 加载成功后缓存到模块级变量，后续调用直接复用
 * - 加载失败设置 `tipTapLoadFailed` 标志，后续调用直接返回 null
 * - SSR 环境直接返回 null
 *
 * @returns TipTap 转换器与扩展集合，加载失败返回 null
 */
async function loadTipTap(): Promise<{
  converters: TipTapConverters;
  extensions: unknown[];
} | null> {
  if (typeof window === 'undefined') return null;
  if (tipTapConverters && tipTapExtensions) {
    return { converters: tipTapConverters, extensions: tipTapExtensions };
  }
  if (tipTapLoadFailed) return null;
  // 缓存未命中且未加载失败，继续后续动态导入流程

  try {
    // 动态导入避免 SSR 阶段执行 TipTap（其依赖 DOM）
    const react = await import('@tiptap/react');
    const starterKit = await import('@tiptap/starter-kit');
    const link = await import('@tiptap/extension-link');
    const placeholder = await import('@tiptap/extension-placeholder');

    const extensions: unknown[] = [
      starterKit.default,
      link.default.configure({ openOnClick: false }),
      placeholder.default,
    ];

    const converters: TipTapConverters = {
      generateHTML: react.generateHTML,
      generateJSON: react.generateJSON,
    };
    tipTapConverters = converters;
    tipTapExtensions = extensions;

    return { converters, extensions };
  } catch (err) {
    logger.warn('[annotations] TipTap load failed, fallback to simple converter:', err);
    tipTapLoadFailed = true;
    return null;
  }
}

/**
 * 获取指定文档的所有批注
 *
 * @param docId - 文档 ID
 * @returns 批注列表（按 createdAt 升序）
 */
export function getDocAnnotations(docId: string): Annotation[] {
  try {
    return useAnnotationsStore.getState().getAnnotations(docId);
  } catch (err) {
    logger.error('[annotations] getDocAnnotations failed:', err);
    return [];
  }
}

/**
 * 新增批注
 *
 * @param params - 批注参数（不含 id 与 timestamps，由 store 自动生成）
 * @returns 完整的 Annotation 对象
 */
export function addAnnotation(params: NewAnnotationInput): Annotation {
  try {
    return useAnnotationsStore.getState().addAnnotation(params);
  } catch (err) {
    logger.error('[annotations] addAnnotation failed:', err);
    // 返回一个占位 Annotation，调用方应检查 id 是否为空
    return {
      ...params,
      id: '',
      createdAt: 0,
      updatedAt: 0,
    };
  }
}

/**
 * 更新批注
 *
 * @param id - 批注 ID
 * @param updates - 待更新字段
 */
export function updateAnnotation(id: string, updates: Partial<Annotation>): void {
  try {
    useAnnotationsStore.getState().updateAnnotation(id, updates);
  } catch (err) {
    logger.error('[annotations] updateAnnotation failed:', err);
  }
}

/**
 * 删除单条批注
 *
 * @param id - 批注 ID
 */
export function deleteAnnotation(id: string): void {
  try {
    useAnnotationsStore.getState().deleteAnnotation(id);
  } catch (err) {
    logger.error('[annotations] deleteAnnotation failed:', err);
  }
}

/**
 * 删除指定文档的所有批注
 *
 * @param docId - 文档 ID
 */
export function deleteDocAnnotations(docId: string): void {
  try {
    useAnnotationsStore.getState().deleteDocAnnotations(docId);
  } catch (err) {
    logger.error('[annotations] deleteDocAnnotations failed:', err);
  }
}

/**
 * 导出批注为指定格式字符串
 *
 * @param docId - 文档 ID（可选，未提供时导出全部）
 * @param format - 导出格式：'markdown' 或 'json'
 * @returns 导出字符串
 */
export function exportAnnotations(
  docId?: string,
  format: 'markdown' | 'json' = 'markdown',
): string {
  try {
    if (format === 'json') {
      const allAnnotations = useAnnotationsStore.getState().annotations;
      if (docId) {
        return JSON.stringify(allAnnotations[docId] ?? [], null, 2);
      }
      return JSON.stringify(allAnnotations, null, 2);
    }
    // markdown 格式直接调用 store 的 exportAnnotations
    return useAnnotationsStore.getState().exportAnnotations(docId);
  } catch (err) {
    logger.error('[annotations] exportAnnotations failed:', err);
    return format === 'json' ? '{}' : '';
  }
}

/**
 * 从字符串导入批注数据
 *
 * 实现说明：
 * - JSON 格式：解析为 Record<docId, Annotation[]> 并合并到 store
 * - Markdown 格式：暂不支持自动解析（仅 JSON 格式可逆向还原）
 * - 已存在的批注（相同 id）会被覆盖
 *
 * @param data - 待导入的字符串
 * @param format - 导入格式：'markdown' 或 'json'
 */
export function importAnnotations(data: string, format: 'markdown' | 'json' = 'json'): void {
  try {
    if (format !== 'json') {
      logger.warn('[annotations] markdown import not supported, use JSON format');
      return;
    }

    const parsed = JSON.parse(data) as Record<string, Annotation[]> | Annotation[];
    const store = useAnnotationsStore.getState();

    // 兼容数组与对象两种格式
    const entries: Array<[string, Annotation[]]> = Array.isArray(parsed)
      ? groupAnnotationsByDocId(parsed)
      : Object.entries(parsed);

    // 通过 updateAnnotation 逐条合并（store 没有批量导入接口）
    for (const [targetDocId, list] of entries) {
      const existing = store.getAnnotations(targetDocId);
      const existingIds = new Set(existing.map((a) => a.id));
      // 仅导入 store 中不存在的批注（避免重复）
      for (const ann of list) {
        if (!existingIds.has(ann.id)) {
          // 通过 addAnnotation 添加（会重新生成 id 与 timestamps）
          store.addAnnotation({
            docId: targetDocId,
            text: ann.text,
            textOffset: ann.textOffset,
            note: ann.note,
            noteFormat: ann.noteFormat,
            color: ann.color,
          });
        }
      }
    }

    logger.info('[annotations] import completed');
  } catch (err) {
    logger.error('[annotations] importAnnotations failed:', err);
  }
}

/**
 * 将批注数组按 docId 分组
 *
 * @param list - 批注数组
 * @returns [docId, Annotation[]] 二元组数组
 */
function groupAnnotationsByDocId(list: Annotation[]): Array<[string, Annotation[]]> {
  const map = new Map<string, Annotation[]>();
  for (const ann of list) {
    const arr = map.get(ann.docId) ?? [];
    arr.push(ann);
    map.set(ann.docId, arr);
  }
  return Array.from(map.entries());
}

/**
 * 将 TipTap JSON 字符串转换为 HTML
 *
 * 实现说明：
 * - 优先使用 TipTap 官方 `generateHTML` 函数
 * - 加载失败时降级为简单文本提取（去除 JSON 包装，返回纯文本）
 * - 异步函数，首次调用会触发 TipTap 动态加载
 *
 * @param json - TipTap JSON 字符串
 * @returns HTML 字符串
 */
export async function tipTapJsonToHtml(json: string): Promise<string> {
  try {
    const tipTap = await loadTipTap();
    if (tipTap) {
      const doc = JSON.parse(json);
      return tipTap.converters.generateHTML(doc, tipTap.extensions);
    }
    // 降级：提取纯文本并用 <p> 包裹
    return `<p>${extractTextFromTipTapJson(json)}</p>`;
  } catch (err) {
    logger.error('[annotations] tipTapJsonToHtml failed:', err);
    return `<p>${extractTextFromTipTapJson(json)}</p>`;
  }
}

/**
 * 将 HTML 字符串转换为 TipTap JSON
 *
 * @param html - HTML 字符串
 * @returns TipTap JSON 字符串
 */
export async function htmlToTipTapJson(html: string): Promise<string> {
  try {
    const tipTap = await loadTipTap();
    if (tipTap) {
      const doc = tipTap.converters.generateJSON(html, tipTap.extensions);
      return JSON.stringify(doc);
    }
    // 降级：构造最简 TipTap 文档结构
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: htmlToText(html) }] }],
    });
  } catch (err) {
    logger.error('[annotations] htmlToTipTapJson failed:', err);
    return JSON.stringify({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: htmlToText(html) }] }],
    });
  }
}

/**
 * 从 TipTap JSON 中提取纯文本（fallback 用）
 *
 * @param jsonStr - TipTap JSON 字符串
 * @returns 纯文本
 */
function extractTextFromTipTapJson(jsonStr: string): string {
  try {
    const parsed = JSON.parse(jsonStr);
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
    return extractText(parsed);
  } catch {
    return jsonStr;
  }
}

/**
 * 将 HTML 转换为纯文本（fallback 用）
 *
 * @param html - HTML 字符串
 * @returns 纯文本
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

/** 颜色选项类型（重导出便于调用方使用） */
export type { Annotation, AnnotationColor, NewAnnotationInput };

export default {
  getDocAnnotations,
  addAnnotation,
  updateAnnotation,
  deleteAnnotation,
  deleteDocAnnotations,
  exportAnnotations,
  importAnnotations,
  tipTapJsonToHtml,
  htmlToTipTapJson,
};
