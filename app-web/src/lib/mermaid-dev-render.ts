import { t } from './i18n';

/**
 * Mermaid 客户端兜底渲染器：仅 dev 模式使用。
 *
 * 生产构建由 plugins/rehype-mermaid-dual.ts 在构建期输出最终 SVG，
 * 客户端不会加载本模块；dev 跳过构建期渲染以保证改图即时反馈，
 * 由 mermaid-interactions 检测到未渲染代码块后动态加载本文件。
 */

let mermaidPromise: Promise<MermaidAPI> | null = null;

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string }>;
}

let renderCounter = 0;

const figureSources = new WeakMap<HTMLElement, string>();
let configuredTheme: 'dark' | 'light' | null = null;

function resolveTheme(): 'dark' | 'light' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

async function getThemedMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => (mod.default ?? mod) as MermaidAPI);
  }
  const mermaid = await mermaidPromise;
  const theme = resolveTheme();
  if (configuredTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      layout: 'dagre',
      look: 'classic',
      theme: theme === 'dark' ? 'dark' : 'neutral',
      fontSize: 15,
      flowchart: { curve: 'basis', nodeSpacing: 24, rankSpacing: 40, useMaxWidth: true, padding: 12 },
      sequence: { diagramMarginX: 12, diagramMarginY: 12, boxMargin: 12, useMaxWidth: true },
    });
    configuredTheme = theme;
  }
  return mermaid;
}

async function renderOne(pre: Element): Promise<void> {
  if (pre.getAttribute('data-mermaid-state')) return;
  pre.setAttribute('data-mermaid-state', 'loading');

  const source = (pre.textContent ?? '').trim();
  try {
    const mermaid = await getThemedMermaid();
    renderCounter += 1;
    const { svg } = await mermaid.render(`fandex-mermaid-dev-${renderCounter}`, source);

    const figure = document.createElement('figure');
    figure.className = 'mermaid-figure';
    figure.setAttribute('data-mermaid-figure', '');
    figureSources.set(figure, source);

    const canvas = document.createElement('div');
    canvas.className = 'mermaid-canvas';
    const svgWrap = document.createElement('div');
    svgWrap.className = 'mermaid-svg is-light';
    svgWrap.innerHTML = svg;
    canvas.appendChild(svgWrap);

    const toolbar = document.createElement('div');
    toolbar.className = 'mermaid-toolbar';
    toolbar.setAttribute('data-mermaid-toolbar', '');

    const sourcePre = document.createElement('pre');
    sourcePre.className = 'mermaid-source';
    sourcePre.setAttribute('data-language', 'mermaid');
    sourcePre.hidden = true;
    sourcePre.textContent = source;

    const caption = document.createElement('figcaption');
    caption.className = 'mermaid-caption';
    caption.textContent = t('code.mermaidCaption');

    figure.append(canvas, toolbar, sourcePre, caption);
    pre.replaceWith(figure);
  } catch (err) {
    pre.setAttribute('data-mermaid-state', 'error');
    pre.setAttribute('title', t('code.mermaidError'));
    console.warn('[mermaid-dev] 图表渲染失败，已保留源码展示:', err);
  }
}

function renderAll(): void {
  document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]').forEach((pre) => {
    if (pre.closest('[data-mermaid-figure]')) return;
    void renderOne(pre);
  });
}

// dev 下主题切换后用新配色重绘（生产环境双 SVG 由 CSS 切换，不走这里）
async function rerenderAllForTheme(): Promise<void> {
  const figures = document.querySelectorAll<HTMLElement>('.mermaid-figure[data-mermaid-figure]');
  for (const figure of figures) {
    const source = figureSources.get(figure);
    const svgWrap = figure.querySelector<HTMLElement>('.mermaid-svg');
    if (!source || !svgWrap) continue;
    try {
      const mermaid = await getThemedMermaid();
      renderCounter += 1;
      const { svg } = await mermaid.render(`fandex-mermaid-dev-${renderCounter}`, source);
      svgWrap.innerHTML = svg;
    } catch {
      /* 重绘失败保留旧图 */
    }
  }
}

export function renderDevMermaid(): void {
  renderAll();
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('fandex:themechange', () => {
    void rerenderAllForTheme();
  });
}
