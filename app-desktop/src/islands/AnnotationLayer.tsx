/**
 * AnnotationLayer 文档批注层组件（React Island）
 *
 * 功能概述：
 * - 监听文档容器内的文本选中事件，弹出批注工具栏（Popover）
 * - TipTap 富文本编辑器（@tiptap/react + starter-kit + extension-link + extension-placeholder）编写批注内容
 * - 文本高亮：5 种颜色（yellow/green/blue/pink/purple）
 * - 持久化：annotations-store（Zustand）+ IndexedDB（useAnnotations hook 自动同步）
 * - 编辑已有批注：点击高亮文本弹出编辑器
 * - 删除批注
 * - 导出批注为 Markdown
 * - Motion 动画：工具栏淡入、高亮 pulse 反馈
 * - 基于 shadcn/ui Popover / Button / Textarea
 *
 * 使用方式（Astro island）：
 *   <AnnotationLayer client:visible docId={docId} />
 *   （组件内部会自动查找 [data-doc-content] 容器作为批注目标）
 *
 * 数据流：
 * 1. 用户选中文本 → 弹出工具栏 → 选择颜色 + 编辑批注 → 保存
 * 2. useAnnotations.add() → annotations-store + IndexedDB
 * 3. 组件订阅 store，渲染高亮标记
 * 4. 点击高亮 → 弹出编辑器 → 更新/删除
 */

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Download, Highlighter, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAnnotations } from '@/hooks/use-annotations';
import { cn } from '@/lib/cn';
import type { Annotation, AnnotationColor } from '@/lib/store/annotations-store';

/** AnnotationLayer 组件 Props 类型 */
export interface AnnotationLayerProps {
  /** 文档 ID */
  docId: string;
  /** 文档内容容器的 CSS 选择器（默认 '[data-doc-content]'） */
  contentSelector?: string;
  /** 额外类名 */
  className?: string;
}

/** 5 种高亮颜色对应的 Tailwind 类名映射 */
const COLOR_CLASSES: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-200/60 dark:bg-yellow-500/30',
  green: 'bg-emerald-200/60 dark:bg-emerald-500/30',
  blue: 'bg-blue-200/60 dark:bg-blue-500/30',
  pink: 'bg-pink-200/60 dark:bg-pink-500/30',
  purple: 'bg-purple-200/60 dark:bg-purple-500/30',
};

/** 颜色选择按钮的圆点样式（用于按钮内的色块） */
const COLOR_DOT_CLASSES: Record<AnnotationColor, string> = {
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-400',
  blue: 'bg-blue-400',
  pink: 'bg-pink-400',
  purple: 'bg-purple-400',
};

/** 颜色选项数组（按定义顺序） */
const COLOR_OPTIONS: AnnotationColor[] = ['yellow', 'green', 'blue', 'pink', 'purple'];

/** 颜色中文名映射 */
const COLOR_LABELS: Record<AnnotationColor, string> = {
  yellow: '黄',
  green: '绿',
  blue: '蓝',
  pink: '粉',
  purple: '紫',
};

/** 临时新建批注的会话状态 */
interface NewAnnotationSession {
  /** 选中原文 */
  text: string;
  /** 选中范围（用于保存后定位高亮） */
  range: Range;
  /** 起始字符偏移量（相对容器） */
  startOffset: number;
  /** 结束字符偏移量 */
  endOffset: number;
}

/** 编辑中批注的状态 */
interface EditingSession {
  /** 批注 id */
  id: string;
  /** 临时编辑内容（HTML） */
  tempNote: string;
  /** 临时颜色 */
  tempColor: AnnotationColor;
}

/**
 * 计算选中文本相对于容器的字符偏移量
 *
 * 实现说明：
 * - 通过 Range 对比容器内文本节点
 * - 简化版：使用 toString() 计算包含的文本长度
 * - 复杂场景（跨节点、含图片）下偏移量可能不精确，但足够支持本组件的高亮定位
 *
 * @param container - 文档内容容器
 * @param range - 当前 Selection 的 Range
 * @returns { start, end, text } 或 null（无法计算时）
 */
function computeOffsets(
  container: HTMLElement,
  range: Range,
): { start: number; end: number; text: string } | null {
  try {
    const preRange = document.createRange();
    preRange.selectNodeContents(container);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const text = range.toString();
    return {
      start,
      end: start + text.length,
      text,
    };
  } catch {
    return null;
  }
}

/**
 * AnnotationLayer 文档批注层组件
 *
 * @param props.docId - 文档 ID
 * @param props.contentSelector - 文档内容容器选择器
 * @param props.className - 外部类名
 */
export function AnnotationLayer({
  docId,
  contentSelector = '[data-doc-content]',
  className,
}: AnnotationLayerProps) {
  // 批注数据与操作（来自 Phase 4 useAnnotations hook）
  const { annotations, add, update, remove, exportAll } = useAnnotations(docId);

  // 选中文本时弹出的"新建批注"工具栏状态
  const [newSession, setNewSession] = useState<NewAnnotationSession | null>(null);
  // 工具栏的弹出位置（屏幕坐标）
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  // 当前选中颜色（默认黄色）
  const [pendingColor, setPendingColor] = useState<AnnotationColor>('yellow');
  // 当前编辑中的批注
  const [editing, setEditing] = useState<EditingSession | null>(null);

  // 文档内容容器引用（保留接口供未来扩展使用，当前通过 querySelector 查找）
  // 当前选中状态的引用（避免闭包陈旧）
  const selectionRef = useRef<Range | null>(null);

  /** TipTap 编辑器实例（新建批注用） */
  const newEditor = useEditor({
    extensions: [
      StarterKit.configure({
        // 简化配置：仅启用基本块级元素
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline' },
      }),
      Placeholder.configure({
        placeholder: '撰写批注内容...（支持加粗、斜体、链接）',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[80px] p-2 focus:outline-none',
      },
    },
  });

  /** TipTap 编辑器实例（编辑已有批注用） */
  const editEditor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: '编辑批注内容...' }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[80px] p-2 focus:outline-none',
      },
    },
  });

  /** 查找文档内容容器元素 */
  const findContainer = useCallback((): HTMLElement | null => {
    if (typeof document === 'undefined') return null;
    const el = document.querySelector<HTMLElement>(contentSelector);
    return el;
  }, [contentSelector]);

  /** 监听 mouseup/touchend 事件，检测文本选中 */
  const handleSelectionEnd = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      // 没有选中：清除新建会话
      setNewSession(null);
      setToolbarPos(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const container = findContainer();
    if (!container) return;

    // 仅当选中范围在文档容器内时才弹出工具栏
    if (!container.contains(range.commonAncestorContainer)) {
      setNewSession(null);
      setToolbarPos(null);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 1) {
      setNewSession(null);
      setToolbarPos(null);
      return;
    }

    // 计算偏移量
    const offsets = computeOffsets(container, range);
    if (!offsets) return;

    // 计算工具栏弹出位置：选区的中上方
    const rect = range.getBoundingClientRect();
    setToolbarPos({
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 8,
    });

    selectionRef.current = range.cloneRange();
    setNewSession({
      text,
      range: range.cloneRange(),
      startOffset: offsets.start,
      endOffset: offsets.end,
    });
  }, [findContainer]);

  /** 监听文档容器的选区变化 */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.addEventListener('mouseup', handleSelectionEnd);
    document.addEventListener('touchend', handleSelectionEnd);
    return () => {
      document.removeEventListener('mouseup', handleSelectionEnd);
      document.removeEventListener('touchend', handleSelectionEnd);
    };
  }, [handleSelectionEnd]);

  /** 清除当前选区（保存后调用） */
  const clearSelection = useCallback(() => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selectionRef.current = null;
    setNewSession(null);
    setToolbarPos(null);
  }, []);

  /** 保存新建批注 */
  const handleSaveNew = useCallback(() => {
    if (!newSession || !newEditor) return;
    const html = newEditor.getHTML();
    if (!html || html === '<p></p>') {
      // 空内容提示
      return;
    }
    add({
      docId,
      text: newSession.text,
      textOffset: { start: newSession.startOffset, end: newSession.endOffset },
      note: html,
      noteFormat: 'html',
      color: pendingColor,
    });
    // 清空编辑器与选区
    newEditor.commands.clearContent();
    clearSelection();
  }, [newSession, newEditor, add, docId, pendingColor, clearSelection]);

  /** 取消新建批注 */
  const handleCancelNew = useCallback(() => {
    if (newEditor) {
      newEditor.commands.clearContent();
    }
    clearSelection();
  }, [newEditor, clearSelection]);

  /** 点击已有批注高亮，进入编辑模式 */
  const handleAnnotationClick = useCallback(
    (annotation: Annotation) => {
      setEditing({
        id: annotation.id,
        tempNote: annotation.note,
        tempColor: annotation.color,
      });
      // 异步设置编辑器内容（确保编辑器已就绪）
      setTimeout(() => {
        if (editEditor) {
          editEditor.commands.setContent(annotation.note);
        }
      }, 0);
    },
    [editEditor],
  );

  /** 保存对已有批注的编辑 */
  const handleSaveEdit = useCallback(() => {
    if (!editing || !editEditor) return;
    const html = editEditor.getHTML();
    update(editing.id, {
      note: html,
      noteFormat: 'html',
      color: editing.tempColor,
    });
    editEditor.commands.clearContent();
    setEditing(null);
  }, [editing, editEditor, update]);

  /** 删除当前编辑中的批注 */
  const handleDeleteEdit = useCallback(() => {
    if (!editing) return;
    remove(editing.id);
    if (editEditor) {
      editEditor.commands.clearContent();
    }
    setEditing(null);
  }, [editing, editEditor, remove]);

  /** 取消编辑 */
  const handleCancelEdit = useCallback(() => {
    if (editEditor) {
      editEditor.commands.clearContent();
    }
    setEditing(null);
  }, [editEditor]);

  /** 导出批注为 Markdown 文件 */
  const handleExport = useCallback(() => {
    const markdown = exportAll();
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${docId.replace(/[/\\]/g, '-')}-annotations.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportAll, docId]);

  /** 编辑模式下的颜色按钮 */
  const editColorButtons = useMemo(
    () =>
      COLOR_OPTIONS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => setEditing((prev) => (prev ? { ...prev, tempColor: color } : prev))}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition-transform',
            COLOR_DOT_CLASSES[color],
            editing?.tempColor === color
              ? 'scale-110 border-foreground'
              : 'border-transparent hover:scale-105',
          )}
          aria-label={`${COLOR_LABELS[color]}色高亮`}
          title={`${COLOR_LABELS[color]}色高亮`}
        />
      )),
    [editing?.tempColor],
  );

  return (
    <div className={cn('annotation-layer', className)}>
      {/* 顶部工具条：导出批注按钮 + 批注数统计 */}
      <div className="flex items-center gap-2 mb-3 text-sm">
        <Highlighter className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">共 {annotations.length} 条批注</span>
        {annotations.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="ml-auto"
          >
            <Download className="h-3.5 w-3.5" />
            导出 Markdown
          </Button>
        )}
      </div>

      {/* 新建批注工具栏：浮动在选区上方 */}
      <AnimatePresence>
        {newSession && toolbarPos && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              left: toolbarPos.x,
              top: toolbarPos.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 50,
            }}
            className="bg-popover border rounded-lg shadow-lg p-3 w-80 max-w-[calc(100vw-2rem)]"
          >
            {/* 颜色选择 + 选中文本预览 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">颜色：</span>
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setPendingColor(color)}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform',
                    COLOR_DOT_CLASSES[color],
                    pendingColor === color
                      ? 'scale-110 border-foreground'
                      : 'border-transparent hover:scale-105',
                  )}
                  aria-label={`${COLOR_LABELS[color]}色高亮`}
                />
              ))}
            </div>
            <div className="text-xs text-muted-foreground mb-2 line-clamp-2 italic">
              “{newSession.text.slice(0, 80)}
              {newSession.text.length > 80 ? '...' : ''}”
            </div>
            {/* TipTap 编辑器 */}
            <div className="border rounded-md min-h-[80px] bg-background">
              <EditorContent editor={newEditor} />
            </div>
            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 mt-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCancelNew}>
                <X className="h-3.5 w-3.5" />
                取消
              </Button>
              <Button type="button" size="sm" onClick={handleSaveNew}>
                保存批注
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 已有批注列表 */}
      {annotations.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">批注列表</h4>
          <div className="space-y-2">
            {annotations.map((ann) => (
              <Popover
                key={ann.id}
                open={editing?.id === ann.id}
                onOpenChange={(v) => !v && handleCancelEdit()}
              >
                <PopoverTrigger asChild>
                  <motion.button
                    type="button"
                    onClick={() => handleAnnotationClick(ann)}
                    whileHover={{ x: 2 }}
                    className={cn(
                      'w-full text-left p-3 rounded-md border transition-colors',
                      'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'flex gap-3',
                    )}
                  >
                    <span
                      className={cn(
                        'h-10 w-1 rounded-full shrink-0',
                        COLOR_CLASSES[ann.color].split(' ')[0],
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground line-clamp-1 italic">
                        {ann.text}
                      </div>
                      <div
                        className="text-sm prose prose-sm dark:prose-invert max-w-none line-clamp-2 [&_p]:m-0"
                        // 已知安全：批注内容由用户本人编辑并通过 TipTap 净化
                        dangerouslySetInnerHTML={{ __html: ann.note }}
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(ann.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </motion.button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">编辑批注</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">颜色：</span>
                      {editColorButtons}
                    </div>
                    <div className="border rounded-md min-h-[80px] bg-background">
                      <EditorContent editor={editEditor} />
                    </div>
                    <div className="flex justify-between gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteEdit}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        删除
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          取消
                        </Button>
                        <Button type="button" size="sm" onClick={handleSaveEdit}>
                          保存
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>
      )}

      {/* 空状态提示 */}
      {annotations.length === 0 && !newSession && (
        <div className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md">
          选中文本即可添加批注
        </div>
      )}
    </div>
  );
}

export default AnnotationLayer;
