/**
 * 知识地图组件 (KnowledgeMap)
 * ===========================
 * 功能概述：
 * - 接收服务端预构建的 KnowledgeMap 数据，客户端渲染为 Mermaid 图
 * - 支持缩放（鼠标滚轮 + 按钮）、拖拽平移、节点点击跳转
 * - 响应暗色模式切换（监听 data-theme 属性变化，重新渲染）
 * - 加载中显示 spinner，错误时显示友好提示
 * - 节点点击后跳转到对应模块或文档页面
 *
 * 数据流：
 * - 父级 Astro 页面在服务端调用 knowledge-map-service 获取 KnowledgeMap
 * - 通过 props 传入 map 数据与 baseUrl
 * - 组件内部调用 toMermaidGraph 生成 Mermaid 语法字符串
 * - 通过 external-loader 加载 Mermaid 后渲染为 SVG
 * - 用户交互（缩放/拖拽/点击）由本地状态控制
 *
 * 事件处理：
 * - 鼠标滚轮：缩放 SVG（以鼠标位置为中心）
 * - 鼠标按下 + 移动：拖拽平移
 * - 节点点击：根据节点 ID 跳转到对应 URL
 * - 主题切换：监听 data-theme 变化重新渲染
 *
 * 使用场景：
 * - 模块知识地图页 /module/map/
 * - 全局知识地图页 /map/
 */

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { loadMermaid, loadDOMPurify } from '@/lib/external-loader';
import '@/styles/islands/KnowledgeMap.css';

// ========== 类型定义（内联以避免客户端岛屿间接导入 astro:content） ==========
/** 节点类型：模块节点或文档节点 */
type MapNodeType = 'module' | 'doc';
/** 难度等级 */
type MapDifficulty = 'beginner' | 'intermediate' | 'advanced';
/** 知识地图节点 */
interface MapNode {
  id: string;
  label: string;
  type: MapNodeType;
  module: string;
  difficulty?: MapDifficulty;
  tags?: string[];
}
/** 知识地图边 */
interface MapEdge {
  from: string;
  to: string;
  type: 'prerequisite' | 'related';
}
/** 知识地图完整结构 */
interface KnowledgeMapData {
  nodes: MapNode[];
  edges: MapEdge[];
}

/**
 * 组件属性
 * @prop map - 服务端预构建的知识地图数据（用于节点点击跳转映射）
 * @prop graphSource - 服务端预生成的 Mermaid 语法字符串（避免客户端导入 astro:content）
 * @prop baseUrl - 站点基础路径（用于生成节点跳转 URL，包含尾部斜杠）
 * @prop scope - 地图范围标识，仅用于错误提示文案与 a11y 标签
 */
interface KnowledgeMapProps {
  /** 服务端预构建的知识地图数据（用于节点点击跳转映射） */
  map: KnowledgeMapData;
  /** 服务端预生成的 Mermaid 语法字符串 */
  graphSource: string;
  /** 站点基础路径（含尾部斜杠，如 /FANDEX-web/） */
  baseUrl: string;
  /** 地图范围：'global' | 'module' | 'doc'，用于 a11y 与错误提示 */
  scope: 'global' | 'module' | 'doc';
}

/** 拖拽起始坐标（用于计算偏移量） */
interface DragStart {
  x: number;
  y: number;
  originX: number;
  originY: number;
}

export function KnowledgeMap({ map, graphSource, baseUrl, scope }: KnowledgeMapProps) {
  // ========== 响应式状态 ==========

  /** 渲染容器引用 */
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** SVG 容器引用（用于变换操作） */
  const svgWrapperRef = useRef<HTMLDivElement | null>(null);

  /** 加载状态：'loading' | 'rendered' | 'error' */
  const [status, setStatus] = useState<'loading' | 'rendered' | 'error'>('loading');

  /** 错误信息（status === 'error' 时展示） */
  const [errorMsg, setErrorMsg] = useState<string>('');

  /** 当前缩放比例（1 = 原始大小） */
  const [scale, setScale] = useState<number>(1);
  /** 当前平移 X 偏移（px） */
  const [translateX, setTranslateX] = useState<number>(0);
  /** 当前平移 Y 偏移（px） */
  const [translateY, setTranslateY] = useState<number>(0);

  /** 是否正在拖拽 */
  const [isDragging, setIsDragging] = useState<boolean>(false);

  /** 拖拽起始坐标（用于计算偏移量） */
  const [dragStart, setDragStart] = useState<DragStart>({
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
  });

  /** 当前主题（用于 Mermaid 重新渲染） */
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>('light');

  /** 主题变化 observer */
  const themeObserverRef = useRef<MutationObserver | null>(null);

  // ========== 计算属性 ==========

  /** SVG wrapper 的 transform 字符串 */
  const transformStyle = useMemo(
    () => `translate(${translateX}px, ${translateY}px) scale(${scale})`,
    [translateX, translateY, scale]
  );

  /**
   * 构建节点跳转 URL
   * - 模块节点：跳转到 /moduleId/
   * - 文档节点：跳转到 /moduleId/slug/
   * @param node - 节点对象
   * @returns 跳转 URL
   */
  const buildNodeUrl = useCallback(
    (node: MapNode): string => {
      if (node.type === 'module') {
        return `${baseUrl}${node.id}/`;
      }
      // 文档节点 ID 格式为 `moduleId/slug`
      return `${baseUrl}${node.id}/`;
    },
    [baseUrl]
  );

  /** 节点 ID → 跳转 URL 的映射表 */
  const nodeUrlMap = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const node of map.nodes) {
      m.set(node.id, buildNodeUrl(node));
    }
    return m;
  }, [map, buildNodeUrl]);

  /** 节点数量（用于空状态判断） */
  const nodeCount = useMemo<number>(() => map.nodes.length, [map]);

  /** 空状态文案（根据 scope 给出更具体的提示） */
  const emptyText = useMemo<string>(() => {
    switch (scope) {
      case 'module':
        return '该模块暂无知识地图数据';
      case 'doc':
        return '该文档暂无前置或关联文档';
      case 'global':
      default:
        return '暂无知识地图数据';
    }
  }, [scope]);

  // ========== 渲染方法 ==========

  /**
   * 为 SVG 中的节点绑定点击事件
   * Mermaid 渲染的节点为 <g class="node"> 或 <g class="node default">，
   * 内部包含一个 <text> 元素显示 label，节点 ID 通过 data-id 或在 g.node 上
   * 通过 id 属性的前缀匹配
   *
   * 由于 Mermaid 生成的 SVG 节点 ID 可能含特殊字符，这里采用通用策略：
   * 遍历所有 g.node 元素，读取其 id（Mermaid 会以 "flowchart-<NodeID>-N" 命名），
   * 反查 nodeUrlMap，命中则绑定 click 跳转
   *
   * 节点 ID 反转义：toMermaidGraph 在 service 端将原始节点 ID 中的 `/` 转义为 `__`
   * （因 Mermaid 不允许 `/` 出现在节点 ID 中），此处需将 `__` 还原为 `/`，
   * 才能与 props.map.nodes 中的原始 ID 匹配，进而查到跳转 URL
   */
  const bindNodeClickHandlers = useCallback((): void => {
    if (!svgWrapperRef.current) return;
    const svg = svgWrapperRef.current.querySelector('svg');
    if (!svg) return;

    // Mermaid 生成的节点 <g> 通常带 class="node"，id 形如 "flowchart-<NodeID>-N"
    const nodeGroups = svg.querySelectorAll<SVGGElement>('g.node');
    nodeGroups.forEach((g) => {
      const rawId = g.getAttribute('id') || '';
      // 从 "flowchart-<NodeID>-N" 中提取 <NodeID>
      const match = rawId.match(/^flowchart-(.+)-\d+$/);
      if (!match) return;
      // noUncheckedIndexedAccess：match[1] 类型为 string | undefined，已通过 !match 排除
      // 将 Mermaid 安全 ID 中的 `__` 还原为 `/`，对应 toMermaidGraph 中的转义
      const mermaidId = match[1] || '';
      const nodeId = mermaidId.replace(/__/g, '/');
      const url = nodeUrlMap.get(nodeId);
      if (!url) return;

      // 设置 cursor 与 role，提示可点击
      g.style.cursor = 'pointer';
      g.setAttribute('role', 'link');
      g.setAttribute('tabindex', '0');
      g.setAttribute('aria-label', `跳转到节点 ${nodeId}`);

      // 点击跳转
      g.addEventListener('click', (e: MouseEvent) => {
        e.preventDefault();
        window.location.href = url;
      });
      // 键盘 Enter 跳转（a11y）
      g.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.location.href = url;
        }
      });
    });
  }, [nodeUrlMap]);

  /**
   * 渲染知识地图
   * 核心执行流程：
   *   1. 加载 Mermaid 库（已缓存则跳过实际加载）
   *   2. 调用 mermaid.initialize 配置主题
   *   3. 调用 mermaid.render 生成 SVG 字符串
   *   4. 将 SVG 插入容器，并绑定节点点击事件
   * 异常时设置错误状态，展示友好提示
   */
  const renderMap = useCallback(async (): Promise<void> => {
    if (nodeCount === 0) {
      setStatus('rendered');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    try {
      // 通过 external-loader 加载 Mermaid（已缓存则立即返回）
      await loadMermaid();
      const mermaid = window.mermaid;
      if (!mermaid) {
        throw new Error('Mermaid 加载后未在 window 上找到');
      }

      // 每次渲染都重新 initialize，确保主题正确
      mermaid.initialize({
        startOnLoad: false,
        theme: currentTheme === 'dark' ? 'dark' : 'default',
        securityLevel: 'loose',
      });

      const code = graphSource;
      const id = `kmap-svg-${Date.now()}`;
      const { svg } = await mermaid.render(id, code);

      // 等待 DOM 更新后插入 SVG
      // 安全策略：Mermaid securityLevel 为 loose，SVG 须经过 DOMPurify 消毒后再注入 DOM，
      // 防止 Mermaid 渲染产物中潜在的恶意内容触发 XSS。
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      if (svgWrapperRef.current) {
        try {
          await loadDOMPurify();
          const purify = window.DOMPurify;
          // DOMPurify 可用时消毒 SVG；不可用时降级为 textContent 显示源码，禁止注入未消毒 SVG
          if (purify) {
            svgWrapperRef.current.innerHTML = purify.sanitize(svg);
          } else {
            svgWrapperRef.current.textContent = '知识地图渲染失败：DOMPurify 不可用';
            setStatus('error');
            return;
          }
        } catch {
          // DOMPurify 加载失败：显示错误，不注入未消毒 SVG
          svgWrapperRef.current.textContent = '知识地图渲染失败：DOMPurify 加载失败';
          setStatus('error');
          return;
        }
        bindNodeClickHandlers();
        // 重置变换
        setScale(1);
        setTranslateX(0);
        setTranslateY(0);
      }

      setStatus('rendered');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }, [nodeCount, currentTheme, graphSource, bindNodeClickHandlers]);

  /**
   * 设置主题变化监听
   * 通过 MutationObserver 监听 <html> 的 data-theme 属性变化
   * 主题切换时重新渲染 Mermaid 以应用对应配色
   */
  const setupThemeObserver = useCallback((): void => {
    themeObserverRef.current = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-theme') {
          const newTheme =
            document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
          if (newTheme !== currentTheme) {
            setCurrentTheme(newTheme);
            // 主题变化后重新渲染（currentTheme 更新后由 useEffect 触发 renderMap）
          }
        }
      }
    });
    themeObserverRef.current.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
  }, [currentTheme]);

  // ========== 生命周期 ==========

  // 挂载：读取初始主题 + 设置 observer + 渲染
  useEffect(() => {
    // 读取初始主题
    setCurrentTheme(
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    );
    setupThemeObserver();

    return () => {
      if (themeObserverRef.current) {
        themeObserverRef.current.disconnect();
        themeObserverRef.current = null;
      }
    };
    // 仅在挂载/卸载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 主题变化或 map 数据变化时重新渲染
  useEffect(() => {
    void renderMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, map]);

  // ========== 缩放与拖拽 ==========

  /**
   * 鼠标滚轮缩放
   * 以鼠标位置为缩放中心，调整 translateX/Y 以保持鼠标点不动
   * @param e - 鼠标滚轮事件
   */
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>): void => {
    if (!containerRef.current) return;
    e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 缩放因子：向下滚动缩小，向上滚动放大
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    setScale((prevScale) => {
      const newScale = Math.min(Math.max(prevScale * delta, 0.2), 5);
      const scaleRatio = newScale / prevScale;
      // 调整 translate 以鼠标位置为缩放中心
      setTranslateX((prevX) => mouseX - (mouseX - prevX) * scaleRatio);
      setTranslateY((prevY) => mouseY - (mouseY - prevY) * scaleRatio);
      return newScale;
    });
  }, []);

  /** 放大按钮 */
  const zoomIn = useCallback((): void => {
    setScale((s) => Math.min(s * 1.2, 5));
  }, []);

  /** 缩小按钮 */
  const zoomOut = useCallback((): void => {
    setScale((s) => Math.max(s / 1.2, 0.2));
  }, []);

  /** 重置缩放与平移 */
  const zoomReset = useCallback((): void => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  /**
   * 鼠标按下：开始拖拽
   * @param e - 鼠标事件
   */
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (e.button !== 0) return;
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        originX: translateX,
        originY: translateY,
      });
    },
    [translateX, translateY]
  );

  /**
   * 鼠标移动：拖拽平移
   * @param e - 鼠标事件
   */
  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      if (!isDragging) return;
      setTranslateX(dragStart.originX + (e.clientX - dragStart.x));
      setTranslateY(dragStart.originY + (e.clientY - dragStart.y));
    },
    [isDragging, dragStart]
  );

  /** 鼠标松开：结束拖拽 */
  const onMouseUp = useCallback((): void => {
    setIsDragging(false);
  }, []);

  /** 鼠标离开容器：结束拖拽 */
  const onMouseLeave = useCallback((): void => {
    setIsDragging(false);
  }, []);

  /** 重新渲染按钮（错误状态下重试） */
  const retryRender = useCallback((): void => {
    void renderMap();
  }, [renderMap]);

  return (
    <div className="kmap-root">
      {/* 工具栏：缩放控制 + 重新渲染 */}
      {status === 'rendered' && nodeCount > 0 && (
        <div className="kmap-toolbar">
          <button className="kmap-btn" onClick={zoomOut} aria-label="缩小" title="缩小">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <span className="kmap-scale">{Math.round(scale * 100)}%</span>
          <button className="kmap-btn" onClick={zoomIn} aria-label="放大" title="放大">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            className="kmap-btn kmap-reset-btn"
            onClick={zoomReset}
            aria-label="重置视图"
            title="重置视图"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
          </button>
        </div>
      )}

      {/* 主渲染容器 */}
      <div
        className={`kmap-container${isDragging ? ' is-dragging' : ''}${
          nodeCount === 0 ? ' is-empty' : ''
        }`}
        ref={containerRef}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        {/* 加载中 spinner */}
        {status === 'loading' && (
          <div className="kmap-loading">
            <div className="kmap-spinner" aria-hidden="true"></div>
            <p className="kmap-loading-text">正在加载知识地图...</p>
          </div>
        )}

        {/* 错误状态 */}
        {status === 'error' && (
          <div className="kmap-error">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="kmap-error-title">知识地图渲染失败</p>
            <p className="kmap-error-detail">{errorMsg}</p>
            <button className="kmap-retry-btn" onClick={retryRender}>
              重试
            </button>
          </div>
        )}

        {/* 空状态 */}
        {status !== 'loading' && status !== 'error' && nodeCount === 0 && (
          <div className="kmap-empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            <p className="kmap-empty-text">{emptyText}</p>
          </div>
        )}

        {/* SVG 渲染区（可缩放/拖拽） */}
        <div
          style={{
            display: status === 'rendered' && nodeCount > 0 ? undefined : 'none',
            transform: transformStyle,
          }}
          className="kmap-svg-wrapper"
          ref={svgWrapperRef}
        ></div>
      </div>

      {/* 图例说明 */}
      {status === 'rendered' && nodeCount > 0 && (
        <div className="kmap-legend">
          <div className="kmap-legend-item">
            <span className="kmap-legend-swatch kmap-legend-module"></span>
            <span>模块</span>
          </div>
          <div className="kmap-legend-item">
            <span className="kmap-legend-swatch kmap-legend-beginner"></span>
            <span>入门</span>
          </div>
          <div className="kmap-legend-item">
            <span className="kmap-legend-swatch kmap-legend-intermediate"></span>
            <span>中级</span>
          </div>
          <div className="kmap-legend-item">
            <span className="kmap-legend-swatch kmap-legend-advanced"></span>
            <span>进阶</span>
          </div>
          <div className="kmap-legend-item">
            <span className="kmap-legend-line kmap-legend-line-solid"></span>
            <span>前置依赖</span>
          </div>
          <div className="kmap-legend-item">
            <span className="kmap-legend-line kmap-legend-line-dashed"></span>
            <span>关联</span>
          </div>
          <div className="kmap-legend-tip">
            <span>提示：滚轮缩放，拖拽平移，点击节点跳转</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeMap;
