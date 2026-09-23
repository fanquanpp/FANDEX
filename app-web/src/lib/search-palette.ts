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
// 递增序号：异步搜索返回时丢弃过期结果，防止慢查询后到覆盖新结果
let searchSeq = 0;

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
    // 用 textContent 组装，标题/面包屑不经 HTML 转义即可安全插入
    const title = document.createElement('span');
    title.className = 'search-palette__title';
    title.textContent = entry.title;
    a.appendChild(title);
    if (entry.crumb) {
      const crumb = document.createElement('span');
      crumb.className = 'search-palette__crumb';
      crumb.textContent = entry.crumb;
      a.appendChild(crumb);
    }
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

  const seq = ++searchSeq;
  // 捕获本轮引用：面板可能在 await 期间被关闭（closePalette 置空模块引用），
  // 之后只写捕获的节点，写前校验引用是否已换代
  const status = statusEl;
  const list = listEl;
  const pagefind = await loadPagefind();
  if (!status || statusEl !== status || listEl !== list) return;
  if (!pagefind) {
    status.textContent = t('search.noIndex');
    return;
  }

  status.textContent = t('search.searching');
  try {
    const { results } = await pagefind.search(query);
    const datas = await Promise.all(results.slice(0, MAX_RESULTS).map((r) => r.data()));
    // 过期响应：期间用户又输入了新查询，或面板已关闭/重建，直接丢弃本轮结果
    if (seq !== searchSeq || statusEl !== status || listEl !== list) return;
    list.innerHTML = '';
    activeIndex = datas.length > 0 ? 0 : -1;

    if (datas.length === 0) {
      status.textContent = t('search.noResults', { q: query });
      renderGroup(t('search.features'), quickEntries());
      selectFirstItem();
      return;
    }
    status.textContent = t('search.resultCount', { n: results.length });

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
      // 标题/面包屑是纯文本，经 textContent 插入；excerpt 是 Pagefind 构建期产出的
      // 受控 HTML（仅含 <mark> 标记），按其 API 约定经 innerHTML 插入
      const title = document.createElement('span');
      title.className = 'search-palette__title';
      title.textContent = data.meta?.title ?? t('search.untitled');
      a.appendChild(title);
      if (crumb) {
        const crumbEl = document.createElement('span');
        crumbEl.className = 'search-palette__crumb';
        crumbEl.textContent = crumb;
        a.appendChild(crumbEl);
      }
      const excerpt = document.createElement('span');
      excerpt.className = 'search-palette__excerpt';
      excerpt.innerHTML = data.excerpt;
      a.appendChild(excerpt);
      a.addEventListener('click', () => {
        saveRecent({ title: data.meta?.title ?? t('search.untitled'), href });
        closePalette();
      });
      li.appendChild(a);
      listEl?.appendChild(li);
    });
    selectFirstItem();
  } catch {
    if (seq === searchSeq && statusEl === status) {
      status.textContent = t('search.searchFailed');
    }
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
        return;
      }
      // 前端实验室等页面有自己的模态弹层（引导 / 画廊 / 作品库抽屉），
      // 此时不要抢焦点打开搜索面板
      const otherModalOpen = document.querySelector('.pg-keys-mask, .pg-sc-mask, .pg-drawer-mask');
      if (!otherModalOpen) {
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
  // 面板 chrome（aria-label / placeholder / 页脚）在创建时定格，
  // 语言切换后直接关闭，下次打开按新语言重建
  if (panel) closePalette();
});

document.addEventListener('astro:page-load', () => {
  const titleEl = document.querySelector<HTMLElement>('.doc-title');
  if (!titleEl) return;
  const title = document.title.split(' | ')[0] || titleEl.textContent?.trim() || '';
  if (title) saveRecent({ title, href: window.location.pathname });
});
}
