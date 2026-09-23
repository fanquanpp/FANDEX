
import { countMarks, pruneProblemMarks, readFilterContext, readProblemMarks, saveFilterContext, toggleProblemMark } from '@/lib/ap-progress';
import { t } from '@/lib/i18n';

type StatusFilter = 'all' | 'solved' | 'review';

interface FilterState {
  cat: string;
  diff: string;
  status: StatusFilter;
  q: string;
}

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const cleanups: Array<() => void> = [];

function readStateFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  const status = params.get('status') ?? 'all';
  return {
    cat: params.get('cat') ?? 'all',
    diff: params.get('diff') ?? 'all',
    status: status === 'solved' || status === 'review' ? status : 'all',
    q: params.get('q') ?? '',
  };
}

function syncUrl(state: FilterState): void {
  const params = new URLSearchParams();
  const view = new URLSearchParams(window.location.search).get('view');
  if (view) params.set('view', view);
  if (state.cat !== 'all') params.set('cat', state.cat);
  if (state.diff !== 'all') params.set('diff', state.diff);
  if (state.status !== 'all') params.set('status', state.status);
  if (state.q.trim()) params.set('q', state.q.trim());
  const search = params.toString();
  history.replaceState(
    null,
    '',
    search ? `${window.location.pathname}?${search}` : window.location.pathname,
  );
}

function setActiveChip(root: HTMLElement, attr: string, value: string): void {
  const key = `filter${attr.charAt(0).toUpperCase()}${attr.slice(1)}`;
  root.querySelectorAll<HTMLButtonElement>(`[data-filter-${attr}]`).forEach((chip) => {
    const active = (chip.dataset[key] ?? '') === value;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
}

function refreshStatusCounts(root: HTMLElement): void {
  const counts = countMarks();
  root.querySelectorAll<HTMLElement>('[data-ap-status-count]').forEach((el) => {
    const key = el.dataset.apStatusCount;
    if (key === 'solved') el.textContent = String(counts.solved);
    if (key === 'review') el.textContent = String(counts.review);
  });
}

function applyFilter(root: HTMLElement, state: FilterState): void {
  const items = root.querySelectorAll<HTMLElement>('[data-algo-item]');
  const query = state.q.trim().toLowerCase();
  let shown = 0;
  items.forEach((item) => {
    const okCat = state.cat === 'all' || item.dataset.cat === state.cat;
    const okDiff = state.diff === 'all' || item.dataset.diff === state.diff;
    const okQuery = !query || (item.dataset.search ?? '').includes(query);
    let okStatus = true;
    if (state.status !== 'all') {
      const marks = readProblemMarks(item.dataset.slug ?? '');
      okStatus = state.status === 'solved' ? Boolean(marks.solved) : Boolean(marks.review);
    }
    const visible = okCat && okDiff && okQuery && okStatus;
    item.hidden = !visible;
    if (visible) shown += 1;
  });

  const counter = root.querySelector('[data-filter-count]');
  if (counter) {
    counter.textContent = t('ap.hitCount', { s: shown, t: items.length });
  }
  const empty = root.querySelector<HTMLElement>('[data-ap-empty]');
  if (empty) empty.hidden = shown !== 0;

  syncUrl(state);
}

function initProblemsFilter(): void {
  const root = document.querySelector<HTMLElement>('[data-algo-problems]');
  if (!root || root.dataset.filterBound === 'true') return;
  root.dataset.filterBound = 'true';

  const state = readStateFromUrl();
  setActiveChip(root, 'cat', state.cat);
  setActiveChip(root, 'diff', state.diff);
  setActiveChip(root, 'status', state.status);
  const searchInput = root.querySelector<HTMLInputElement>('[data-filter-search]');
  if (searchInput) searchInput.value = state.q;
  // 题库重组后本地标记可能残留已下线题目：先按当前题表修剪再计数与过滤
  const validSlugs = new Set<string>();
  root.querySelectorAll<HTMLElement>('[data-algo-item]').forEach((item) => {
    if (item.dataset.slug) validSlugs.add(item.dataset.slug);
  });
  pruneProblemMarks(validSlugs);
  refreshStatusCounts(root);
  applyFilter(root, state);

  const onChipClick = (attr: 'cat' | 'diff' | 'status') => (event: Event) => {
    const key = `filter${attr.charAt(0).toUpperCase()}${attr.slice(1)}`;
    const chip = (event.currentTarget as HTMLElement).dataset[key];
    if (!chip) return;
    (state as Record<keyof FilterState, string>)[attr] = chip;
    setActiveChip(root, attr, chip);
    applyFilter(root, state);
  };
  const onCatClick = onChipClick('cat');
  const onDiffClick = onChipClick('diff');
  const onStatusClick = onChipClick('status');
  root.querySelectorAll('[data-filter-cat]').forEach((chip) => chip.addEventListener('click', onCatClick));
  root.querySelectorAll('[data-filter-diff]').forEach((chip) => chip.addEventListener('click', onDiffClick));
  root.querySelectorAll('[data-filter-status]').forEach((chip) => chip.addEventListener('click', onStatusClick));

  const onMarkClick = (event: Event) => {
    const btn = event.currentTarget as HTMLElement;
    const item = btn.closest<HTMLElement>('[data-algo-item]');
    if (!item) return;
    const mark = btn.dataset.mark;
    if (mark !== 'solved' && mark !== 'review') return;
    const marks = toggleProblemMark(item.dataset.slug ?? '', mark);
    syncItemMarks(item, marks);
    refreshStatusCounts(root);
    applyFilter(root, state);
  };
  root.querySelectorAll('[data-mark]').forEach((btn) => btn.addEventListener('click', onMarkClick));

  const onClearQuery = () => {
    state.q = '';
    if (searchInput) searchInput.value = '';
    applyFilter(root, state);
  };
  const onResetAll = () => {
    state.cat = 'all';
    state.diff = 'all';
    state.status = 'all';
    state.q = '';
    if (searchInput) searchInput.value = '';
    setActiveChip(root, 'cat', 'all');
    setActiveChip(root, 'diff', 'all');
    setActiveChip(root, 'status', 'all');
    applyFilter(root, state);
  };
  root.querySelector('[data-ap-clear-q]')?.addEventListener('click', onClearQuery);
  root.querySelector('[data-ap-reset]')?.addEventListener('click', onResetAll);

  const onSearchInput = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput?.value ?? '';
      applyFilter(root, state);
    }, 150);
  };
  searchInput?.addEventListener('input', onSearchInput);

  const onCardClick = () => {
    saveFilterContext(window.location.search);
  };
  root.querySelectorAll('[data-algo-item] a').forEach((link) => link.addEventListener('click', onCardClick));

  cleanups.push(() => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    root.querySelectorAll('[data-filter-cat]').forEach((chip) => chip.removeEventListener('click', onCatClick));
    root.querySelectorAll('[data-filter-diff]').forEach((chip) => chip.removeEventListener('click', onDiffClick));
    root.querySelectorAll('[data-filter-status]').forEach((chip) => chip.removeEventListener('click', onStatusClick));
    root.querySelectorAll('[data-mark]').forEach((btn) => btn.removeEventListener('click', onMarkClick));
    root.querySelectorAll('[data-algo-item] a').forEach((link) => link.removeEventListener('click', onCardClick));
    searchInput?.removeEventListener('input', onSearchInput);
  });
}

function syncItemMarks(item: HTMLElement, marks: { solved?: boolean; review?: boolean }): void {
  item.querySelectorAll<HTMLElement>('[data-mark]').forEach((btn) => {
    const on = btn.dataset.mark === 'solved' ? Boolean(marks.solved) : Boolean(marks.review);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

function cleanupProblemsFilter(): void {
  cleanups.splice(0).forEach((fn) => fn());
}

function initProblemDetailProgress(): void {
  const root = document.querySelector<HTMLElement>('[data-apd-progress]');
  if (!root || root.dataset.progressBound === 'true') return;
  root.dataset.progressBound = 'true';

  const slug = root.dataset.apdSlug ?? '';

  const sync = () => {
    const marks = readProblemMarks(slug);
    root.querySelectorAll<HTMLElement>('[data-ap-detail-mark]').forEach((btn) => {
      const mark = btn.dataset.apDetailMark;
      const on = mark === 'solved' ? Boolean(marks.solved) : Boolean(marks.review);
      btn.classList.toggle('is-on', on);
      btn.setAttribute('aria-pressed', String(on));
    });
  };
  sync();

  root.querySelectorAll('[data-ap-detail-mark]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mark = (btn as HTMLElement).dataset.apDetailMark;
      if (mark !== 'solved' && mark !== 'review') return;
      toggleProblemMark(slug, mark);
      sync();
    });
  });

  const backLink = document.querySelector<HTMLAnchorElement>('[data-apd-back]');
  if (backLink) {
    const context = readFilterContext();
    if (context && context !== '?') {
      const url = new URL(backLink.href);
      const extra = new URLSearchParams(context.startsWith('?') ? context.slice(1) : context);
      extra.forEach((value, key) => url.searchParams.set(key, value));
      backLink.href = `${url.pathname}${url.search}`;
    }
  }
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    initProblemsFilter();
    initProblemDetailProgress();
  });
  document.addEventListener('astro:before-swap', cleanupProblemsFilter);
}
