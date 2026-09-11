/**
 * 全站搜索命令面板（pagefind 驱动）
 * =============================================================================
 * 功能概述：
 * - Ctrl/Cmd + K 或点击导航搜索按钮打开命令面板，全文检索全站文档
 * - 索引由 pagefind 在构建后生成（dist/pagefind/，见 package.json build 脚本），
 *   首次打开面板时惰性加载 pagefind 运行时，未加载成功（如 dev 环境）时给出提示
 * - 输入防抖 200ms，展示标题/面包屑/摘要片段，支持上下键选择、Enter 跳转
 * - 与 View Transitions 兼容：面板 DOM 按需创建，keydown 绑定在 window 上
 *   （ClientRouter 导航不重执行模块脚本，监听器天然持久）
 *
 * 设计原则：
 * - 零框架依赖的纯 DOM 实现，不增加任何岛屿水合成本
 * - 索引与运行时全部同源静态文件，无外部服务
 * =============================================================================
 */

/** 站点基础路径（与 import.meta.env.BASE_URL 一致，构建期内联） */
const BASE = import.meta.env.BASE_URL;
/** 每次展示的最大结果数 */
const MAX_RESULTS = 10;
/** 输入防抖时长（毫秒） */
const DEBOUNCE_MS = 200;
/** 最近浏览存储键（localStorage） */
const RECENT_KEY = 'fandex-recent-docs';
/** 最近浏览保留条数 */
const RECENT_MAX = 5;

/** 快捷条目最小结构（最近浏览与功能入口共用） */
interface QuickEntry {
  title: string;
  href: string;
  crumb?: string;
}

/** pagefind 结果条目的最小结构声明 */
interface PagefindData {
  /** 页面地址（相对 dist 根目录） */
  url: string;
  /** 页面元信息 */
  meta: { title?: string };
  /** 高亮摘要 HTML */
  excerpt: string;
  /** 面包屑（pagefind 内置层级） */
  breadcrumbs?: Array<{ title?: string }>;
}

/** pagefind 模块的最小接口声明 */
interface PagefindAPI {
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<PagefindData> }> }>;
}

/** 已加载的 pagefind 实例缓存 */
let pagefindInstance: PagefindAPI | null = null;
/** 面板 DOM 引用（按需创建） */
let panel: HTMLDialogElement | null = null;
/** 输入框引用 */
let inputEl: HTMLInputElement | null = null;
/** 结果容器引用 */
let listEl: HTMLElement | null = null;
/** 状态提示引用 */
let statusEl: HTMLElement | null = null;
/** 防抖计时器 */
let debounceTimer: number | undefined;
/** 当前键盘焦点在结果列表中的下标 */
let activeIndex = -1;

/**
 * 惰性加载 pagefind 运行时
 * @returns pagefind API；索引不存在（dev 环境）时返回 null
 */
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

/**
 * 读取最近浏览记录
 * @returns 最近浏览条目（新在前，最多 RECENT_MAX 条）
 */
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

/**
 * 写入一条最近浏览记录：按 href 去重、新条目置顶、超出上限截断
 */
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

/**
 * 功能入口分组数据
 * 在线编程仅在 web 构建（页面中存在 playground 链接）时展示，
 * 桌面端构建无此项，运行时探测即可，无需注入构建标记
 */
function quickEntries(): QuickEntry[] {
  const entries: QuickEntry[] = [
    { title: '语法速览', href: `${BASE}syntax/`, crumb: '语法快速查阅' },
    { title: '学习路线', href: `${BASE}learning-path/`, crumb: '系统化学习路径' },
    { title: '模块总览', href: BASE, crumb: '全部分类与模块' },
  ];
  // 在线编程与灵感图鉴成对出现：桌面端构建无 playground 页面时一并隐藏
  if (document.querySelector('a[href$="playground/"]')) {
    entries.unshift(
      { title: '灵感图鉴', href: `${BASE}playground/editor/?panel=gallery`, crumb: '25 个设计成品' },
      { title: '在线编程', href: `${BASE}playground/`, crumb: '在线编写与运行代码' },
    );
  }
  return entries;
}

/**
 * 渲染一个结果分组（组标签 + 条目列表），返回本组首个可选条目
 * @param label - 组标签（如「最近浏览」「功能入口」）
 * @param entries - 组内条目
 */
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
    // 点击后记录最近浏览并关闭面板，交给 ClientRouter 完成跳转
    a.addEventListener('click', () => {
      saveRecent({ title: entry.title, href: entry.href });
      closePalette();
    });
    li.appendChild(a);
    listEl?.appendChild(li);
  });
}

/**
 * 创建面板 DOM 结构（仅首次调用时执行）
 */
function ensurePanel(): HTMLDialogElement {
  if (panel) return panel;

  panel = document.createElement('dialog');
  panel.className = 'search-palette';
  panel.setAttribute('aria-label', '全站搜索');
  panel.innerHTML = `
    <div class="search-palette__head">
      <span class="search-palette__mark" aria-hidden="true"></span>
      <input
        class="search-palette__input"
        type="search"
        placeholder="搜索文档、语法与知识点"
        aria-label="搜索关键词"
        autocomplete="off"
        spellcheck="false"
      />
      <kbd class="search-palette__kbd">Esc</kbd>
    </div>
    <div class="search-palette__status" role="status"></div>
    <ul class="search-palette__list" role="listbox" aria-label="搜索结果"></ul>
    <div class="search-palette__foot">上下键选择 · Enter 打开 · Esc 关闭</div>
  `;
  document.body.appendChild(panel);

  inputEl = panel.querySelector('.search-palette__input');
  listEl = panel.querySelector('.search-palette__list');
  statusEl = panel.querySelector('.search-palette__status');

  // 关闭行为：点击遮罩或 Esc（dialog 原生支持 Esc 关闭）
  panel.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target === panel) closePalette();
  });
  panel.addEventListener('close', () => {
    activeIndex = -1;
  });

  // 输入防抖搜索
  inputEl?.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      void runSearch(inputEl?.value.trim() ?? '');
    }, DEBOUNCE_MS);
  });

  // 键盘导航：上下选择，Enter 打开
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

/**
 * 执行搜索并渲染结果
 * @param query - 搜索关键词；空串时渲染最近浏览与功能入口分组
 */
async function runSearch(query: string): Promise<void> {
  if (!listEl || !statusEl) return;
  if (!query) {
    renderEmptyView();
    return;
  }

  const pagefind = await loadPagefind();
  if (!pagefind) {
    statusEl.textContent = '搜索索引不可用（本地开发环境请先执行完整构建）';
    return;
  }

  statusEl.textContent = '检索中';
  try {
    const { results } = await pagefind.search(query);
    const datas = await Promise.all(results.slice(0, MAX_RESULTS).map((r) => r.data()));
    listEl.innerHTML = '';
    activeIndex = datas.length > 0 ? 0 : -1;

    if (datas.length === 0) {
      // 无结果态：明确告知未命中，并保留功能入口分组作为出口，不让面板留白
      statusEl.textContent = `未找到与「${query}」相关的内容，试试更短的关键词`;
      renderGroup('功能入口', quickEntries());
      selectFirstItem();
      return;
    }
    statusEl.textContent = `共 ${results.length} 条结果`;

    datas.forEach((data) => {
      const li = document.createElement('li');
      li.className = 'search-palette__entry';
      const a = document.createElement('a');
      a.className = 'search-palette__item';
      a.setAttribute('role', 'option');
      a.setAttribute('aria-selected', 'false');
      // pagefind 地址相对 dist 根目录，补齐站点 base 前缀
      const href = data.url.startsWith(BASE) ? data.url : `${BASE}${data.url.replace(/^\//, '')}`;
      a.href = href;
      const crumb = data.breadcrumbs?.map((b) => b.title).filter(Boolean).join(' / ');
      a.innerHTML = `
        <span class="search-palette__title">${data.meta?.title ?? '未命名文档'}</span>
        ${crumb ? `<span class="search-palette__crumb">${crumb}</span>` : ''}
        <span class="search-palette__excerpt">${data.excerpt}</span>
      `;
      // 点击后记录最近浏览并关闭面板，交给 ClientRouter 完成跳转
      a.addEventListener('click', () => {
        saveRecent({ title: data.meta?.title ?? '未命名文档', href });
        closePalette();
      });
      li.appendChild(a);
      listEl?.appendChild(li);
    });
    selectFirstItem();
  } catch {
    statusEl.textContent = '检索失败，请稍后重试';
  }
}

/** 将列表中首个可选条目置为选中（键盘 Enter 直接打开） */
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

/**
 * 渲染空查询视图：最近浏览（如有）+ 功能入口两组
 */
function renderEmptyView(): void {
  if (!listEl || !statusEl) return;
  listEl.innerHTML = '';
  const recent = readRecent();
  renderGroup('最近浏览', recent);
  renderGroup('功能入口', quickEntries());
  if (recent.length === 0) {
    statusEl.textContent = '输入关键词开始检索，或从下方入口进入';
  } else {
    statusEl.textContent = '最近浏览与功能入口';
  }
  selectFirstItem();
}

/** 打开面板并聚焦输入框 */
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

/** 关闭面板并彻底销毁 DOM：杜绝任何"残留背景"路径（下次打开时重建） */
function closePalette(): void {
  if (!panel) return;
  if (panel.open) panel.close();
  panel.remove();
  panel = null;
  inputEl = null;
  listEl = null;
  statusEl = null;
}

// SSR/预渲染环境不执行任何 DOM 逻辑（Astro 构建期会求值页面脚本模块）
if (!import.meta.env.SSR && typeof window !== 'undefined') {
  // 全局快捷键：Ctrl/Cmd + K 打开（window 级绑定，ClientRouter 导航后依然有效）
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

// 导航栏搜索按钮（存在时）触发打开；View Transitions 切页后重新绑定
function bindTrigger(): void {
  document.querySelectorAll<HTMLElement>('[data-search-trigger]').forEach((btn) => {
    btn.addEventListener('click', openPalette);
  });
}
bindTrigger();
document.addEventListener('astro:page-load', bindTrigger);

// View Transitions 路由切换前销毁面板，避免旧页面实例残留
document.addEventListener('astro:before-swap', () => {
  closePalette();
});

// 防御性清扫：移除任何游离在文档中的关闭态面板（异常路径兜底）
document.addEventListener('astro:page-load', () => {
  document.querySelectorAll('dialog.search-palette:not([open])').forEach((el) => el.remove());
});

// 最近浏览自动记录：文档阅读页加载时写入一条浏览历史，
// 供下次打开命令面板时以「最近浏览」分组置顶展示
document.addEventListener('astro:page-load', () => {
  const titleEl = document.querySelector<HTMLElement>('.doc-title');
  if (!titleEl) return;
  const title = document.title.split(' | ')[0] || titleEl.textContent?.trim() || '';
  if (title) saveRecent({ title, href: window.location.pathname });
});
}
