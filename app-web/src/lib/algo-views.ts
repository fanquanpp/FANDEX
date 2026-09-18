/**
 * 算法教学页双视图直切（教程课程表 / 算法题图鉴）
 * -----------------------------------------------------------------------------
 * 背景（2026-09-19 入口扁平化）：原独立子页「算法题图鉴」并入算法教学页，
 * 成为页内第二视图。本脚本负责：
 * 1. 初始化：读取 URL（?view=problems 或 #problems）还原当前视图（深链 / 刷新可用）
 * 2. 切换：点击切换器按钮立即切换视图可见性，并把状态同步到 URL（replaceState，
 *    不产生历史记录，浏览器返回键语义保持"离开本页"）
 * 3. 切换后把滚动容器回到顶部，让新视图的筛选栏 / 章节头首屏可见
 *
 * 兼容 ClientRouter：astro:page-load 重新绑定（dataset 防重入）。
 * 未加载 JS 时降级可用：默认渲染教程视图，?view=problems 深链由
 * astro:page-load 后的首次初始化兜底（首帧闪烁可接受）。
 */

/** 视图标识 */
type AlgoView = 'tutorials' | 'problems';

/** 从 URL 还原当前视图（query 优先，兼容 #problems 锚点形式） */
function readViewFromUrl(): AlgoView {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') === 'problems' || window.location.hash === '#problems') {
    return 'problems';
  }
  return 'tutorials';
}

/** 应用视图：切换器选中态 + 视图容器可见性 */
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

/** 把视图状态同步到 URL（保留筛选等其他查询参数；教程视图不携带 view 参数） */
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

/** 绑定视图切换交互（每次页面切换后由 astro:page-load 调用） */
function initAlgoViews(): void {
  const root = document.querySelector<HTMLElement>('[data-algo-page]');
  if (!root || root.dataset.viewSwitchBound === 'true') return;
  root.dataset.viewSwitchBound = 'true';

  // 初始还原：深链 / 刷新 / ClientRouter 跳转（含 hero「题图鉴」链接）统一走这里
  applyView(root, readViewFromUrl());

  root.querySelectorAll<HTMLButtonElement>('[data-view-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const view = tab.dataset.viewTab as AlgoView | undefined;
      if (!view || view === readViewFromUrl()) return;
      applyView(root, view);
      syncViewUrl(view);
      // 滚动容器为 .home-main（HomeLayout 内部滚动架构），回到顶部露出新视图头部
      const scroller = document.querySelector<HTMLElement>('.home-main');
      if (scroller) scroller.scrollTo({ top: 0 });
    });
  });
}

// 浏览器专属代码：模块顶层执行守卫，避免构建期求值报错
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initAlgoViews);
}
