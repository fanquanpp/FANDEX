import { t } from './i18n';

let mermaidPromise: Promise<MermaidAPI> | null = null;

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
}

let renderCounter = 0;

const pendingObservers = new Set<IntersectionObserver>();

// 已渲染图表的源码：主题切换时需要用新配色重绘
const figureSources = new WeakMap<HTMLElement, string>();

// 当前 Mermaid 配置的主题，避免同主题重复 initialize
let configuredTheme: 'dark' | 'light' | null = null;

function resolveTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

async function getMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => (mod.default ?? mod) as MermaidAPI);
  }
  return mermaidPromise;
}

// 首次加载与主题切换都会走这里，保证 Mermaid 配置与当前主题一致后再渲染
async function getThemedMermaid(): Promise<MermaidAPI> {
  const mermaid = await getMermaid();
  const theme = resolveTheme();
  if (configuredTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      layout: 'dagre',
      look: 'classic',
      theme: theme === 'dark' ? 'dark' : 'neutral',
      fontFamily:
        "var(--font-family-body, system-ui), -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
    });
    configuredTheme = theme;
  }
  return mermaid;
}

function isNearViewport(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  const margin = window.innerHeight * 1.5;
  return rect.top < window.innerHeight + margin && rect.bottom > -margin;
}

async function renderOne(pre: Element): Promise<void> {
  if (pre.getAttribute('data-mermaid-state')) return;
  pre.setAttribute('data-mermaid-state', 'loading');
  pre.classList.add('mermaid-loading');

  const source = pre.textContent ?? '';
  try {
    const mermaid = await getThemedMermaid();
    renderCounter += 1;
    const { svg } = await mermaid.render(`fandex-mermaid-${renderCounter}`, source);

    const wrapper = document.createElement('figure');
    wrapper.className = 'mermaid-figure';
    wrapper.setAttribute('data-mermaid-state', 'done');
    figureSources.set(wrapper, source);
    const scrollWrap = document.createElement('div');
    scrollWrap.className = 'mermaid-scroll';
    scrollWrap.innerHTML = svg;
    wrapper.appendChild(scrollWrap);
    const caption = document.createElement('figcaption');
    caption.className = 'mermaid-caption';
    caption.textContent = t('code.mermaidCaption');
    wrapper.appendChild(caption);
    pre.replaceWith(wrapper);
  } catch (err) {
    pre.setAttribute('data-mermaid-state', 'error');
    pre.classList.remove('mermaid-loading');
    // 语法非法时保留高亮源码展示，并在悬停提示里说明原因
    pre.setAttribute('title', t('code.mermaidError'));
    console.warn('[mermaid] 图表渲染失败，已保留源码展示:', err);
  }
}

function renderAllMermaid(): void {
  const blocks = document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]');
  blocks.forEach((pre) => {
    if (pre.getAttribute('data-mermaid-state')) return;
    if (isNearViewport(pre)) {
      void renderOne(pre);
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            observer.disconnect();
            pendingObservers.delete(observer);
            void renderOne(pre);
          }
        },
        { rootMargin: '50% 0px' },
      );
      observer.observe(pre);
      pendingObservers.add(observer);
    }
  });
}

// 主题切换后用新配色重绘页面上所有已渲染图表
async function rerenderAllForTheme(): Promise<void> {
  const figures = document.querySelectorAll<HTMLElement>('.mermaid-figure');
  if (figures.length === 0) {
    configuredTheme = null; // 下次渲染时按新主题初始化
    return;
  }
  try {
    const mermaid = await getThemedMermaid();
    for (const figure of figures) {
      const source = figureSources.get(figure);
      if (!source) continue;
      const scrollWrap = figure.querySelector<HTMLElement>('.mermaid-scroll');
      if (!scrollWrap) continue;
      try {
        renderCounter += 1;
        const { svg } = await mermaid.render(`fandex-mermaid-${renderCounter}`, source);
        scrollWrap.innerHTML = svg;
      } catch {
        /* 重绘失败保留旧图 */
      }
    }
  } catch {
    /* mermaid 加载失败忽略 */
  }
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  renderAllMermaid();
  document.addEventListener('astro:page-load', renderAllMermaid);
  document.addEventListener('astro:before-swap', () => {
    for (const observer of pendingObservers) observer.disconnect();
    pendingObservers.clear();
  });
  document.addEventListener('fandex:themechange', () => {
    void rerenderAllForTheme();
  });
}
