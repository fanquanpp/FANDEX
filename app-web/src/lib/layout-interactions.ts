/**
 * Layout 布局交互脚本（web 端）
 * -----------------------------------------------------------------------------
 * 从 Layout.astro 提取的客户端交互逻辑，负责：
 * 1. 侧边栏开关：打开/关闭、URL 参数同步、状态恢复
 * 2. 返回顶部按钮：平滑滚动到顶部
 * 3. 全屏模式切换：按钮文字更新与状态持久化
 * 4. 代码块复制按钮：Clipboard API + execCommand 降级
 * 5. 微交互动画：懒加载 animations
 * 7. 监听器清理：View Transitions 切换前移除所有监听器，避免累积
 * 8. Service Worker 注册：支持离线访问
 *
 * 兼容 Astro ClientRouter：所有初始化函数监听 astro:page-load 重新执行
 */

// ========== 侧边栏开关逻辑 ==========
/** 打开侧边栏并同步 URL 参数 */
function openSidebar(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarEl = document.getElementById('app-sidebar');
  document.body.classList.add('sidebar-open');
  sidebarEl?.classList.add('is-open');
  backdrop?.classList.add('is-visible');
  syncSidebarUrl();
}

/** 关闭侧边栏并同步 URL 参数 */
function closeSidebar(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const sidebarEl = document.getElementById('app-sidebar');
  document.body.classList.remove('sidebar-open');
  sidebarEl?.classList.remove('is-open');
  backdrop?.classList.remove('is-visible');
  syncSidebarUrl();
}

/** 将侧边栏开关状态同步到 URL 查询参数，便于刷新后恢复 */
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

/** 从 URL 查询参数恢复侧边栏状态 */
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

/**
 * 初始化侧边栏开关、返回顶部按钮等 DOM 依赖交互
 * 每次 View Transitions 页面切换后重新执行，确保新 DOM 元素绑定监听器
 * 解决原实现监听器仅注册一次、页面切换后按钮失效的问题
 */
function initLayoutInteractions(): void {
  const backdrop = document.getElementById('sidebar-backdrop');
  const toggle = document.getElementById('nav-toggle');
  const mobileBtn = document.getElementById('mobile-sidebar-btn');

  restoreSidebarFromUrl();

  // 顶部菜单按钮：切换章节视图并打开侧边栏
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

  // 移动端模块按钮：切换模块视图并打开侧边栏
  if (mobileBtn && mobileBtn.dataset.bound !== 'true') {
    mobileBtn.dataset.bound = 'true';
    mobileBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('fandex-switch-modules'));
      openSidebar();
    });
  }

  // 点击遮罩层关闭侧边栏
  if (backdrop && backdrop.dataset.bound !== 'true') {
    backdrop.dataset.bound = 'true';
    backdrop.addEventListener('click', closeSidebar);
  }

  // 返回顶部按钮：每次页面切换后重新绑定（原实现仅注册一次，View Transitions 后失效）
  const backToTopBtn = document.getElementById('nav-back-to-top');
  const mainEl = document.getElementById('app-main');
  if (backToTopBtn && mainEl && backToTopBtn.dataset.bound !== 'true') {
    backToTopBtn.dataset.bound = 'true';
    backToTopBtn.addEventListener('click', () => {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
}

// ========== 全屏模式切换 ==========
// 注：onFullscreenChange 提升到外层作用域，便于在 astro:before-swap 时统一移除
let onFullscreenChange: (() => void) | null = null;

/** 初始化全屏模式切换按钮（每次页面切换后重新绑定） */
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

  // 监听全屏状态变化，更新按钮文字和持久化状态（仅注册一次）
  if (onFullscreenChange === null) {
    onFullscreenChange = () => {
      const btn = document.getElementById('mobile-fullscreen-btn');
      const span = btn?.querySelector('span');
      if (document.fullscreenElement) {
        span && (span.textContent = '退出');
        try {
          localStorage.setItem('fandex-fullscreen', 'true');
        } catch {}
      } else {
        span && (span.textContent = '全屏');
        try {
          localStorage.removeItem('fandex-fullscreen');
        } catch {}
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
  }

  // 恢复全屏状态
  if (localStorage.getItem('fandex-fullscreen') === 'true' && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
}

// ========== 代码块复制按钮 ==========
function initCopyButtons(): void {
  document.querySelectorAll('pre > code').forEach((codeEl) => {
    const pre = codeEl.parentElement;
    if (!pre) return;

    // 防止重复包装：检查 pre 是否已在 .code-block 容器内
    // 原实现仅检查 pre.querySelector('.copy-btn')（子元素），
    // 但复制按钮是 pre 的兄弟元素（同为 .code-block 子元素），导致检查失效，
    // 多次执行时产生嵌套 .code-block + 重复按钮（堆叠重影 bug 根源）
    const parent = pre.parentElement;
    if (!parent) return;
    if (parent.classList.contains('code-block')) return; // 已包装，跳过
    if (parent.querySelector(':scope > .copy-btn')) return; // 兄弟已有按钮，跳过

    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';

    // 提取代码语言标识：
    // - 常规高亮代码块的 code 元素带 language-* 类
    // - Shiki 输出（Astro 构建 markdown）语言标记在 pre 的 data-language 属性上，
    //   code 元素无 language-* 类，需兜底读取，否则语言标签永远缺失
    const lang =
      (codeEl.className.match(/language-(\S+)/) || [])[1] ||
      pre.getAttribute('data-language') ||
      '';
    if (lang) wrapper.setAttribute('data-lang', lang);

    const btn = document.createElement('button');
    // 统一 fndx-icon-btn 风格：透明背景 + 无边框 + 统一悬停效果
    btn.className = 'copy-btn fndx-icon-btn fndx-icon-btn--labeled';
    btn.setAttribute('aria-label', 'Copy code');
    btn.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

    btn.addEventListener('click', async () => {
      const text = codeEl.textContent || '';
      try {
        // 优先使用 Clipboard API 复制
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
        // Clipboard API 不可用时回退到 execCommand
        // document.execCommand 已被标记为 deprecated（ts(6385) hint），
        // 但作为 file:// 协议下桌面端的降级方案保留（Tauri 桌面端环境）。
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

    // 将代码块包裹在容器中，并添加复制按钮
    // 空值检查：parentNode 在 DOM 标准中始终存在，但 TS 类型标注为可空
    const parentNode = pre.parentNode;
    if (!parentNode) return;
    parentNode.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);
    wrapper.appendChild(btn);
  });
}

// ========== 初始化执行 + astro:page-load 注册 ==========
// 所有 DOM 依赖的初始化函数都需在 astro:page-load 时重新执行，
// 因为 View Transitions 会替换 DOM 元素，旧监听器绑定在已移除的元素上失效。
// 使用 dataset.bound 标记防止同一元素重复绑定。
initLayoutInteractions();
initFullscreenToggle();
initCopyButtons();

document.addEventListener('astro:page-load', () => {
  closeSidebar();
  initLayoutInteractions();
  initFullscreenToggle();
});

document.addEventListener('astro:page-load', initCopyButtons);

// ========== 代码块横向溢出指示 ==========
/**
 * 为可横向滚动的代码块追加右缘渐变指示：
 * - scrollWidth 超出 clientWidth 时给外层容器加 .has-overflow，
 *   CSS 据此渲染右缘青色渐隐遮罩，提示"右侧还有内容"
 * - scroll 事件实时消隐：滚动到最右端时移除指示
 * - 窗口缩放（含侧边栏折叠）时重新检测
 */
function initCodeOverflow(): void {
  const blocks = document.querySelectorAll<HTMLElement>('.code-block');

  blocks.forEach((block) => {
    if (block.dataset.overflowBound === 'true') return;
    block.dataset.overflowBound = 'true';

    const scroller = block.querySelector<HTMLElement>('pre');
    if (!scroller) return;

    /** 依据当前横向滚动状态同步指示器显隐 */
    const sync = (): void => {
      const overflow = scroller.scrollWidth - scroller.clientWidth > 4;
      const atEnd = scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 4;
      block.classList.toggle('has-overflow', overflow && !atEnd);
    };

    scroller.addEventListener('scroll', sync, { passive: true });
    // 首帧排版完成后检测一次（字体加载会改变 scrollWidth，双 rAF 确保排版稳定）
    requestAnimationFrame(() => requestAnimationFrame(sync));
  });

  // 字体加载完成后复检（等宽字体就位会显著改变代码宽度）
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

// ========== 标题锚点链接 ==========
/**
 * 为文档正文 h2/h3 追加悬停锚点（GitHub 式 heading permalink）：
 * - Astro 已为 markdown 标题生成 id，这里注入 # 链接便于分享定位
 * - 仅注入一次（dataset 防重入），锚点样式在 code.css/typography 侧定义
 */
function initHeadingAnchors(): void {
  document.querySelectorAll<HTMLElement>('.prose h2[id], .prose h3[id]').forEach((heading) => {
    if (heading.dataset.anchorBound === 'true') return;
    heading.dataset.anchorBound = 'true';

    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', '标题锚点链接');
    anchor.textContent = '#';
    // 锚点点击不触发标题文本的选中行为，仅复制定位
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      // 复制带锚点的完整地址到剪贴板（失败时静默降级为普通跳转）
      const url = `${window.location.origin}${window.location.pathname}#${heading.id}`;
      if (navigator.clipboard) {
        void navigator.clipboard.writeText(url);
      }
      window.history.replaceState(null, '', `#${heading.id}`);
    });
    heading.appendChild(anchor);
  });
}

document.addEventListener('astro:page-load', () => {
  initCodeOverflow();
  initHeadingAnchors();
});
initCodeOverflow();
initHeadingAnchors();

// ========== 微交互动画 ==========
async function initAnimations(): Promise<void> {
  try {
    const { initAnimations: init } = await import('@/lib/animations');
    init();
  } catch {
    /* ignore */
  }
}

// 注册各功能模块的页面加载回调
document.addEventListener('astro:page-load', initAnimations);
void initAnimations();

// 注：原 onBeforeSwap 错误移除 astro:page-load 监听器，导致首次跳转后
// 代码复制/动画/运行器永久失效。已删除该函数。
// astro:page-load 监听器使用相同函数引用注册，addEventListener 自动去重，不会累积。
// fullscreenchange 监听器由 initFullscreenToggle 通过 onFullscreenChange === null 守卫，仅注册一次。

// 注册 Service Worker 以支持离线访问
if ('serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  navigator.serviceWorker.register(base + 'sw.js').catch((err) => {
    // 开发环境暴露 SW 注册失败原因，便于排查；生产环境静默以避免噪音
    if (import.meta.env.DEV) {
      console.warn('[FANDEX] Service Worker 注册失败:', err);
    }
  });
}
