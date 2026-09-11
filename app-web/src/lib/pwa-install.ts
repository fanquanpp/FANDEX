/**
 * PWA 安装入口（lib/pwa-install）
 * =============================================================================
 * 职责：
 * - 捕获 beforeinstallprompt 事件（阻止浏览器默认迷你横幅），点亮导航栏
 *   「安装应用」按钮；点击调用 prompt() 弹出官方安装确认框
 * - 已安装（standalone 模式）或已触发过安装时隐藏按钮
 * - iOS Safari 不支持安装事件：按钮可见，点击弹出「添加到主屏幕」指引浮层
 *
 * 实现要点：
 * - beforeinstallprompt 在页面生命周期内只触发一次，模块级变量保存事件；
 *   View Transitions 切页后 astro:page-load 重新绑定新 DOM 上的按钮
 * - SSR 环境整体跳过（Astro 预渲染期不求值）
 */

/** beforeinstallprompt 事件的最小结构声明 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** 保存的安装事件（模块级，跨 View Transitions 存活） */
let deferredPrompt: InstallPromptEvent | null = null;

/** 是否已以应用模式运行（安装后打开的窗口） */
function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 专有字段
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** 是否 iOS 设备（iPadOS 13+ 桌面 UA 需借助多点触控识别） */
function isIos(): boolean {
  const ua = navigator.userAgent;
  const iosLike = /iphone|ipad|ipod/i.test(ua);
  const ipadOs = /macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return iosLike || ipadOs;
}

/** 隐藏全部安装按钮 */
function hideButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    btn.hidden = true;
  });
}

/** 显示全部安装按钮 */
function revealButtons(): void {
  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    btn.hidden = false;
  });
}

/** 移除 iOS 指引浮层 */
function removeTip(): void {
  document.querySelector('.install-tip')?.remove();
}

/** 显示「添加到主屏幕」指引浮层（固定于导航栏下方右侧，5 秒自动消失） */
function showTip(): void {
  removeTip();
  const tip = document.createElement('div');
  tip.className = 'install-tip';
  tip.setAttribute('role', 'note');
  tip.textContent = '在浏览器「分享」菜单中选择「添加到主屏幕 / 安装应用」即可离线使用。';
  document.body.appendChild(tip);
  window.setTimeout(removeTip, 5000);
}

/**
 * 绑定页面上所有安装按钮（dataset 防重入）
 * 显示条件：非 standalone，且（有安装事件 或 iOS 设备）
 */
function bindInstallButtons(): void {
  if (isStandalone()) {
    hideButtons();
    return;
  }

  document.querySelectorAll<HTMLElement>('[data-install-app]').forEach((btn) => {
    if (btn.dataset.installBound === 'true') return;
    btn.dataset.installBound = 'true';

    if (deferredPrompt || isIos()) {
      btn.hidden = false;
    }

    btn.addEventListener('click', () => {
      if (deferredPrompt) {
        // Chromium 系：调用官方安装确认框
        const event = deferredPrompt;
        deferredPrompt = null;
        if (typeof event.prompt !== 'function') return;
        void event.prompt().then(() => event.userChoice).then((choice) => {
          if (choice.outcome === 'accepted') hideButtons();
        }).catch(() => {
          // 用户关闭浏览器级弹窗等异常：回到待安装态，事件不再重放
        });
        return;
      }
      if (isIos()) {
        // iOS Safari：展示手动添加指引
        showTip();
      }
    });
  });
}

// 浏览器环境守卫（Astro 预渲染期不求值）
if (!import.meta.env.SSR && typeof window !== 'undefined') {
  // 捕获安装事件：阻止默认横幅，改由站点按钮统一承接
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as InstallPromptEvent;
    revealButtons();
  });

  // 安装完成：隐藏入口（both prompt 流程与浏览器菜单安装都会触发）
  window.addEventListener('appinstalled', hideButtons);

  bindInstallButtons();
  document.addEventListener('astro:page-load', () => {
    bindInstallButtons();
  });
}
