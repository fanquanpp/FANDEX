/**
 * MermaidLazy Mermaid 图表懒加载组件（React Island）
 *
 * 功能概述：
 * - 初始显示图表源码占位 + "查看交互版"按钮
 * - 点击按钮动态 import mermaid，渲染为 SVG
 * - 加载状态：Spinner + 提示文案
 * - 错误处理：mermaid 加载失败 / 解析失败时显示友好提示
 * - 交互能力：缩放（按钮 + 滚轮） / 平移（拖拽） / 下载 SVG / 全屏查看
 * - 全屏查看基于 shadcn/ui Dialog
 * - SSR 兼容：所有浏览器 API 调用前判断 typeof window
 * - 主题适配：根据 documentElement.classList 自动选择 dark/light 主题
 *
 * 使用方式（Astro island）：
 *   <MermaidLazy client:visible chart={`graph TD\n  A --> B`} id="mermaid-1" />
 *
 * 数据流：
 * 1. 初始渲染：显示源码占位
 * 2. 用户点击"查看交互版" → 动态 import mermaid → 调用 mermaid.render()
 * 3. 渲染成功 → 显示 SVG + 控制栏
 * 4. 渲染失败 → 显示错误信息 + 重试按钮
 * 5. 用户操作缩放/平移/下载/全屏 → 更新 transform 状态 / 触发下载 / 打开 Dialog
 */

import {
  AlertTriangle,
  Download,
  Maximize2,
  Minus,
  Move,
  Plus,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/cn';
import { logger } from '@/lib/logger';

/** MermaidLazy 组件 Props 类型 */
export interface MermaidLazyProps {
  /** Mermaid 图表源码 */
  chart: string;
  /** 图表唯一 ID（用于 SVG 选择器，避免多图冲突） */
  id: string;
  /** 额外类名 */
  className?: string;
  /** 是否默认在可视后自动加载（默认 false，需用户点击） */
  autoLoad?: boolean;
  /** 初始缩放比例（默认 1） */
  initialZoom?: number;
}

/** 渲染状态 */
type RenderStatus = 'idle' | 'loading' | 'success' | 'error';

/** 平移偏移量 */
interface PanOffset {
  x: number;
  y: number;
}

/** 缩放限制 */
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

/**
 * 检测当前是否为暗色主题
 */
function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * MermaidLazy Mermaid 图表懒加载组件
 *
 * @param props.chart - Mermaid 图表源码
 * @param props.id - 图表唯一 ID
 * @param props.className - 外部类名
 * @param props.autoLoad - 是否自动加载
 * @param props.initialZoom - 初始缩放
 */
export function MermaidLazy({
  chart,
  id,
  className,
  autoLoad = false,
  initialZoom = 1,
}: MermaidLazyProps) {
  // 渲染状态
  const [status, setStatus] = useState<RenderStatus>('idle');
  // 渲染后的 SVG 字符串
  const [svgContent, setSvgContent] = useState<string>('');
  // 错误信息
  const [errorMessage, setErrorMessage] = useState<string>('');
  // 缩放
  const [zoom, setZoom] = useState(initialZoom);
  // 平移
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  // 全屏 Dialog
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // 当前主题（用于 mermaid 主题切换）
  const { theme } = useTheme();

  // 拖拽相关 ref
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  // SVG 容器 ref
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * 渲染 Mermaid 图表
   *
   * 实现说明：
   * - 动态 import mermaid 避免打包体积过大
   * - 调用 mermaid.initialize 设置主题
   * - 调用 mermaid.render 生成 SVG 字符串
   * - 注入到 DOM 后通过选择器获取 outerHTML
   */
  const renderChart = useCallback(async () => {
    if (status === 'loading') return;
    setStatus('loading');
    setErrorMessage('');

    try {
      // 动态导入 mermaid
      const mermaidModule = await import(/* @vite-ignore */ 'mermaid');
      const mermaid = mermaidModule.default;

      // 根据当前主题选择 mermaid 主题
      const mermaidTheme = isDarkMode() ? 'dark' : 'default';
      mermaid.initialize({
        startOnLoad: false,
        theme: mermaidTheme,
        securityLevel: 'loose',
        fontFamily: 'inherit',
      });

      // 渲染 SVG（mermaid.render 返回 { svg }）
      const renderId = `mermaid-${id}-${Date.now()}`;
      const { svg } = await mermaid.render(renderId, chart);
      setSvgContent(svg);
      setStatus('success');
      // 重置缩放和平移
      setZoom(initialZoom);
      setPan({ x: 0, y: 0 });
      logger.info(`[mermaid-lazy] rendered chart ${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg);
      setStatus('error');
      logger.error(`[mermaid-lazy] render failed for ${id}:`, err);
    }
  }, [chart, id, status, initialZoom]);

  // 自动加载（如启用）
  useEffect(() => {
    if (autoLoad && status === 'idle') {
      void renderChart();
    }
  }, [autoLoad, status, renderChart]);

  // 主题变化时重新渲染（仅在已渲染状态下）
  useEffect(() => {
    if (status === 'success' && theme) {
      // 主题切换后延迟重新渲染，避免频繁触发
      const timer = window.setTimeout(() => {
        void renderChart();
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [theme, status, renderChart]);

  /** 缩放控制 */
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  }, []);
  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  }, []);
  const handleReset = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  /** 滚轮缩放 */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => {
      const next = z - e.deltaY * 0.001;
      return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    });
  }, []);

  /** 拖拽平移：开始 */
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [pan],
  );

  /** 拖拽平移：移动 */
  const handleDragMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy,
      });
    },
    [isDragging],
  );

  /** 拖拽平移：结束 */
  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // 忽略 release 失败
    }
  }, []);

  /** 下载 SVG */
  const handleDownload = useCallback(() => {
    if (!svgContent) return;
    try {
      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mermaid-${id}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logger.error('[mermaid-lazy] download failed:', err);
    }
  }, [svgContent, id]);

  /** 复制源码 */
  const handleCopySource = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(chart);
    } catch {
      // 静默失败
    }
  }, [chart]);

  /** 全屏 Dialog 打开 */
  const handleOpenFullscreen = useCallback(() => setFullscreenOpen(true), []);
  /** 全屏 Dialog 关闭 */
  const handleCloseFullscreen = useCallback(() => setFullscreenOpen(false), []);

  // 渲染 SVG 的容器 transform
  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  return (
    <figure
      className={cn('mermaid-lazy relative overflow-hidden rounded-lg border bg-card', className)}
    >
      {/* 顶部状态栏 */}
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Mermaid 图表</span>
          {status === 'loading' && (
            <span className="flex items-center gap-1">
              <Spinner className="h-3 w-3" />
              渲染中...
            </span>
          )}
          {status === 'success' && (
            <span className="text-emerald-600 dark:text-emerald-400">已渲染</span>
          )}
          {status === 'error' && <span className="text-destructive">渲染失败</span>}
        </div>

        {/* 控制栏（仅在渲染成功时显示） */}
        {status === 'success' && (
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="h-6 w-6"
              aria-label="缩小"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-10 text-center text-[10px] tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="h-6 w-6"
              aria-label="放大"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleReset}
              className="h-6 w-6"
              aria-label="重置视图"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <div className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              className="h-6 w-6"
              aria-label="下载 SVG"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleOpenFullscreen}
              className="h-6 w-6"
              aria-label="全屏查看"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </figcaption>

      {/* 内容区 */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {/* 初始状态：显示源码占位 + 加载按钮 */}
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-6"
            >
              <pre className="w-full overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-xs text-muted-foreground">
                {chart}
              </pre>
              <Button type="button" size="sm" onClick={renderChart} className="gap-1.5">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                查看交互版
              </Button>
            </motion.div>
          )}

          {/* 加载中 */}
          {status === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-12"
            >
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">正在加载 Mermaid 引擎并渲染图表...</p>
            </motion.div>
          )}

          {/* 渲染成功：可缩放平移的 SVG */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              onWheel={handleWheel}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              className={cn(
                'relative h-80 w-full cursor-grab overflow-hidden bg-[radial-gradient(circle_at_center,hsl(var(--border)/0.3)_1px,transparent_1px)] [background-size:16px_16px]',
                isDragging && 'cursor-grabbing',
              )}
              style={{ touchAction: 'none' }}
            >
              <div
                className="absolute left-1/2 top-1/2 origin-center"
                style={{
                  transform: `${transform} translate(-50%, -50%)`,
                  transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              {/* 拖拽提示 */}
              <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
                <Move className="h-3 w-3" aria-hidden="true" />
                拖拽平移 · 滚轮缩放
              </div>
            </motion.div>
          )}

          {/* 渲染失败 */}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">图表渲染失败</p>
                <p className="mt-1 text-xs text-muted-foreground">请检查 Mermaid 语法是否正确</p>
              </div>
              {errorMessage && (
                <pre className="max-h-32 w-full overflow-auto rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                  {errorMessage}
                </pre>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={renderChart}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重试渲染
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySource}
                  className="gap-1.5"
                >
                  复制源码
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 全屏 Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] gap-0 p-0 sm:max-w-6xl">
          <DialogTitle className="sr-only">Mermaid 图表全屏查看</DialogTitle>
          <DialogDescription className="sr-only">
            全屏查看 Mermaid 图表，支持拖拽平移与滚轮缩放
          </DialogDescription>
          <div
            className="relative h-[80vh] w-full overflow-hidden bg-[radial-gradient(circle_at_center,hsl(var(--border)/0.3)_1px,transparent_1px)] [background-size:16px_16px]"
            onWheel={handleWheel}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            style={{ touchAction: 'none' }}
          >
            <div
              className="absolute left-1/2 top-1/2 origin-center"
              style={{
                transform: `${transform} translate(-50%, -50%)`,
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
            {/* 全屏模式下的控制栏 */}
            <div className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-background/80 p-1 backdrop-blur-sm">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= MIN_ZOOM}
                className="h-7 w-7"
                aria-label="缩小"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="h-7 w-7"
                aria-label="放大"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleReset}
                className="h-7 w-7"
                aria-label="重置"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-7 w-7"
                aria-label="下载 SVG"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleCloseFullscreen}
                className="h-7 w-7"
                aria-label="关闭全屏"
              >
                <Maximize2 className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </figure>
  );
}

export default MermaidLazy;
