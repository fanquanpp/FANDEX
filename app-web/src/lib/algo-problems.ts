/**
 * 算法题图鉴列表页交互脚本（web 端）
 * -----------------------------------------------------------------------------
 * 职责：
 * 1. 分类 / 难度筛选：芯片点击切换，卡片按 data-cat / data-diff 过滤
 * 2. 关键词搜索：题名 / 英文名 / 标签 / 摘要的子串匹配（150ms 防抖）
 * 3. 命中计数与空状态展示
 * 4. 状态同步到 URL 查询参数（?cat=&diff=&q=），支持分享与刷新恢复
 *
 * 兼容 ClientRouter：astro:page-load 重新绑定（dataset 防重入），
 * astro:before-swap 移除 document 级监听器并清理定时器。
 */

/** 当前筛选状态 */
interface FilterState {
  cat: string;
  diff: string;
  q: string;
}

/** 搜索防抖定时器（页面清理时置空） */
let searchTimer: ReturnType<typeof setTimeout> | null = null;
/** before-swap 清理函数列表 */
const cleanups: Array<() => void> = [];

/** 从 URL 查询参数恢复初始筛选状态（默认全量） */
function readStateFromUrl(): FilterState {
  const params = new URLSearchParams(window.location.search);
  return {
    cat: params.get('cat') ?? 'all',
    diff: params.get('diff') ?? 'all',
    q: params.get('q') ?? '',
  };
}

/** 把筛选状态同步到 URL（默认值不写入，保持地址干净） */
function syncUrl(state: FilterState): void {
  const params = new URLSearchParams();
  if (state.cat !== 'all') params.set('cat', state.cat);
  if (state.diff !== 'all') params.set('diff', state.diff);
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

/** 应用筛选：遍历卡片计算可见性，更新计数与空状态，并同步 URL */
function applyFilter(root: HTMLElement, state: FilterState): void {
  const cards = root.querySelectorAll<HTMLElement>('[data-algo-card]');
  const query = state.q.trim().toLowerCase();
  let shown = 0;
  cards.forEach((card) => {
    const okCat = state.cat === 'all' || card.dataset.cat === state.cat;
    const okDiff = state.diff === 'all' || card.dataset.diff === state.diff;
    const okQuery = !query || (card.dataset.search ?? '').includes(query);
    const visible = okCat && okDiff && okQuery;
    card.hidden = !visible;
    if (visible) shown += 1;
  });

  const counter = root.querySelector('[data-filter-count]');
  if (counter) {
    counter.textContent = `命中 ${shown} / ${cards.length} 道题`;
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
  const searchInput = root.querySelector<HTMLInputElement>('[data-filter-search]');
  if (searchInput) searchInput.value = state.q;
  applyFilter(root, state);

  // 分类 / 难度芯片：点击更新状态并重筛
  const onChipClick = (attr: 'cat' | 'diff') => (event: Event) => {
    const key = `filter${attr.charAt(0).toUpperCase()}${attr.slice(1)}`;
    const chip = (event.currentTarget as HTMLElement).dataset[key];
    if (!chip) return;
    state[attr] = chip;
    setActiveChip(root, attr, chip);
    applyFilter(root, state);
  };
  const onCatClick = onChipClick('cat');
  const onDiffClick = onChipClick('diff');
  root.querySelectorAll('[data-filter-cat]').forEach((chip) => chip.addEventListener('click', onCatClick));
  root.querySelectorAll('[data-filter-diff]').forEach((chip) => chip.addEventListener('click', onDiffClick));

  // 搜索框：150ms 防抖后重筛
  const onSearchInput = () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.q = searchInput?.value ?? '';
      applyFilter(root, state);
    }, 150);
  };
  searchInput?.addEventListener('input', onSearchInput);

  // 页面切换前清理：document 级监听器与防抖定时器
  cleanups.push(() => {
    if (searchTimer) {
      clearTimeout(searchTimer);
      searchTimer = null;
    }
    root.querySelectorAll('[data-filter-cat]').forEach((chip) => chip.removeEventListener('click', onCatClick));
    root.querySelectorAll('[data-filter-diff]').forEach((chip) => chip.removeEventListener('click', onDiffClick));
    searchInput?.removeEventListener('input', onSearchInput);
  });
}

/** before-swap 统一清理入口 */
function cleanupProblemsFilter(): void {
  cleanups.splice(0).forEach((fn) => fn());
}

// 浏览器专属代码：模块顶层执行守卫，避免构建期求值报错
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initProblemsFilter);
  document.addEventListener('astro:before-swap', cleanupProblemsFilter);
}
