/**
 * KnowledgeGraph 知识图谱力导向图组件（React Island）
 *
 * 功能概述：
 * - 基于 AntV G2 v5 内置 chart.forceGraph() 渲染力导向图
 * - 节点表示文档/模块，边表示前置依赖关系
 * - 节点状态着色：已读（success）/ 在读（warning）/ 未读（muted）
 * - 交互能力：缩放（按钮 + 滚轮） / 平移（拖拽） / 节点点击 / 全屏 Dialog
 * - 主题适配：根据 documentElement.classList 自动选择 dark/light 主题
 * - SSR 兼容：所有浏览器 API 调用前判断 typeof window
 * - 动态 import G2 避免打包体积过大
 *
 * 使用方式（Astro island）：
 *   <KnowledgeGraph
 *     client:visible
 *     nodes={[{ id: 'doc-1', label: '文档1', status: 'read' }]}
 *     links={[{ source: 'doc-1', target: 'doc-2' }]}
 *     id="kg-1"
 *   />
 *
 * 数据流：
 * 1. 初始渲染：显示"查看交互版"按钮
 * 2. 用户点击 → 动态 import G2 → 实例化 Chart → 调用 forceGraph()
 * 3. 渲染成功 → 显示画布 + 控制栏
 * 4. 渲染失败 → 显示错误信息 + 重试按钮
 * 5. 节点点击 → 触发 onNodeClick 回调（如跳转到文档页）
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

/** 力导向图节点数据 */
export interface KnowledgeNode {
  /** 节点唯一 ID */
  id: string;
  /** 节点显示标签 */
  label?: string;
  /** 节点分组（用于颜色映射） */
  group?: string;
  /** 节点状态：已读 / 在读 / 未读 */
  status?: 'read' | 'reading' | 'unread';
  /** 节点链接（点击跳转） */
  href?: string;
  /** 自定义大小 */
  value?: number;
}

/** 力导向图边数据 */
export interface KnowledgeLink {
  /** 起点节点 ID */
  source: string;
  /** 终点节点 ID */
  target: string;
  /** 边权重 */
  value?: number;
}

/** KnowledgeGraph 组件 Props */
export interface KnowledgeGraphProps {
  /** 节点数据数组 */
  nodes: KnowledgeNode[];
  /** 边数据数组 */
  links: KnowledgeLink[];
  /** 图表唯一 ID（用于容器选择器） */
  id: string;
  /** 额外类名 */
  className?: string;
  /** 是否自动加载（默认 false，需用户点击触发） */
  autoLoad?: boolean;
  /** 节点点击回调 */
  onNodeClick?: (node: KnowledgeNode) => void;
  /** 画布高度（px，默认 360） */
  height?: number;
  /**
   * 阅读进度本地存储键名
   * 传入后组件将自动从 localStorage 读取进度，并按 href 匹配更新节点 status
   * 默认 'fandex-progress'（与 FANDEX-exe 阅读进度存储键一致）
   */
  progressStorageKey?: string;
}

/** 渲染状态 */
type RenderStatus = 'idle' | 'loading' | 'success' | 'error';

/** 缩放限制 */
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.15;

/** 状态颜色映射（对齐 FANDEX-Web 语义色） */
const STATUS_COLOR_MAP: Record<string, string> = {
  read: '#10b981', // success-500 emerald
  reading: '#f59e0b', // warning-500 amber
  unread: '#94a3b8', // muted slate-400
};

/**
 * 检测当前是否为暗色主题
 */
function isDarkMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}

/**
 * 根据节点状态获取颜色
 * 优先级：status > group > 默认
 */
function getNodeColor(node: KnowledgeNode): string {
  if (node.status && STATUS_COLOR_MAP[node.status]) {
    return STATUS_COLOR_MAP[node.status];
  }
  return '#0ea5e9'; // primary sky-500
}

/**
 * 从 localStorage 读取阅读进度映射表
 *
 * 兼容两种存储格式：
 * - { state: { progress: Record<slug, { status?: string }> } }（Zustand persist）
 * - { progress: Record<slug, { status?: string }> }（直接对象）
 *
 * @param storageKey - localStorage 键名
 * @returns slug → status 映射
 */
function readProgressMap(storageKey: string): Record<string, { status?: string }> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as {
      state?: { progress?: Record<string, { status?: string }> };
      progress?: Record<string, { status?: string }>;
    };
    return parsed.state?.progress ?? parsed.progress ?? {};
  } catch {
    return {};
  }
}

/**
 * 根据节点 href 提取进度 slug
 * 觢则：去除 base path 与首尾斜杠，得到如 `javascript/概述`
 *
 * @param href - 节点 href（已包含 base path）
 * @returns 进度 slug
 */
function hrefToProgressSlug(href: string | undefined): string {
  if (!href) return '';
  try {
    const url = new URL(href, window.location.origin);
    let p = url.pathname;
    // 去除首尾斜杠
    p = p.replace(/^\/+|\/+$/g, '');
    return p;
  } catch {
    return href.replace(/^\/+|\/+$/g, '');
  }
}

/**
 * KnowledgeGraph 知识图谱力导向图组件
 */
export function KnowledgeGraph({
  nodes,
  links,
  id,
  className,
  autoLoad = false,
  onNodeClick,
  height = 360,
  progressStorageKey = 'fandex-progress',
}: KnowledgeGraphProps) {
  // 渲染状态
  const [status, setStatus] = useState<RenderStatus>('idle');
  // 错误信息
  const [errorMessage, setErrorMessage] = useState<string>('');
  // 缩放
  const [zoom, setZoom] = useState(1);
  // 全屏 Dialog
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // 当前主题（用于 G2 主题切换）
  const { theme } = useTheme();

  // 容器 ref（普通视图）
  const containerRef = useRef<HTMLDivElement>(null);
  // 全屏容器 ref
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  // G2 Chart 实例 ref（普通视图）
  const chartRef = useRef<unknown>(null);
  // G2 Chart 实例 ref（全屏视图）
  const fullscreenChartRef = useRef<unknown>(null);

  /**
   * 渲染 G2 力导向图
   *
   * 实现说明：
   * - 动态 import G2 避免打包体积过大
   * - 实例化 Chart，指定 container / theme / autoFit
   * - 调用 chart.forceGraph() 创建力导向图 mark
   * - 通过 encode('nodeXxx') / encode('linkXxx') 配置节点与边
   * - 通过 nodeLabels 配置节点标签
   * - 调用 chart.render() 完成渲染
   */
  const renderChart = useCallback(
    async (targetContainer: HTMLDivElement | null, isFullscreen = false) => {
      if (!targetContainer || status === 'loading') return;

      if (!isFullscreen) setStatus('loading');
      setErrorMessage('');

      try {
        // 动态导入 G2
        const g2Module = await import('@antv/g2');
        const Chart = g2Module.Chart;

        // 销毁旧实例
        const oldRef = isFullscreen ? fullscreenChartRef : chartRef;
        if (oldRef.current) {
          try {
            // @ts-expect-error - G2 Chart 实例的 destroy 方法
            oldRef.current.destroy();
          } catch {
            // 静默失败
          }
          oldRef.current = null;
        }

        // 准备数据：为节点添加颜色字段
        // 同时从 localStorage 读取阅读进度，按 href 匹配更新节点 status
        const progressMap = readProgressMap(progressStorageKey);
        const nodesData = nodes.map((n) => {
          // 优先使用 localStorage 中的进度状态，其次使用节点传入的 status
          const progressSlug = hrefToProgressSlug(n.href);
          const progressEntry = progressSlug ? progressMap[progressSlug] : undefined;
          const resolvedStatus: KnowledgeNode['status'] =
            progressEntry?.status === 'read' || progressEntry?.status === 'reading'
              ? progressEntry.status
              : (n.status ?? 'unread');
          const nodeWithStatus: KnowledgeNode = { ...n, status: resolvedStatus };
          return {
            id: n.id,
            label: n.label ?? n.id,
            group: n.group ?? 'default',
            status: resolvedStatus,
            value: n.value ?? 5,
            color: getNodeColor(nodeWithStatus),
            href: n.href,
          };
        });

        const linksData = links.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value ?? 1,
        }));

        // 根据当前主题选择 G2 主题
        const g2Theme = isDarkMode() ? 'classicDark' : 'classic';

        // 实例化 Chart
        const chart = new Chart({
          container: targetContainer,
          autoFit: true,
          theme: g2Theme,
          paddingLeft: 0,
          paddingRight: 0,
          paddingTop: 0,
          paddingBottom: 0,
        });

        // 配置力导向图
        chart
          .forceGraph()
          .data({
            nodes: nodesData,
            links: linksData,
          })
          // 布局参数
          .layout({
            joint: true,
            nodeStrength: -50,
            linkStrength: 0.1,
          })
          // 节点通道编码
          .encode('nodeColor', 'color')
          .encode('nodeSize', 'value')
          .encode('nodeShape', 'point')
          // 边通道编码
          .encode('linkColor', '#94a3b8')
          // 节点样式
          .style('node', {
            fillOpacity: 0.85,
            lineWidth: 1.5,
            stroke: isDarkMode() ? '#1f1f1f' : '#fff',
          })
          // 边样式
          .style('link', {
            stroke: isDarkMode() ? '#555' : '#cbd5e1',
            strokeOpacity: 0.5,
            lineWidth: 1,
          })
          // 节点标签
          // G2 v5 的 ForceGraphMark spec 中有 nodeLabels 字段，
          // 但 MarkNode 类未为该字段生成链式方法，通过 attr() 设置以保持类型安全
          .attr('nodeLabels', [
            {
              text: 'label',
              position: 'top',
              fill: isDarkMode() ? '#ddd' : '#475569',
              fontSize: 11,
              fontWeight: 500,
              dy: -4,
            },
          ])
          // 节点尺寸映射范围
          .scale('nodeSize', { range: [6, 18] })
          // 交互
          .interaction('elementHighlight', true)
          .interaction('tooltip', true);

        // 节点点击事件
        chart.on('element:click', (event: { data?: { data?: KnowledgeNode } }) => {
          const elementData = event.data?.data;
          if (elementData?.id) {
            onNodeClick?.(elementData as KnowledgeNode);
          }
        });

        chart.render();

        // 保存实例引用
        if (isFullscreen) {
          fullscreenChartRef.current = chart;
        } else {
          chartRef.current = chart;
          setStatus('success');
          setZoom(1);
        }

        logger.info(`[knowledge-graph] rendered chart ${id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(msg);
        if (!isFullscreen) setStatus('error');
        logger.error(`[knowledge-graph] render failed for ${id}:`, err);
      }
    },
    [nodes, links, id, status, onNodeClick],
  );

  // 自动加载
  useEffect(() => {
    if (autoLoad && status === 'idle' && containerRef.current) {
      void renderChart(containerRef.current);
    }
  }, [autoLoad, status, renderChart]);

  // 主题变化时重新渲染（仅在已渲染状态下）
  useEffect(() => {
    if (status === 'success' && theme) {
      const timer = window.setTimeout(() => {
        if (containerRef.current) {
          void renderChart(containerRef.current);
        }
      }, 300);
      return () => window.clearTimeout(timer);
    }
  }, [theme, status, renderChart]);

  // 监听阅读进度变化事件：重新渲染图表以更新节点状态颜色
  useEffect(() => {
    if (status !== 'success') return;
    const handleProgressChange = () => {
      if (containerRef.current) {
        void renderChart(containerRef.current);
      }
    };
    window.addEventListener('fandex-progress-change', handleProgressChange);
    return () => {
      window.removeEventListener('fandex-progress-change', handleProgressChange);
    };
  }, [status, renderChart]);

  // 全屏 Dialog 打开时渲染
  useEffect(() => {
    if (fullscreenOpen && fullscreenContainerRef.current) {
      // 延迟一帧确保 DOM 已挂载
      const timer = window.setTimeout(() => {
        if (fullscreenContainerRef.current) {
          void renderChart(fullscreenContainerRef.current, true);
        }
      }, 100);
      return () => window.clearTimeout(timer);
    }
  }, [fullscreenOpen, renderChart]);

  // 组件卸载时销毁实例
  useEffect(() => {
    return () => {
      [chartRef, fullscreenChartRef].forEach((ref) => {
        if (ref.current) {
          try {
            // @ts-expect-error - G2 Chart 实例的 destroy 方法
            ref.current.destroy();
          } catch {
            // 静默失败
          }
          ref.current = null;
        }
      });
    };
  }, []);

  /** 缩放控制（通过 G2 canvas API） */
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
    // G2 v5 缩放需通过 renderer 调用，简化处理：重新设置 canvas transform
    applyZoom(zoom + ZOOM_STEP);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
    applyZoom(zoom - ZOOM_STEP);
  }, [zoom]);

  const handleReset = useCallback(() => {
    setZoom(1);
    applyZoom(1);
  }, []);

  /** 应用缩放到 G2 canvas */
  function applyZoom(targetZoom: number): void {
    const container = containerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    canvas.style.transform = `scale(${targetZoom})`;
    canvas.style.transformOrigin = 'center center';
    canvas.style.transition = 'transform 0.15s ease-out';
  }

  /** 滚轮缩放 */
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = zoom - e.deltaY * 0.001;
      const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
      setZoom(clamped);
      applyZoom(clamped);
    },
    [zoom],
  );

  /** 全屏 Dialog 控制 */
  const handleOpenFullscreen = useCallback(() => setFullscreenOpen(true), []);
  const handleCloseFullscreen = useCallback(() => {
    // 销毁全屏 Chart 实例
    if (fullscreenChartRef.current) {
      try {
        // @ts-expect-error - G2 Chart 实例的 destroy 方法
        fullscreenChartRef.current.destroy();
      } catch {
        // 静默失败
      }
      fullscreenChartRef.current = null;
    }
    setFullscreenOpen(false);
  }, []);

  /** 下载 PNG（从 G2 canvas 导出） */
  const handleDownload = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas');
    if (!canvas) return;
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `knowledge-graph-${id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      logger.error('[knowledge-graph] download failed:', err);
    }
  }, [id]);

  return (
    <figure
      className={cn(
        'knowledge-graph relative overflow-hidden rounded-lg border bg-card',
        className,
      )}
    >
      {/* 顶部状态栏 */}
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>知识图谱</span>
          {status === 'loading' && (
            <span className="flex items-center gap-1">
              <Spinner className="h-3 w-3" />
              渲染中...
            </span>
          )}
          {status === 'success' && (
            <span className="text-success-600 dark:text-success-400">已渲染</span>
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
              aria-label="下载图片"
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
          {/* 初始状态：显示加载按钮 */}
          {status === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center gap-3 p-6"
              style={{ height }}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">点击下方按钮加载知识图谱力导向图</p>
                <p className="text-xs text-muted-foreground/70">
                  {nodes.length} 个节点 · {links.length} 条依赖关系
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => containerRef.current && renderChart(containerRef.current)}
                className="gap-1.5"
              >
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
              style={{ height }}
            >
              <Spinner className="h-8 w-8" />
              <p className="text-sm text-muted-foreground">正在加载 G2 引擎并渲染图表...</p>
            </motion.div>
          )}

          {/* 渲染成功：可缩放的 G2 canvas */}
          {status === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={containerRef}
              onWheel={handleWheel}
              className={cn(
                'relative w-full overflow-hidden bg-[radial-gradient(circle_at_center,hsl(var(--border)/0.3)_1px,transparent_1px)] [background-size:16px_16px]',
              )}
              style={{ height, touchAction: 'none' }}
            >
              {/* 拖拽提示 */}
              <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
                <Move className="h-3 w-3" aria-hidden="true" />
                滚轮缩放 · 点击节点跳转
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
              className="flex flex-col items-center justify-center gap-3 p-8"
              style={{ height }}
            >
              <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">渲染失败</p>
              <p className="max-w-md text-center text-xs text-muted-foreground">
                {errorMessage || '未知错误'}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => containerRef.current && renderChart(containerRef.current)}
                className="gap-1.5"
              >
                <RotateCcw className="h-4 w-4" />
                重试
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 全屏 Dialog */}
      <Dialog open={fullscreenOpen} onOpenChange={(open) => !open && handleCloseFullscreen()}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] overflow-hidden p-0">
          <DialogTitle className="sr-only">知识图谱全屏查看</DialogTitle>
          <DialogDescription className="sr-only">
            力导向图全屏视图，支持滚轮缩放与节点点击
          </DialogDescription>
          <div ref={fullscreenContainerRef} className="h-[80vh] w-full bg-card" />
        </DialogContent>
      </Dialog>
    </figure>
  );
}

export default KnowledgeGraph;
