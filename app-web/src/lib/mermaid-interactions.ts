import panzoom from 'panzoom';
import { t } from './i18n';

/**
 * Mermaid 图表交互层：配套构建期渲染（plugins/rehype-mermaid-dual.ts）。
 *
 * 图表本体已在构建期变成内联 SVG，这里只负责"可操作性"：
 * - 工具栏：放大 / 缩小 / 重置 / 查看源码 / 全屏；
 * - 拖拽平移与缩放由 panzoom（anvaka）承担：直接拖动即可平移，
 *   Ctrl + 滚轮缩放（普通滚轮保留页面滚动，避免劫持阅读习惯），
 *   全屏内滚轮直接缩放；
 * - 亮暗主题切换由纯 CSS 完成（两套 SVG 同时内联），无需 JS 参与。
 *
 * dev 模式下页面里仍是未渲染的 mermaid 代码块（构建期渲染跳过），
 * 检测到后动态加载 mermaid-dev-render 兜底。
 */

interface PanzoomInstance {
  dispose(): void;
  zoomAbs(x: number, y: number, scale: number): void;
  smoothZoom(x: number, y: number, scale: number): void;
  pan(x: number, y: number): void;
}

interface FigureContext {
  figure: HTMLElement;
  instances: PanzoomInstance[];
  onFullscreenChange: () => void;
}

const contexts = new WeakMap<HTMLElement, FigureContext>();
const pendingObservers = new Set<IntersectionObserver>();

function iconButton(path: string, labelKey: string): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'fndx-icon-btn mermaid-tool-btn';
  btn.setAttribute('aria-label', t(labelKey));
  btn.title = t(labelKey);
  btn.innerHTML =
    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return btn;
}

const ICONS = {
  zoomIn:
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>',
  zoomOut:
    '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/><line x1="8" y1="11" x2="14" y2="11"/>',
  reset:
    '<path d="M3 12a9 9 0 1 0 2.6-6.4"/><polyline points="3 4 3 9 8 9"/>',
  fullscreen:
    '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  source:
    '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
};

function attachInteractions(figure: HTMLElement): void {
  if (contexts.has(figure)) return;

  const canvases = Array.from(figure.querySelectorAll<HTMLElement>('.mermaid-svg'));
  const instances: PanzoomInstance[] = [];
  for (const canvas of canvases) {
    const svg = canvas.querySelector('svg');
    if (!svg) continue;
    instances.push(
      panzoom(svg, {
        maxZoom: 8,
        minZoom: 0.4,
        // 普通滚轮保留页面滚动；Ctrl/Cmd + 滚轮或全屏内滚轮才缩放
        beforeWheel: (event: WheelEvent) => {
          const target = event.target as Element | null;
          const fig = target?.closest('[data-mermaid-figure]');
          const isFullscreen = Boolean(fig && fig.classList.contains('is-fullscreen'));
          if (!isFullscreen && !event.ctrlKey && !event.metaKey) return true;
          return false;
        },
      }) as unknown as PanzoomInstance,
    );
  }

  const toolbar = figure.querySelector<HTMLElement>('[data-mermaid-toolbar]');
  const sourcePre = figure.querySelector<HTMLElement>('.mermaid-source');
  const caption = figure.querySelector<HTMLElement>('.mermaid-caption');
  if (caption) caption.textContent = t('code.mermaidCaption');

  const zoomStep = (factor: number) => () => {
    const instance = instances[0];
    if (!instance) return;
    const rect = figure.getBoundingClientRect();
    instance.smoothZoom(rect.width / 2, rect.height / 2, factor);
  };

  const resetView = () => {
    for (const instance of instances) {
      instance.pan(0, 0);
      instance.zoomAbs(0, 0, 1);
    }
  };

  const toggleSource = () => {
    if (!sourcePre) return;
    sourcePre.hidden = !sourcePre.hidden;
    if (!sourcePre.hidden) resetView();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement === figure) {
      void document.exitFullscreen();
    } else {
      void figure.requestFullscreen().catch(() => {});
    }
  };

  if (toolbar) {
    const buttons = [
      { icon: ICONS.zoomOut, key: 'code.mermaidZoomOut', onClick: zoomStep(1 / 1.4) },
      { icon: ICONS.zoomIn, key: 'code.mermaidZoomIn', onClick: zoomStep(1.4) },
      { icon: ICONS.reset, key: 'code.mermaidReset', onClick: resetView },
      { icon: ICONS.source, key: 'code.mermaidSource', onClick: toggleSource },
      { icon: ICONS.fullscreen, key: 'code.mermaidFullscreen', onClick: toggleFullscreen },
    ];
    for (const spec of buttons) {
      const btn = iconButton(spec.icon, spec.key);
      btn.addEventListener('click', spec.onClick);
      toolbar.appendChild(btn);
    }
  }

  const onFullscreenChange = () => {
    const active = document.fullscreenElement === figure;
    figure.classList.toggle('is-fullscreen', active);
    const fsBtn = toolbar?.querySelector<HTMLButtonElement>('.mermaid-tool-btn:last-child');
    if (fsBtn) {
      const key = active ? 'code.mermaidExitFullscreen' : 'code.mermaidFullscreen';
      fsBtn.setAttribute('aria-label', t(key));
      fsBtn.title = t(key);
    }
    if (!active) requestAnimationFrame(resetView);
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  contexts.set(figure, { figure, instances, onFullscreenChange });
}

function detachInteractions(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-mermaid-figure]').forEach((figure) => {
    const context = contexts.get(figure);
    if (!context) return;
    document.removeEventListener('fullscreenchange', context.onFullscreenChange);
    context.instances.forEach((instance) => instance.dispose());
    contexts.delete(figure);
  });
  root.querySelectorAll<HTMLElement>('figure.mermaid-figure').forEach((figure) => {
    // 静态构建产物换页后 DOM 整体替换，工具栏等随文档销毁，这里只需清引用
    contexts.delete(figure);
  });
}

function enhanceAll(): void {
  document.querySelectorAll<HTMLElement>('[data-mermaid-figure]').forEach(attachInteractions);

  // dev 兜底：构建期渲染被跳过时，页面里仍是原始代码块，动态加载客户端渲染器。
  // 仅 dev 打包这段 import：生产构建（含桌面端内嵌产物）由 rehype-mermaid-dual
  // 构建期输出最终 SVG，缺失预渲染属于构建环境问题，应当让 qa 门禁拦下而不是
  // 在访问时静默拉起约 600KB 的 mermaid（此前曾因此把整条 mermaid/elk chunk
  // 链路带进生产 dist，纯增部署体积）。
  const unrendered = Array.from(
    document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"]'),
  ).filter((pre) => !pre.closest('[data-mermaid-figure]'));
  if (unrendered.length > 0 && import.meta.env.DEV) {
    void import('./mermaid-dev-render').then((mod) => mod.renderDevMermaid());
  }
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  enhanceAll();
  document.addEventListener('astro:page-load', enhanceAll);
  document.addEventListener('astro:before-swap', () => {
    detachInteractions(document);
    for (const observer of pendingObservers) observer.disconnect();
    pendingObservers.clear();
  });
}
