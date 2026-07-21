/**
 * 全局初始化脚本（Phase 10）
 *
 * 功能概述：
 * - 集中处理页面级客户端初始化逻辑，替代散落在各 .astro 组件中的内联 script
 * - Service Worker 注册：PWA 离线支持
 * - 快捷键注册：Ctrl+K 搜索、Ctrl+/ 帮助、← → 上下篇导航
 * - 代码块复制按钮：为 <pre> 元素右上角注入复制按钮
 * - 术语提示初始化：为 .term-tip 元素绑定 hover/click 事件
 * - 代码运行器初始化：为可运行代码块添加运行按钮
 * - 图片懒加载：IntersectionObserver 替代 scroll 事件
 * - 外部链接安全：自动补充 rel="noopener noreferrer"
 * - Tauri 桌面端集成：检测 window.__TAURI__ 后注入原生菜单事件监听
 * - Astro 页面过渡钩子：astro:page-load 触发重新初始化
 *
 * 设计要点：
 * - 所有 DOM 操作显式类型断言，符合 TS strict 模式
 * - 使用 requestIdleCallback 调度非关键初始化，避免阻塞首屏
 * - IntersectionObserver 替代 scroll 监听，性能更优
 * - 兼容 Tauri 环境，不依赖 window.location.origin
 * - 通过 astro:page-load 事件兼容 Astro ClientRouter SPA 导航
 *
 * 使用方式：
 *   import '@/scripts/layout'; // 在 Astro 组件中导入即自动初始化
 *   或 import { initLayout } from '@/scripts/layout';
 *
 * 与 Layout.astro 的协作：
 * - Layout.astro 中现有的内联 initCopyButtons / initSidebarBackdrop 仍保留
 * - 本脚本提供更完整的初始化能力，可逐步替换 Layout.astro 内联逻辑
 */

import { runCode } from '@/lib/code-runner';
import { initDefaultShortcuts } from '@/lib/keyboard';
import { logger } from '@/lib/logger';
import { initTermTooltip } from '@/lib/term-tooltip';
import { isTauri } from '@/lib/url';

/** sessionStorage 键名：当前文档 slug（用于上下篇导航） */
const CURRENT_DOC_KEY = 'fandex-current-doc';

/** sessionStorage 键名：文档历史栈 */
const DOC_HISTORY_KEY = 'fandex-doc-history';

/** 图片懒加载 rootMargin（提前 200px 加载，改善体验） */
const LAZY_LOAD_ROOT_MARGIN = '200px';

/** 复制按钮反馈展示时长（毫秒） */
const COPY_FEEDBACK_DURATION = 2000;

/** 代码运行按钮反馈展示时长（毫秒） */
const RUN_FEEDBACK_DURATION = 5000;

/** 已注册的全局事件监听器标记，避免重复绑定 */
let layoutInitialized = false;

/** 图片懒加载 Observer 实例（模块级单例） */
let lazyImageObserver: IntersectionObserver | null = null;

/**
 * 注册 Service Worker
 *
 * 实现说明：
 * - 仅在生产环境注册（开发环境 SW 缓存会干扰 HMR）
 * - 路径基于 Astro BASE_URL 拼接，兼容 GitHub Pages 子路径
 * - Tauri 环境下 base 为 '/'，注册路径为 '/sw.js'
 * - 注册失败时静默降级到在线模式
 */
function registerServiceWorker(): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  // 开发环境跳过 SW 注册，避免缓存干扰 HMR
  if (import.meta.env.DEV) return;

  const base = import.meta.env.BASE_URL;
  const swUrl = `${base}sw.js`.replace(/\/+/g, '/');

  navigator.serviceWorker
    .register(swUrl)
    .then((reg) => {
      logger.debug('[layout] Service Worker registered:', reg.scope);
    })
    .catch((err) => {
      logger.warn('[layout] Service Worker registration failed:', err);
    });
}

/**
 * 初始化默认快捷键
 *
 * 注册的快捷键：
 * - Ctrl+K / Cmd+K：打开搜索（通过全局事件触发 SearchModal）
 * - Ctrl+/ / Cmd+/：打开快捷键帮助（通过全局事件触发 ShortcutHelp）
 * - g h：跳转首页
 * - g d：跳转仪表盘
 * - ← / →：上一篇 / 下一篇（基于 sessionStorage 记录的当前文档）
 */
function initShortcuts(): void {
  /** 触发全局事件，由 React 岛屿（SearchModal / ShortcutHelp）监听 */
  const openSearch = (): void => {
    document.dispatchEvent(new CustomEvent('fandex:open-search'));
  };

  const openHelp = (): void => {
    document.dispatchEvent(new CustomEvent('fandex:open-shortcut-help'));
  };

  /** 跳转到指定路径（兼容 Tauri） */
  const navigate = (path: string): void => {
    if (typeof window === 'undefined') return;
    window.location.href = path;
  };

  /** 上一篇 / 下一篇：基于 sessionStorage 中记录的当前 slug */
  const navigateDoc = (direction: 'prev' | 'next'): void => {
    try {
      const historyRaw = sessionStorage.getItem(DOC_HISTORY_KEY);
      if (!historyRaw) return;
      const history = JSON.parse(historyRaw) as string[];
      const current = sessionStorage.getItem(CURRENT_DOC_KEY);
      if (!current) return;
      const idx = history.indexOf(current);
      if (idx < 0) return;
      const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
      const target = history[targetIdx];
      if (target) {
        navigate(target);
      }
    } catch {
      /* sessionStorage 不可用时静默降级 */
    }
  };

  initDefaultShortcuts({
    onOpenSearch: openSearch,
    onOpenHelp: openHelp,
    onGoHome: () => navigate(import.meta.env.BASE_URL),
    onGoDashboard: () => navigate(`${import.meta.env.BASE_URL}dashboard/`),
    onPrevDoc: () => navigateDoc('prev'),
    onNextDoc: () => navigateDoc('next'),
  });
}

/**
 * 为代码块添加复制按钮
 *
 * 实现说明：
 * - 查找所有 <pre> 元素，跳过已注入复制按钮的（避免重复）
 * - 创建按钮并定位到代码块右上角
 * - 点击按钮复制 <code> 文本到剪贴板
 * - 优先使用 Clipboard API，降级到 execCommand
 * - 复制成功后图标切换为对勾，2 秒后恢复
 *
 * @param root - 查找根节点（默认 document.body）
 */
function initCodeCopyButtons(root: ParentNode = document.body): void {
  const preElements = root.querySelectorAll<HTMLPreElement>('pre');
  if (preElements.length === 0) return;

  preElements.forEach((pre) => {
    // 跳过已注入复制按钮的代码块
    if (pre.parentElement?.querySelector('.copy-btn')) return;

    // 确保父元素存在且为相对定位容器
    const wrapper = pre.parentElement;
    if (!wrapper) return;

    // 标记 wrapper 为 relative，使按钮 absolute 定位生效
    if (!wrapper.classList.contains('code-block')) {
      wrapper.classList.add('relative');
    }

    // 提取代码文本（优先 <code> 元素，回退到 pre.textContent）
    const codeEl = pre.querySelector('code');
    const getText = (): string => codeEl?.textContent ?? pre.textContent ?? '';

    /** 复制按钮 SVG 图标（剪贴板） */
    const COPY_ICON_SVG =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

    /** 复制成功 SVG 图标（对勾） */
    const CHECK_ICON_SVG =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'copy-btn absolute right-2 top-2 z-10 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    btn.setAttribute('aria-label', '复制代码');
    btn.innerHTML = COPY_ICON_SVG;

    btn.addEventListener('click', async () => {
      const text = getText();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        flashCopySuccess();
      } catch {
        // Clipboard API 不可用时降级到 execCommand
        fallbackCopy(text);
        flashCopySuccess();
      }
    });

    /** 复制成功反馈：切换图标 + 2 秒后恢复 */
    const flashCopySuccess = (): void => {
      btn.classList.add('text-emerald-500');
      btn.innerHTML = CHECK_ICON_SVG;
      window.setTimeout(() => {
        btn.classList.remove('text-emerald-500');
        btn.innerHTML = COPY_ICON_SVG;
      }, COPY_FEEDBACK_DURATION);
    };

    /** execCommand 降级复制方案 */
    const fallbackCopy = (text: string): void => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    };

    wrapper.appendChild(btn);
  });
}

/**
 * 初始化代码运行器
 *
 * 实现说明：
 * - 查找带 data-runnable="true" 的 <pre> 元素（构建时由 remark 插件标记）
 * - 为每个可运行代码块创建"运行"按钮
 * - 点击按钮在 Web Worker 沙箱中执行代码（调用 runCode API）
 * - 输出结果展示在代码块下方的输出面板
 * - 执行中显示 loading 状态，5 秒超时自动终止
 *
 * @param root - 查找根节点（默认 document.body）
 */
function initCodeRunners(root: ParentNode = document.body): void {
  const runnableBlocks = root.querySelectorAll<HTMLPreElement>('pre[data-runnable="true"]');
  if (runnableBlocks.length === 0) return;

  runnableBlocks.forEach((pre) => {
    // 跳过已注入运行按钮的代码块
    if (pre.parentElement?.querySelector('.run-btn')) return;

    const wrapper = pre.parentElement;
    if (!wrapper) return;

    // 识别代码语言（优先 data-lang，回退到 className 中的 language-xxx）
    const lang =
      pre.dataset.lang || pre.querySelector('code')?.className.match(/language-(\S+)/)?.[1] || 'js';
    const language = lang === 'ts' || lang === 'typescript' ? 'ts' : 'js';

    /** 运行按钮 SVG 图标（播放） */
    const RUN_ICON_SVG =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>';

    const runBtn = document.createElement('button');
    runBtn.type = 'button';
    runBtn.className =
      'run-btn absolute right-12 top-2 z-10 inline-flex h-7 items-center gap-1 rounded-md border border-border bg-background/80 px-2 text-[11px] font-medium text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
    runBtn.setAttribute('aria-label', '运行代码');
    runBtn.innerHTML = `${RUN_ICON_SVG}<span>运行</span>`;

    /** 输出面板（在代码块下方动态创建） */
    const outputPanel = document.createElement('div');
    outputPanel.className =
      'code-output mt-2 hidden rounded-md border border-border bg-muted/30 p-3 text-xs font-mono';
    outputPanel.setAttribute('aria-live', 'polite');
    wrapper.appendChild(outputPanel);

    runBtn.addEventListener('click', async () => {
      const codeEl = pre.querySelector('code');
      const code = codeEl?.textContent ?? pre.textContent ?? '';
      if (!code) return;

      // 切换到 loading 状态
      runBtn.disabled = true;
      runBtn.innerHTML = `${RUN_ICON_SVG}<span>运行中...</span>`;
      outputPanel.classList.remove('hidden');
      outputPanel.textContent = '正在执行...';

      try {
        const result = await runCode(code, language);

        // 渲染输出
        const outputLines: string[] = [];
        if (result.output) {
          outputLines.push(result.output);
        }
        if (result.error) {
          outputLines.push(`错误: ${result.error}`);
        }
        if (outputLines.length === 0) {
          outputLines.push('(无输出)');
        }
        outputLines.push(`--- 执行耗时: ${result.duration}ms ---`);

        outputPanel.textContent = outputLines.join('\n');
        outputPanel.classList.toggle('text-emerald-600', result.success);
        outputPanel.classList.toggle('text-red-600', !result.success);
      } catch (err) {
        outputPanel.textContent = `执行失败: ${err instanceof Error ? err.message : String(err)}`;
        outputPanel.classList.remove('text-emerald-600');
        outputPanel.classList.add('text-red-600');
      } finally {
        // 恢复按钮状态
        runBtn.disabled = false;
        runBtn.innerHTML = `${RUN_ICON_SVG}<span>运行</span>`;
        // 5 秒后自动隐藏输出面板
        window.setTimeout(() => {
          if (!runBtn.matches(':hover')) {
            outputPanel.classList.add('hidden');
          }
        }, RUN_FEEDBACK_DURATION);
      }
    });

    wrapper.appendChild(runBtn);
  });
}

/**
 * 初始化图片懒加载
 *
 * 实现说明：
 * - 查找所有带 data-src 属性的 <img> 元素
 * - 使用 IntersectionObserver 监听其进入视口
 * - 进入视口后将 data-src 赋值给 src，并清除 data-src
 * - 不支持 IntersectionObserver 时直接全量加载
 *
 * @param root - 查找根节点（默认 document.body）
 */
function initLazyImages(root: ParentNode = document.body): void {
  const lazyImages = root.querySelectorAll<HTMLImageElement>('img[data-src]');
  if (lazyImages.length === 0) return;

  // 不支持 IntersectionObserver 时降级为直接加载
  if (typeof IntersectionObserver === 'undefined') {
    lazyImages.forEach((img) => {
      const src = img.dataset.src;
      if (src) {
        img.src = src;
        delete img.dataset.src;
      }
    });
    return;
  }

  // 创建模块级单例 Observer（避免重复创建）
  if (!lazyImageObserver) {
    lazyImageObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              delete img.dataset.src;
            }
            lazyImageObserver?.unobserve(img);
          }
        }
      },
      { rootMargin: LAZY_LOAD_ROOT_MARGIN },
    );
  }

  lazyImages.forEach((img) => {
    lazyImageObserver?.observe(img);
  });
}

/**
 * 处理外部链接安全
 *
 * 实现说明：
 * - 查找所有 target="_blank" 的 <a> 元素
 * - 自动补充 rel="noopener noreferrer"（防止 tabnabbing 攻击）
 * - 跳过已包含 rel 的链接（保留用户自定义 rel）
 *
 * @param root - 查找根节点（默认 document.body）
 */
function initExternalLinks(root: ParentNode = document.body): void {
  const externalLinks = root.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]');
  if (externalLinks.length === 0) return;

  externalLinks.forEach((link) => {
    const existingRel = link.getAttribute('rel') ?? '';
    const relParts = new Set(existingRel.split(/\s+/).filter(Boolean));
    relParts.add('noopener');
    relParts.add('noreferrer');
    link.setAttribute('rel', Array.from(relParts).join(' '));
  });
}

/**
 * 注入 Tauri 桌面端专用功能
 *
 * 实现说明：
 * - 检测 window.__TAURI__ 存在时启用桌面端特性
 * - 监听原生菜单事件（通过 Tauri event API）
 * - 注入桌面端样式标记（用于 CSS 区分 Web/桌面）
 * - 不依赖 window.location.origin（Tauri 中为 tauri://localhost）
 */
function initTauriIntegration(): void {
  if (!isTauri()) return;

  // 为 <html> 添加 tauri class，便于 CSS 区分样式
  document.documentElement.classList.add('tauri');

  // 监听 Tauri 原生菜单事件（通过 __TAURI__.event.listen）
  const tauriWindow = window as unknown as {
    __TAURI__?: {
      event?: {
        listen?: (event: string, handler: (payload: { payload: unknown }) => void) => Promise<void>;
      };
    };
  };

  const tauri = tauriWindow.__TAURI__;
  if (!tauri?.event?.listen) return;

  // 监听原生菜单触发的事件
  const menuEvents = [
    'fandex:open-search',
    'fandex:open-shortcut-help',
    'fandex:toggle-sidebar',
    'fandex:toggle-theme',
  ];

  for (const eventName of menuEvents) {
    tauri.event
      .listen(eventName, () => {
        // 转发为 DOM CustomEvent，由各岛屿监听
        document.dispatchEvent(new CustomEvent(eventName));
      })
      .catch(() => {
        /* 监听失败时静默降级 */
      });
  }

  logger.debug('[layout] Tauri integration initialized');
}

/**
 * 侧边栏遮罩层联动
 *
 * 实现说明：
 * - 监听 body.sidebar-open class 切换 backdrop 显隐
 * - 点击遮罩关闭侧边栏
 * - 通过 fandex:toggle-sidebar 事件与 Header 联动
 */
function initSidebarBackdrop(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  if (!backdrop) return;

  /** 点击遮罩关闭侧边栏 */
  backdrop.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    const sidebar = document.getElementById('app-sidebar');
    sidebar?.classList.add('-translate-x-full');
    backdrop.classList.add('hidden');
  });

  /** 监听 fandex:toggle-sidebar 事件同步显隐 */
  document.addEventListener('fandex:toggle-sidebar', () => {
    requestAnimationFrame(() => {
      if (document.body.classList.contains('sidebar-open')) {
        backdrop.classList.remove('hidden');
      } else {
        backdrop.classList.add('hidden');
      }
    });
  });
}

/**
 * 执行全部初始化逻辑
 *
 * 实现说明：
 * - 关键路径立即执行：快捷键、复制按钮、术语提示、外部链接
 * - 非关键路径 requestIdleCallback 调度：代码运行器、Tauri 集成、图片懒加载
 * - Astro ClientRouter SPA 导航后通过 astro:page-load 触发重新初始化
 */
export function initLayout(): void {
  if (typeof document === 'undefined') return;

  // 关键路径：立即执行
  initShortcuts();
  initCodeCopyButtons();
  initTermTooltip();
  initExternalLinks();
  initSidebarBackdrop();

  // 非关键路径：requestIdleCallback 调度（避免阻塞首屏渲染）
  const scheduleIdle = (callback: () => void): void => {
    if (typeof window === 'undefined') return;
    const win = window as unknown as {
      requestIdleCallback?: (cb: () => void) => number;
      setTimeout: (cb: () => void, delay: number) => number;
    };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(callback);
    } else {
      win.setTimeout(callback, 50);
    }
  };

  scheduleIdle(() => {
    initCodeRunners();
    initLazyImages();
    initTauriIntegration();
  });

  logger.debug('[layout] layout initialized');
}

/**
 * Astro ClientRouter 页面加载完成事件处理
 *
 * 实现说明：
 * - 首次加载时由脚本自动调用 initLayout()
 * - SPA 导航后由 astro:page-load 事件触发重新初始化
 * - 避免重复注册 Service Worker（仅注册一次）
 */
function handlePageLoad(): void {
  initLayout();

  // Service Worker 仅注册一次（首次加载时）
  if (!layoutInitialized) {
    registerServiceWorker();
    layoutInitialized = true;
  }
}

// 自动执行：脚本被 import 时立即初始化
if (typeof document !== 'undefined') {
  // DOMContentLoaded 后执行首次初始化（确保 DOM 已就绪）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handlePageLoad, { once: true });
  } else {
    handlePageLoad();
  }

  // Astro ClientRouter SPA 导航后重新初始化
  document.addEventListener('astro:page-load', initLayout);
}

export default { initLayout };
