
type AlgoView = 'tutorials' | 'problems';

function readViewFromUrl(): AlgoView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'problems' || window.location.hash === '#problems') {
    return 'problems';
  }
  return 'tutorials';
}

function applyView(root: HTMLElement, view: AlgoView): void {
  root.querySelectorAll<HTMLElement>('[data-view-tab]').forEach((tab) => {
    const active = tab.dataset.viewTab === view;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-pressed', String(active));
  });
  root.querySelectorAll<HTMLElement>('[data-algo-view]').forEach((section) => {
    section.hidden = section.dataset.algoView !== view;
  });
}

function syncViewUrl(view: AlgoView): void {
  const params = new URLSearchParams(window.location.search);
  if (view === 'problems') {
    params.set('view', 'problems');
  } else {
    params.delete('view');
  }
  const search = params.toString();
  history.replaceState(
    null,
    '',
    search ? `${window.location.pathname}?${search}` : window.location.pathname,
  );
}

function initAlgoViews(): void {
  const root = document.querySelector<HTMLElement>('[data-algo-page]');
  if (!root || root.dataset.viewSwitchBound === 'true') return;
  root.dataset.viewSwitchBound = 'true';

  applyView(root, readViewFromUrl());

  root.querySelectorAll<HTMLButtonElement>('[data-view-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.viewTab as AlgoView | undefined;
      if (!view || view === readViewFromUrl()) return;
      applyView(root, view);
      syncViewUrl(view);
      const scroller = document.querySelector<HTMLElement>('.home-main');
      if (scroller) scroller.scrollTo({ top: 0 });
    });
  });
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initAlgoViews);
}
