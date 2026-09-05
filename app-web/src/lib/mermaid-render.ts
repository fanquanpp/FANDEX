/**
 * Mermaid 图表客户端惰性渲染模块
 * =============================================================================
 * 功能概述：
 * 站点内容（cnt-content/full）中约 520 篇文档包含 ```mermaid 代码块。
 * 构建期 Shiki 会把它们作为普通代码块输出（pre > code.language-mermaid），
 * 本模块在客户端扫描这些代码块，按需动态 import('mermaid') 渲染为 SVG
 * 并替换原代码块；页面不含 mermaid 块时零加载、零开销。
 *
 * 设计决策：
 * - 选择客户端按需渲染而非构建期 SVG 化：构建期方案需要无头浏览器依赖，
 *   且 mermaid SVG 固化后无法跟随亮/暗主题
 * - mermaid 来自 npm 依赖并由 Vite 代码分割为异步 chunk：仅含图表的页面
 *   在首次渲染时才加载（此前为 jsDelivr CDN 运行时加载，自托管后
 *   GitHub Pages 与 Tauri 桌面端离线环境均可用，且无第三方 CDN 依赖）
 * - 主题跟随 document.documentElement 的 data-theme（light → neutral，
 *   dark → dark），渲染时取当前值；切换主题后刷新页面即可重渲染
 * - 渲染失败（语法错误等）保留原代码块并在控制台给出提示，不阻断阅读
 * - 与 View Transitions 兼容：astro:page-load 时重新扫描，已处理容器
 *   通过 data-mermaid-state 标记跳过，避免重复渲染
 * =============================================================================
 */

/** mermaid 模块缓存：同一页面生命周期内仅加载一次 */
let mermaidPromise: Promise<MermaidAPI> | null = null;

/** mermaid 对象的最小接口声明（CDN ESM 无类型定义，收窄使用面） */
interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
}

/** 渲染计数器：为每个图表生成唯一 DOM id */
let renderCounter = 0;

/**
 * 惰性加载 mermaid 模块（Vite 代码分割的异步 chunk）并按当前主题初始化
 * @returns mermaid API 对象
 */
async function getMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = (mod.default ?? mod) as MermaidAPI;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: isDark ? 'dark' : 'neutral',
        fontFamily:
          "var(--font-body, system-ui), -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * 判断元素是否处于视口附近（提前一屏触发渲染）
 * @param el - 目标元素
 * @returns 是否临近可见
 */
function isNearViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const margin = window.innerHeight * 1.5;
  return rect.top < window.innerHeight + margin && rect.bottom > -margin;
}

/**
 * 渲染单个 mermaid 代码块
 * @param pre - Shiki 输出的 pre[data-language="mermaid"] 元素
 */
async function renderOne(pre: Element): Promise<void> {
  if (pre.getAttribute('data-mermaid-state')) return;
  pre.setAttribute('data-mermaid-state', 'loading');
  pre.classList.add('mermaid-loading');

  const source = pre.textContent ?? '';
  try {
    const mermaid = await getMermaid();
    renderCounter += 1;
    const { svg } = await mermaid.render(`fandex-mermaid-${renderCounter}`, source);

    // 构建图表容器：横向滚动包裹层 + 说明文字，替换整个 pre 代码块
    const wrapper = document.createElement('figure');
    wrapper.className = 'mermaid-figure';
    wrapper.setAttribute('data-mermaid-state', 'done');
    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'mermaid-scroll';
    scrollWrap.innerHTML = svg;
    wrapper.appendChild(scrollWrap);
    const caption = document.createElement('figcaption');
    caption.className = 'mermaid-caption';
    caption.textContent = 'mermaid 图表';
    wrapper.appendChild(caption);
    pre.replaceWith(wrapper);
  } catch (err) {
    // 渲染失败：还原为普通代码块，保留源码可读性
    pre.setAttribute('data-mermaid-state', 'error');
    pre.classList.remove('mermaid-loading');
    console.warn('[mermaid] 图表渲染失败，已保留源码展示:', err);
  }
}

/**
 * 扫描并渲染当前页面全部 mermaid 代码块（临近视口的优先立即处理）
 */
function renderAllMermaid(): void {
  // Shiki 为 mermaid 块输出 pre[data-language="mermaid"]（无 code.language-mermaid 类）
  const blocks = document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]');
  blocks.forEach((pre) => {
    if (pre.getAttribute('data-mermaid-state')) return;
    if (isNearViewport(pre)) {
      void renderOne(pre);
    } else {
      // 视口外的图表延迟到滚动临近时渲染，避免长页面一次性渲染全部
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            void renderOne(pre);
          }
        },
        { rootMargin: '50% 0px' },
      );
      observer.observe(pre);
    }
  });
}

// SSR/预渲染环境不执行任何 DOM 逻辑（Astro 构建期会求值页面脚本模块）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  // 首次加载与 View Transitions 页面切换后均重新扫描
  renderAllMermaid();
  document.addEventListener('astro:page-load', renderAllMermaid);
}
