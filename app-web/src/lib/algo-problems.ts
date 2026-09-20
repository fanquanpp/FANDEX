/**
 * 算法题图鉴视图交互脚本（web 端，挂载于算法教学页 ?view=problems 视图）
 * -----------------------------------------------------------------------------
 * 职责：
 * 1. 分类 / 难度 / 本机进度筛选：芯片点击切换，卡片按 data-cat / data-diff
 *    与 localStorage 进度（lib/ap-progress.ts）过滤
 * 2. 关键词搜索：题名 / 英文名 / 标签 / 摘要的子串匹配（150ms 防抖）
 * 3. 命中计数与空状态展示；空态提供"清除关键词 / 重置全部筛选"恢复动作
 * 4. 已掌握 / 待复习标记：卡片角标按钮切换，实时同步状态 chip 计数
 * 5. 状态同步到 URL 查询参数（?cat=&diff=&q=&status=），支持分享与刷新恢复；
 *    跳转详情页前把筛选上下文存 sessionStorage，详情页返回链接据此恢复视图
 *
 * 兼容 ClientRouter：astro:page-load 重新绑定（dataset 防重入），
 * astro:before-swap 移除 document 级监听器并清理定时器。
 */

import { countMarks, readFilterContext, readProblemMarks, saveFilterContext, toggleProblemMark } from '@/lib/ap-progress';
import { t } from '@/lib/i18n';

/** 状态筛选值 */
type StatusFilter = 'all' | 'solved' | 'review';

/** 当前筛选状态 */
interface FilterState {
  cat: string;
  diff: string;
  status: StatusFilter;
  q: string;
}

/** 搜索防抖定时器（页面清理时置空） */
let searchTimer: ReturnType<typeof setTimeout> | null = null;
/** before-swap 清理函数列表 */
const cleanups: Array<() => void> = [];

/** 从 URL 查询参数恢复初始筛选状态（默认全量） */
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

/** 把筛选状态同步到 URL（默认值不写入，保持地址干净） */
function syncUrl(state: FilterState): void {
  const params = new URLSearchParams();
  // 双视图合并后保留视图参数：筛选交互不得把地址打回教程视图
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

/** 更新一组芯片的选中态样式与 aria-pressed */
function setActiveChip(root: HTMLElement, attr: string, value: string): void {
  const key = `filter${attr.charAt(0).toUpperCase()}${attr.slice(1)}`;
  root.querySelectorAll<HTMLButtonElement>(`[data-filter-${attr}]`).forEach((chip) => {
    const active = (chip.dataset[key] ?? '') === value;
    chip.classList.toggle('is-active', active);
    chip.setAttribute('aria-pressed', String(active));
  });
}

/** 刷新状态筛选 chip 的本机计数 */
function refreshStatusCounts(root: HTMLElement): void {
  const counts = countMarks();
  root.querySelectorAll<HTMLElement>('[data-ap-status-count]').forEach((el) => {
    const key = el.dataset.apStatusCount;
    if (key === 'solved') el.textContent = String(counts.solved);
    if (key === 'review') el.textContent = String(counts.review);
  });
}

/** 应用筛选：遍历卡片计算可见性，更新计数与空状态，并同步 URL */
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

/** 绑定题图鉴筛选交互（每次页面切换后由 astro:page-load 调用） */
function initProblemsFilter(): void {
  const root = document.querySelector<HTMLElement>('[data-algo-problems]');
  if (!root || root.dataset.filterBound === 'true') return;
  root.dataset.filterBound = 'true';

  // 初始状态：URL 参数优先，恢复芯片选中态与搜索框内容
  const state = readStateFromUrl();
  setActiveChip(root, 'cat', state.cat);
  setActiveChip(root, 'diff', state.diff);
  setActiveChip(root, 'status', state.status);
  const searchInput = root.querySelector<HTMLInputElement>('[data-filter-search]');
  if (searchInput) searchInput.value = state.q;
  refreshStatusCounts(root);
  applyFilter(root, state);

  // 分类 / 难度 / 状态芯片：点击更新状态并重筛
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

  // 已掌握 / 待复习标记：切换 localStorage 并重筛（状态筛选下卡片可能隐去）
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

  // 空态恢复动作：清除关键词 / 重置全部筛选
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

  // 搜索框：150ms 防抖后重筛
  const onSearchInput = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput?.value ?? '';
      applyFilter(root, state);
    }, 150);
  };
  searchInput?.addEventListener('input', onSearchInput);

  // 卡片跳转详情前：把当前筛选上下文存会话存储，详情页"返回"链接据此恢复
  const onCardClick = () => {
    saveFilterContext(window.location.search);
  };
  root.querySelectorAll('[data-algo-item] a').forEach((link) => link.addEventListener('click', onCardClick));

  // 页面切换前清理：document 级监听器与防抖定时器
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

/** 把单题标记集合同步到卡片的标记按钮选中态 */
function syncItemMarks(item: HTMLElement, marks: { solved?: boolean; review?: boolean }): void {
  item.querySelectorAll<HTMLElement>('[data-mark]').forEach((btn) => {
    const on = btn.dataset.mark === 'solved' ? Boolean(marks.solved) : Boolean(marks.review);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}

/** before-swap 统一清理入口 */
function cleanupProblemsFilter(): void {
  cleanups.splice(0).forEach((fn) => fn());
}

/**
 * 详情页：绑定已掌握 / 待复习标记按钮，并把"返回题图鉴"链接恢复为
 * 离开列表页时的筛选视图（sessionStorage 上下文）
 */
function initProblemDetailProgress(): void {
  const root = document.querySelector<HTMLElement>('[data-apd-progress]');
  if (!root || root.dataset.progressBound === 'true') return;
  root.dataset.progressBound = 'true';

  const slug = root.dataset.apdSlug ?? '';

  // 初始选中态
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

  // 返回链接恢复筛选上下文：默认地址已携带 ?view=problems，
  // 会话上下文按参数名合并（同名字段以离开列表页时的值为准），避免出现双问号
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

// 浏览器专属代码：模块顶层执行守卫，避免构建期求值报错
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', () => {
    initProblemsFilter();
    initProblemDetailProgress();
  });
  document.addEventListener('astro:before-swap', cleanupProblemsFilter);
}

