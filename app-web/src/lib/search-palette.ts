import { t, subscribeLang } from './i18n';

const BASE = import.meta.env.BASE_URL;
const MAX_RESULTS = 10;
const DEBOUNCE_MS = 200;
const RECENT_KEY = 'fandex-recent-docs';
const RECENT_MAX = 5;

interface QuickEntry {
  title: string;
  href: string;
  crumb?: string;
}

interface PagefindData {
  url: string;
  meta: { title?: string };
  excerpt: string;
  breadcrumbs?: Array<{ title?: string }>;
}

interface PagefindAPI {
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<PagefindData> }> }>;
}

let pagefindInstance: PagefindAPI | null = null;
let panel: HTMLDialogElement | null = null;
let inputEl: HTMLInputElement | null = null;
let listEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let debounceTimer: number | undefined;
let activeIndex = -1;

async function loadPagefind(): Promise<PagefindAPI | null> {
  if (pagefindInstance) return pagefindInstance;
  try {
    const mod = await import(/* @vite-ignore */ `${BASE}pagefind/pagefind.js`);
    const pagefind = (mod.default ?? mod) as PagefindAPI;
    pagefindInstance = pagefind;
    return pagefind;
  } catch {
    return null;
  }
}

function readRecent(): QuickEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuickEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: QuickEntry): void {
  if (!entry.href || !entry.title) return;
  const list = readRecent().filter((item) => item.href !== entry.href);
  list.unshift(entry);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    /* localStorage 不可用（隐私模式）时静默降级 */
  }
}

function quickEntries(): QuickEntry[] {
  const entries: QuickEntry[] = [
    { title: t('search.entry.syntax'), href: `${BASE}syntax/`, crumb: t('search.entry.syntaxCrumb') },
    { title: t('search.entry.learningPath'), href: `${BASE}learning-path/`, crumb: t('search.entry.learningPathCrumb') },
    { title: t('search.entry.algorithms'), href: `${BASE}algorithms/`, crumb: t('search.entry.algorithmsCrumb') },
    { title: t('search.entry.problems'), href: `${BASE}algorithms/?view=problems`, crumb: t('search.entry.problemsCrumb') },
    { title: t('search.entry.modules'), href: BASE, crumb: t('search.entry.modulesCrumb') },
  ];
  if (document.querySelector('a[href$="playground/"]')) {
    entries.unshift(
      { title: t('search.entry.gallery'), href: `${BASE}playground/?panel=gallery`, crumb: t('search.entry.galleryCrumb') },
      { title: t('search.entry.playground'), href: `${BASE}playground/`, crumb: t('search.entry.playgroundCrumb') },
    );
  }
  return entries;
}

function renderGroup(label: string, entries: QuickEntry[]): void {
  if (!listEl || entries.length === 0) return;
  const head = document.createElement('li');
  head.className = 'search-palette__group';
  head.setAttribute('role', 'presentation');
  head.textContent = label;
  listEl.appendChild(head);
  entries.forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'search-palette__entry';
    const a = document.createElement('a');
    a.className = 'search-palette__item';
    a.setAttribute('role', 'option');
    a.setAttribute('aria-selected', 'false');
    a.href = entry.href;
    a.innerHTML = `
      <span class="search-palette__title">${entry.title}</span>
      ${entry.crumb ? `<span class="search-palette__crumb">${entry.crumb}</span>` : ''}
    `;
    a.addEventListener('click', () => {
      saveRecent({ title: entry.title, href: entry.href });
      closePalette();
    });
    li.appendChild(a);
    listEl?.appendChild(li);
  });
}

function ensurePanel(): HTMLDialogElement {
  if (panel) return panel;

  panel = document.createElement('dialog');
  panel.className = 'search-palette';
  panel.setAttribute('aria-label', t('search.title'));
  panel.innerHTML = `
    <div class="search-palette__head">
      <span class="search-palette__mark" aria-hidden="true"></span>
      <input
        class="search-palette__input"
        type="search"
        placeholder="${t('search.placeholder')}"
        aria-label="${t('search.inputAria')}"
        autocomplete="off"
        spellcheck="false"
      />
      <kbd class="search-palette__kbd">Esc</kbd>
    </div>
    <div class="search-palette__status" role="status"></div>
    <ul class="search-palette__list" role="listbox" aria-label="${t('search.resultsAria')}"></ul>
    <div class="search-palette__foot">${t('search.foot')}</div>
  `;
  document.body.appendChild(panel);

  inputEl = panel.querySelector('.search-palette__input');
  listEl = panel.querySelector('.search-palette__list');
  statusEl = panel.querySelector('.search-palette__status');

  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === panel) closePalette();
  });
  panel.addEventListener('close', () => {
    activeIndex = -1;
  });

  inputEl?.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void runSearch(inputEl?.value.trim() ?? '');
    }, DEBOUNCE_MS);
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = listEl?.querySelectorAll<HTMLAnchorElement>('.search-palette__item');
      if (!items || items.length === 0) return;
      const delta = e.key === 'ArrowDown' ? 1 : -1;
      activeIndex = (activeIndex + delta + items.length) % items.length;
      items.forEach((item, index) => item.setAttribute('aria-selected', String(index === activeIndex)));
      items[activeIndex]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const items = listEl?.querySelectorAll<HTMLAnchorElement>('.search-palette__item');
      const target = items?.[Math.max(0, activeIndex)];
      if (target) {
        e.preventDefault();
        target.click();
      }
    }
  });

  return panel;
}

async function runSearch(query: string): Promise<void> {
  if (!listEl || !statusEl) return;
  if (!query) {
    renderEmptyView();
    return;
  }

  const pagefind = await loadPagefind();
  if (!pagefind) {
    statusEl.textContent = t('search.noIndex');
    return;
  }

  statusEl.textContent = t('search.searching');
  try {
    const { results } = await pagefind.search(query);
    const datas = await Promise.all(results.slice(0, MAX_RESULTS).map((r) => r.data()));
    listEl.innerHTML = '';
    activeIndex = datas.length > 0 ? 0 : -1;

    if (datas.length === 0) {
      statusEl.textContent = t('search.noResults', { q: query });
      renderGroup(t('search.features'), quickEntries());
      selectFirstItem();
      return;
    }
    statusEl.textContent = t('search.resultCount', { n: results.length });

    datas.forEach((data) => {
      const li = document.createElement('li');
      li.className = 'search-palette__entry';
      const a = document.createElement('a');
      a.className = 'search-palette__item';
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      const href = data.url.startsWith(BASE) ? data.url : `${BASE}${data.url.replace(/^\//, '')}`;
      a.href = href;
      const crumb = data.breadcrumbs?.map((b) => b.title).filter(Boolean).join(' / ');
      a.innerHTML = `
        <span class="search-palette__title">${data.meta?.title ?? t('search.untitled')}</span>
        ${crumb ? `<span class="search-palette__crumb">${crumb}</span>` : ''}
        <span class="search-palette__excerpt">${data.excerpt}</span>
      `;
      a.addEventListener('click', () => {
        saveRecent({ title: data.meta?.title ?? t('search.untitled'), href });
        closePalette();
      });
      li.appendChild(a);
      listEl?.appendChild(li);
    });
    selectFirstItem();
  } catch {
    statusEl.textContent = t('search.searchFailed');
  }
}

function selectFirstItem(): void {
  if (!listEl) return;
  const first = listEl.querySelector<HTMLAnchorElement>('.search-palette__item');
  if (!first) {
    activeIndex = -1;
    return;
  }
  const items = listEl.querySelectorAll<HTMLAnchorElement>('.search-palette__item');
  items.forEach((item) => item.setAttribute('aria-selected', 'false'));
  first.setAttribute('aria-selected', 'true');
  activeIndex = 0;
}

function renderEmptyView(): void {
  if (!listEl || !statusEl) return;
  listEl.innerHTML = '';
  const recent = readRecent();
  renderGroup(t('search.recent'), recent);
  renderGroup(t('search.features'), quickEntries());
  if (recent.length === 0) {
    statusEl.textContent = t('search.startHint');
  } else {
    statusEl.textContent = t('search.recentHint');
  }
  selectFirstItem();
}

function openPalette(): void {
  const dialog = ensurePanel();
  if (dialog.open) return;
  dialog.showModal();
  if (inputEl) {
    inputEl.value = '';
    inputEl.focus();
  }
  renderEmptyView();
}

function closePalette(): void {
  if (!panel) return;
  if (panel.open) panel.close();
  panel.remove();
  panel = null;
  inputEl = null;
  listEl = null;
  statusEl = null;
}

if (!import.meta.env.SSR && typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (panel?.open) {
      closePalette();
    } else {
      openPalette();
    }
  }
});

function bindTrigger(): void {
  document.querySelectorAll<HTMLElement>('[data-search-trigger]').forEach((btn) => {
    btn.addEventListener('click', openPalette);
  });
}
bindTrigger();
document.addEventListener('astro:page-load', bindTrigger);

document.addEventListener('astro:before-swap', () => {
  closePalette();
});

document.addEventListener('astro:page-load', () => {
  document.querySelectorAll('dialog.search-palette:not([open])').forEach((el) => el.remove());
});

subscribeLang(() => {
  if (panel?.open) {
    void runSearch(inputEl?.value.trim() ?? '');
  }
});

document.addEventListener('astro:page-load', () => {
  const titleEl = document.querySelector<HTMLElement>('.doc-title');
  if (!titleEl) return;
  const title = document.title.split(' | ')[0] || titleEl.textContent?.trim() || '';
  if (title) saveRecent({ title, href: window.location.pathname });
});
}
