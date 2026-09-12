/**
 * Service Worker 内容更新提示条（lib/sw-update）
 * =============================================================================
 * 职责：
 * - 接收 Service Worker 的 SW_CONTENT_UPDATED 消息：HTML 缓存采用
 *   Stale-While-Revalidate 策略，用户读到的是缓存副本，SW 会在后台拉取新版；
 *   当后台拉取的内容与缓存副本不同（页面确实更新了）且正是当前页时，
 *   屏幕底部浮出「内容已更新」细条，用户点击即可刷新到最新版
 * - 其他页面/标签页的静默更新不打扰（SWR 的既有体验）
 *
 * 实现要点：
 * - message 监听挂在 navigator.serviceWorker 上（document 级），View
 *   Transitions 切页后依然有效，无需 astro:page-load 重绑
 * - 提示条 DOM 按需创建；astro:before-swap 时移除，避免残留到新页面
 * - 动效消费 --motion-* 语义令牌，prefers-reduced-motion 下直接显隐
 * =============================================================================
 */

/** SW 广播消息的最小结构 */
interface SwUpdateMessage {
  type: 'SW_CONTENT_UPDATED';
  pathname: string;
}

/** 提示条自动隐藏时长（毫秒）：足够阅读文案，又不长期占据视口 */
const AUTO_HIDE_DELAY_MS = 15_000;

/** 自动隐藏计时器（切页/重新弹出时清理） */
let autoHideTimer = 0;

/**
 * 移除当前提示条（存在才移除，可安全重复调用）
 */
function removeBar(): void {
  document.querySelector('.sw-update-bar')?.remove();
  if (autoHideTimer) {
    window.clearTimeout(autoHideTimer);
    autoHideTimer = 0;
  }
}

/**
 * 显示「内容已更新」提示条
 * 已在视口时跳过（用户已经看到且未关闭，无需重新弹出打断）
 */
function showUpdateBar(): void {
  if (document.querySelector('.sw-update-bar')) return;

  const bar = document.createElement('div');
  bar.className = 'sw-update-bar';
  bar.setAttribute('role', 'status');

  const text = document.createElement('span');
  text.className = 'sw-update-bar-text';
  text.textContent = '内容已更新';
  bar.appendChild(text);

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'sw-update-bar-refresh';
  refreshBtn.textContent = '立即刷新';
  refreshBtn.addEventListener('click', () => window.location.reload());
  bar.appendChild(refreshBtn);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'sw-update-bar-close';
  closeBtn.setAttribute('aria-label', '关闭更新提示');
  closeBtn.textContent = '关闭';
  closeBtn.addEventListener('click', removeBar);
  bar.appendChild(closeBtn);

  document.body.appendChild(bar);

  // 入场动画：下一帧移除隐藏态，让 CSS 过渡生效
  requestAnimationFrame(() => bar.classList.add('is-visible'));

  autoHideTimer = window.setTimeout(removeBar, AUTO_HIDE_DELAY_MS);
}

// 仅浏览器环境执行（Astro 预渲染期会求值本模块，顶层禁止访问 DOM）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  // SW 消息：SWR 后台刷新发现内容变化时广播（仅当前页弹条，其他页静默）
  navigator.serviceWorker?.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as SwUpdateMessage | undefined;
    if (data?.type !== 'SW_CONTENT_UPDATED') return;
    if (new URL(data.pathname, location.href).pathname !== location.pathname) return;
    showUpdateBar();
  });

  // View Transitions 切页：提示条不跨页残留
  document.addEventListener('astro:before-swap', removeBar);
}
