import { t } from './i18n';

function openSidebar(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarEl = document.getElementById('app-sidebar');
  document.body.classList.add('sidebar-open');
  sidebarEl?.classList.add('is-open');
  backdrop?.classList.add('is-visible');
  syncSidebarUrl();
}

function closeSidebar(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarEl = document.getElementById('app-sidebar');
  document.body.classList.remove('sidebar-open');
  sidebarEl?.classList.remove('is-open');
  backdrop?.classList.remove('is-visible');
  syncSidebarUrl();
}

function syncSidebarUrl(): void {
  const params = new URLSearchParams(window.location.search);
  if (document.body.classList.contains('sidebar-open')) {
    params.set('sidebar', '1');
  } else {
    params.delete('sidebar');
  }
  const newSearch = params.toString();
  const newUrl = newSearch
    ? window.location.pathname + '?' + newSearch + window.location.hash
    : window.location.pathname + window.location.hash;
  history.replaceState(null, '', newUrl);
}

function restoreSidebarFromUrl(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarEl = document.getElementById('app-sidebar');
  const params = new URLSearchParams(window.location.search);
  if (params.get('sidebar') === '1') {
    document.body.classList.add('sidebar-open');
    sidebarEl?.classList.add('is-open');
    backdrop?.classList.add('is-visible');
  }
}

function closeFeatureSheet(): void {
  const sheet = document.getElementById('feature-sheet');
  const backdrop = document.getElementById('feature-sheet-backdrop');
  const btn = document.getElementById('mobile-features-btn');
  if (!sheet || !sheet.classList.contains('is-open')) return;
  sheet.classList.remove('is-open');
  sheet.setAttribute('aria-hidden', 'true');
  backdrop?.classList.remove('is-visible');
  btn?.setAttribute('aria-expanded', 'false');
  btn?.focus();
}

function initFeatureSheet(): void {
  const btn = document.getElementById('mobile-features-btn');
  const sheet = document.getElementById('feature-sheet');
  const backdrop = document.getElementById('feature-sheet-backdrop');
  if (!btn || !sheet || !backdrop || btn.dataset.sheetBound === 'true') return;
  btn.dataset.sheetBound = 'true';

  btn.addEventListener('click', () => {
    const willOpen = !sheet.classList.contains('is-open');
    sheet.classList.toggle('is-open', willOpen);
    sheet.setAttribute('aria-hidden', String(!willOpen));
    backdrop.classList.toggle('is-visible', willOpen);
    btn.setAttribute('aria-expanded', String(willOpen));
    if (willOpen) {
      (sheet.querySelector('a') as HTMLElement | null)?.focus();
    } else {
      btn.focus();
    }
  });
  backdrop.addEventListener('click', closeFeatureSheet);
  sheet.addEventListener('click', event => {
    if ((event.target as HTMLElement | null)?.closest('a')) closeFeatureSheet();
  });
}

function initLayoutInteractions(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggle = document.getElementById('nav-toggle');
  const mobileBtn = document.getElementById('mobile-sidebar-btn');

  restoreSidebarFromUrl();

  if (toggle && toggle.dataset.bound !== 'true') {
    toggle.dataset.bound = 'true';
    toggle.addEventListener('click', () => {
      if (document.body.classList.contains('sidebar-open')) {
        closeSidebar();
      } else {
        document.dispatchEvent(new CustomEvent('fandex-switch-chapters'));
        openSidebar();
      }
    });
  }

  if (mobileBtn && mobileBtn.dataset.bound !== 'true') {
    mobileBtn.dataset.bound = 'true';
    mobileBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('fandex-switch-modules'));
      openSidebar();
    });
  }

  if (backdrop && backdrop.dataset.bound !== 'true') {
    backdrop.dataset.bound = 'true';
    backdrop.addEventListener('click', closeSidebar);
  }

  initFeatureSheet();

  const backToTopBtn = document.getElementById('nav-back-to-top');
  const mainEl = document.getElementById('app-main');
  if (backToTopBtn && mainEl && backToTopBtn.dataset.bound !== 'true') {
    backToTopBtn.dataset.bound = 'true';
    backToTopBtn.addEventListener('click', () => {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

let onFullscreenChange: (() => void) | null = null;

function initFullscreenToggle(): void {
  const fullscreenBtn = document.getElementById('mobile-fullscreen-btn');
  if (!fullscreenBtn || fullscreenBtn.dataset.bound === 'true') return;
  fullscreenBtn.dataset.bound = 'true';

  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  });

  if (onFullscreenChange === null) {
    onFullscreenChange = () => {
      const btn = document.getElementById('mobile-fullscreen-btn');
      const span = btn?.querySelector('span');
      if (document.fullscreenElement) {
        if (span) span.textContent = t('nav.exitFullscreen');
        try {
          localStorage.setItem('fandex-fullscreen', 'true');
        } catch { /* localStorage 不可用时静默降级 */ }
      } else {
        if (span) span.textContent = t('nav.fullscreen');
        try {
          localStorage.removeItem('fandex-fullscreen');
        } catch { /* localStorage 不可用时静默降级 */ }
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
  }

  if (readFullscreenFlag() === 'true' && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

function readFullscreenFlag(): string | null {
  // localStorage 在隐私模式/被站点设置禁用时会抛异常，这里必须容错，
  // 否则会中断本模块后续初始化（复制按钮、快捷键、SW 注册等）
  try {
    return localStorage.getItem('fandex-fullscreen');
  } catch {
    return null;
  }
}

function initCopyButtons(): void {
  document.querySelectorAll('pre > code').forEach((codeEl) => {
    const pre = codeEl.parentElement;
    if (!pre) return;
    // mermaid 源码块由 mermaid-render 异步替换为图表，包进 code-block 会产生
    // 双层边框、多余语言徽标与复制按钮
    if (pre.getAttribute('data-language') === 'mermaid') return;

    const parent = pre.parentElement;
    if (!parent) return;
    if (parent.classList.contains('code-block')) return;
    if (parent.querySelector(':scope > .copy-btn')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    const lang =
      (codeEl.className.match(/language-(\S+)/) || [])[1] ||
      pre.getAttribute('data-language') ||
      '';
    if (lang) wrapper.setAttribute('data-lang', lang);

    const btn = document.createElement('button');
    btn.className = 'copy-btn fndx-icon-btn fndx-icon-btn--labeled';
    btn.setAttribute('aria-label', t('code.copyAria'));
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

    btn.addEventListener('click', async () => {
      const text = codeEl.textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        btn.classList.add('copied');
        btn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2000);
      } catch {
        const execCommandCopy = Reflect.get(document, 'execCommand') as (
          commandId: string,
          showUI?: boolean,
          value?: string,
        ) => boolean | undefined;
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        execCommandCopy?.('copy');
        document.body.removeChild(ta);
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 2000);
      }
    });

    const parentNode = pre.parentNode;
    if (!parentNode) return;
    parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(btn);
  });
}

initLayoutInteractions();
initFullscreenToggle();
initCopyButtons();

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeFeatureSheet();
});

document.addEventListener('astro:page-load', () => {
  closeSidebar();
  initLayoutInteractions();
  initFullscreenToggle();
});

document.addEventListener('astro:page-load', initCopyButtons);

function initCodeOverflow(): void {
  const blocks = document.querySelectorAll<HTMLElement>('.code-block');

  blocks.forEach((block) => {
    if (block.dataset.overflowBound === 'true') return;
    block.dataset.overflowBound = 'true';

    const scroller = block.querySelector<HTMLElement>('pre');
    if (!scroller) return;

    const sync = (): void => {
      const overflow = scroller.scrollWidth - scroller.clientWidth > 4;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
      block.classList.toggle('has-overflow', overflow && !atEnd);
    };

    scroller.addEventListener('scroll', sync, { passive: true });
    requestAnimationFrame(() => requestAnimationFrame(sync));
  });

  if (document.fonts?.status === 'loading') {
    void document.fonts.ready.then(() => {
      document.querySelectorAll<HTMLElement>('.code-block').forEach((block) => {
        const scroller = block.querySelector<HTMLElement>('pre');
        if (!scroller) return;
        const overflow = scroller.scrollWidth - scroller.clientWidth > 4;
        const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
        block.classList.toggle('has-overflow', overflow && !atEnd);
      });
    });
  }
}

function initHeadingAnchors(): void {
  document.querySelectorAll<HTMLElement>('.prose h2[id], .prose h3[id]').forEach((heading) => {
    if (heading.dataset.anchorBound === 'true') return;
    heading.dataset.anchorBound = 'true';

    // '#' 锚点由构建期 rehype-autolink-headings（behavior: 'append'）注入，
    // 这里只补绑定点击行为：复制链接 + 平滑滚动；无锚点时兜底追加
    let anchor = heading.querySelector<HTMLAnchorElement>(':scope > a.heading-anchor');
    if (!anchor) {
      anchor = document.createElement('a');
      anchor.className = 'heading-anchor';
      anchor.href = `#${heading.id}`;
      anchor.setAttribute('aria-hidden', 'true');
      anchor.tabIndex = -1;
      anchor.textContent = '#';
      heading.appendChild(anchor);
    }

    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(url);
      }
      window.history.replaceState(null, '', `#${heading.id}`);
      // scrollIntoView 按 scroll-margin-top 落点，标题不会被置顶标题栏遮住
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

document.addEventListener('astro:page-load', () => {
  initCodeOverflow();
  initHeadingAnchors();
});
initCodeOverflow();
initHeadingAnchors();

async function initAnimations(): Promise<void> {
  try {
    const { initAnimations: init } = await import('@/lib/animations');
    init();
  } catch {
    /* ignore */
  }
}

document.addEventListener('astro:page-load', initAnimations);
void initAnimations();

if (!('__TAURI__' in window) && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker.register(base + 'sw.js').catch((err) => {
    if (import.meta.env.DEV) {
      console.warn('[FANDEX] Service Worker 注册失败:', err);
    }
  });
}
