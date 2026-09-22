
const SIDEBAR_SCROLL_KEY = 'fandex-sidebar-scroll';

const MODULE_EXPANDED_KEY = 'fandex-sidebar-expanded';

const SIDEBAR_COLLAPSED_KEY = 'fandex-sidebar-collapsed';

const SIDEBAR_VIEW_KEY = 'fandex-sidebar-view';

function readExpandedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(MODULE_EXPANDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeExpandedSet(set: Set<string>): void {
  try {
    localStorage.setItem(MODULE_EXPANDED_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

function initSidebarCollapse(): void {
  const sidebar = document.getElementById('app-sidebar');
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const expandFab = document.getElementById('sidebar-expand-fab');
  if (!sidebar || !collapseBtn || !expandFab) return;

  if (collapseBtn.dataset.bound === '1') return;
  collapseBtn.dataset.bound = '1';

  const applyCollapsedState = (collapsed: boolean): void => {
    document.documentElement.classList.toggle('sidebar-collapsed', collapsed);
    if (collapsed) {
      sidebar.classList.add('is-collapsed');
      expandFab.classList.add('is-visible');
    } else {
      sidebar.classList.remove('is-collapsed');
      expandFab.classList.remove('is-visible');
    }
  };

  const savedCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  applyCollapsedState(savedCollapsed);

  collapseBtn.addEventListener('click', () => {
    const willCollapse = !sidebar.classList.contains('is-collapsed');
    applyCollapsedState(willCollapse);
    try {
      if (willCollapse) {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '1');
      } else {
        localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
      }
    } catch {
      /* localStorage 不可用时静默降级 */
    }
  });

  if (expandFab.dataset.bound !== '1') {
    expandFab.dataset.bound = '1';
    expandFab.addEventListener('click', () => {
      applyCollapsedState(false);
      try {
        localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
      } catch {
        /* localStorage 不可用时静默降级 */
      }
    });
  }
}

function initSidebar(): void {
  initCloseButton();
  initModuleToggle();
  restoreModuleExpandState();
  initSidebarCollapse();
  initViewTabs();
  restoreView();
  initScrollMemory();
}

function initScrollMemory(): void {
  const sidebarScroll = document.getElementById('sidebar-scroll');
  if (!sidebarScroll) return;

  const sidebar = document.getElementById('app-sidebar');
  const isCollapsed = sidebar?.classList.contains('is-collapsed') ?? false;

  const saved = sessionStorage.getItem(SIDEBAR_SCROLL_KEY);
  if (saved && !isCollapsed) {
    requestAnimationFrame(() => {
      sidebarScroll.scrollTop = Number(saved);
      sessionStorage.removeItem(SIDEBAR_SCROLL_KEY);
    });
  } else {
    // 无已保存偏移时把当前文档条目滚入可视区，长列表下当前位置一目了然
    requestAnimationFrame(() => {
      const active = sidebarScroll.querySelector<HTMLElement>(
        '.fndx-sidebar__link.is-active, [aria-current="page"]',
      );
      active?.scrollIntoView({ block: 'nearest' });
    });
  }

  sidebarScroll.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    if (link.dataset.scrollBound === '1') return;
    link.dataset.scrollBound = '1';
    link.addEventListener('click', () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebarScroll.scrollTop));
    });
  });
}

function initCloseButton(): void {
  const closeBtn = document.getElementById('sidebar-close-btn');
  if (!closeBtn) return;
  if (closeBtn.dataset.bound === '1') return;
  closeBtn.dataset.bound = '1';
  closeBtn.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    const sidebar = document.getElementById('app-sidebar');
    sidebar?.classList.remove('is-open');
  });
}

function initModuleToggle(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>(
    '.fndx-sidebar__module-arrow[data-module-toggle]',
  );
  if (buttons.length === 0) return;

  buttons.forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';

    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      const moduleId = btn.getAttribute('data-module-toggle');
      if (!moduleId) return;

      const li = btn.closest('.fndx-sidebar__module') as HTMLElement | null;
      if (!li) return;

      const docsList = li.querySelector<HTMLUListElement>('.fndx-sidebar__module-docs');
      if (!docsList) return;

      const willExpand = docsList.classList.contains('is-collapsed');
      if (willExpand) {
        docsList.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded', 'true');
      } else {
        docsList.classList.add('is-collapsed');
        btn.setAttribute('aria-expanded', 'false');
      }

      const expandedSet = readExpandedSet();
      if (willExpand) {
        expandedSet.add(moduleId);
      } else {
        expandedSet.delete(moduleId);
      }
      writeExpandedSet(expandedSet);
    });
  });
}

function restoreModuleExpandState(): void {
  const expandedSet = readExpandedSet();
  if (expandedSet.size === 0) return;

  const groups = document.querySelectorAll<HTMLElement>('.fndx-sidebar__module');
  groups.forEach((li) => {
    const moduleId = li.getAttribute('data-module');
    if (!moduleId || !expandedSet.has(moduleId)) return;

    const docsList = li.querySelector<HTMLUListElement>('.fndx-sidebar__module-docs');
    const btn = li.querySelector<HTMLButtonElement>('.fndx-sidebar__module-arrow');
    if (!docsList || !btn) return;

    docsList.classList.remove('is-collapsed');
    btn.setAttribute('aria-expanded', 'true');
  });
}

function updateTabsActive(view: 'chapters' | 'modules'): void {
  document.querySelectorAll<HTMLButtonElement>('.fndx-sidebar__view-tab').forEach((tab) => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function persistView(view: 'chapters' | 'modules'): void {
  try {
    localStorage.setItem(SIDEBAR_VIEW_KEY, view);
  } catch {
    /* localStorage 不可用时静默降级 */
  }
}

function initViewTabs(): void {
  const tabs = document.querySelectorAll<HTMLButtonElement>('.fndx-sidebar__view-tab');
  if (tabs.length === 0) return;

  tabs.forEach((tab) => {
    if (tab.dataset.bound === '1') return;
    tab.dataset.bound = '1';

    tab.addEventListener('click', () => {
      const view = tab.dataset.view;
      if (view === 'chapters') {
        showChapterView();
      } else if (view === 'modules') {
        showModulesView();
      }
    });
  });
}

function restoreView(): void {
  let view: 'chapters' | 'modules' = 'chapters';
  try {
    const saved = localStorage.getItem(SIDEBAR_VIEW_KEY);
    if (saved === 'modules') view = 'modules';
  } catch {
    /* localStorage 不可用时默认章节视图 */
  }
  if (view === 'modules') {
    showModulesView();
  } else {
    showChapterView();
  }
}

function showChapterView(): void {
  const chaptersNav = document.getElementById('sidebar-chapters-panel');
  const allModulesPanel = document.getElementById('sidebar-all-modules-panel');

  chaptersNav?.classList.remove('is-hidden');
  allModulesPanel?.classList.add('is-hidden');
  updateTabsActive('chapters');
  persistView('chapters');
}

function showModulesView(): void {
  const chaptersNav = document.getElementById('sidebar-chapters-panel');
  const allModulesPanel = document.getElementById('sidebar-all-modules-panel');

  chaptersNav?.classList.add('is-hidden');
  allModulesPanel?.classList.remove('is-hidden');
  updateTabsActive('modules');
  persistView('modules');
}

initSidebar();
document.addEventListener('astro:page-load', initSidebar);

document.addEventListener('fandex-switch-chapters', showChapterView);
document.addEventListener('fandex-switch-modules', showModulesView);
