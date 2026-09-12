/**
 * 预览运行时 Hook（use-preview-runtime）
 * =============================================================================
 * 从 FrontendLab 拆出的预览域状态机（纯代码搬移，行为与拆分前一致）：
 * - 预览文档（iframe srcdoc）与运行计数（key 强制刷新）
 * - 自动运行（防抖 600ms）：内容字段变化后延迟重建
 * - 全局快捷键 Ctrl/Cmd + Enter 手动运行
 * - 控制台消息：监听预览 iframe 回传，上限 200 条
 * - resetPreview：换作品/新建/打开作品时的预览重置统一入口
 * =============================================================================
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildPreviewDoc, parsePreviewMessage } from './pg-frontend-runtime';
import type { ConsoleEntry, FrontendPen } from './types';

/** 自动运行防抖时长（毫秒） */
const AUTORUN_MS = 600;
/** 控制台日志条数上限 */
const CONSOLE_LIMIT = 200;

/** Hook 入参 */
interface UsePreviewRuntimeOptions {
  /** 当前编辑中的作品（内容变化触发自动运行） */
  pen: FrontendPen;
}

/** Hook 返回值 */
interface UsePreviewRuntimeResult {
  /** 预览文档（srcdoc 内容） */
  previewDoc: string;
  /** 手动运行计数（作为 iframe key 强制刷新） */
  runId: number;
  /** 控制台日志 */
  consoleEntries: ConsoleEntry[];
  /** 清空控制台（工具栏按钮消费） */
  setConsoleEntries: React.Dispatch<React.SetStateAction<ConsoleEntry[]>>;
  /** iframe 引用（用于控制台消息来源校验） */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** 手动运行：立即重建预览并强制刷新 iframe */
  handleRun: () => void;
  /** 重置预览：换作品/新建时重建文档、刷新 iframe 并清空控制台 */
  resetPreview: (pen: FrontendPen) => void;
}

/**
 * 预览运行时：文档构建、自动/手动运行与控制台消息桥接
 */
export function usePreviewRuntime({ pen }: UsePreviewRuntimeOptions): UsePreviewRuntimeResult {
  /** 预览文档（srcdoc 内容） */
  const [previewDoc, setPreviewDoc] = useState<string>(() => buildPreviewDoc(pen));
  /** 手动运行计数（作为 iframe key 强制刷新） */
  const [runId, setRunId] = useState(0);
  /** 控制台日志 */
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  /** iframe 引用（用于控制台消息来源校验） */
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  /** 自动运行（防抖）：内容变化后延迟重建预览。
   * content 仅含内容字段且随字段变化更新身份——标题等元数据变化
   * 不会触发预览重建，依赖数组与实际读取面一致 */
  const previewContent = useMemo(
    () => ({ html: pen.html, css: pen.css, js: pen.js }),
    [pen.html, pen.css, pen.js],
  );
  useEffect(() => {
    if (!pen.autoRun) return;
    const timer = setTimeout(() => {
      setPreviewDoc(buildPreviewDoc(previewContent));
      setRunId((n) => n + 1);
    }, AUTORUN_MS);
    return () => clearTimeout(timer);
  }, [previewContent, pen.autoRun]);

  /** 全局快捷键：Ctrl/Cmd + Enter 运行预览 */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setPreviewDoc(buildPreviewDoc(pen));
        setRunId((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pen]);

  /** 监听预览 iframe 回传的控制台消息 */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const entry = parsePreviewMessage(e, iframeRef.current?.contentWindow ?? null);
      if (!entry) return;
      setConsoleEntries((prev) => [...prev.slice(-(CONSOLE_LIMIT - 1)), entry]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /** 手动运行：立即重建预览并强制刷新 iframe */
  const handleRun = useCallback(() => {
    setPreviewDoc(buildPreviewDoc(pen));
    setRunId((n) => n + 1);
  }, [pen]);

  /** 重置预览：换作品/新建时重建文档、刷新 iframe 并清空控制台 */
  const resetPreview = useCallback((next: FrontendPen) => {
    setPreviewDoc(buildPreviewDoc(next));
    setRunId((n) => n + 1);
    setConsoleEntries([]);
  }, []);

  return {
    previewDoc,
    runId,
    consoleEntries,
    setConsoleEntries,
    iframeRef,
    handleRun,
    resetPreview,
  };
}
