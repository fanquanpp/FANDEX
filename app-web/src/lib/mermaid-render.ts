import { t } from './i18n';

let mermaidPromise: Promise<MermaidAPI> | null = null;

interface MermaidAPI {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, source: string) => Promise<{ svg: string; bindFunctions?: (el: Element) => void }>;
}

let renderCounter = 0;

const pendingObservers = new Set<IntersectionObserver>();

async function getMermaid(): Promise<MermaidAPI> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = (mod.default ?? mod) as MermaidAPI;
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        layout: 'dagre',
        look: 'classic',
        theme: isDark ? 'dark' : 'neutral',
        fontFamily:
          "var(--font-family-body, system-ui), -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif",
      });
      return mermaid;
    });
  }
  return mermaidPromise;
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
    const mermaid = await getMermaid();
    renderCounter += 1;
    const { svg } = await mermaid.render(`fandex-mermaid-${renderCounter}`, source);

    const wrapper = document.createElement('figure');
    wrapper.className = 'mermaid-figure';
    wrapper.setAttribute('data-mermaid-state', 'done');
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

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  renderAllMermaid();
  document.addEventListener('astro:page-load', renderAllMermaid);
  document.addEventListener('astro:before-swap', () => {
    for (const observer of pendingObservers) observer.disconnect();
    pendingObservers.clear();
  });
}
