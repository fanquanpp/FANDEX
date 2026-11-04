/**
 * ThemeToggle vanilla 版（S4 运行时优化批次：岛屿去 React 化）。
 *
 * 原实现为 React island（ThemeToggle.tsx，SiteHeader client:load），全站每个页面
 * 都会为此拉起 react-dom 调度器水合运行时（首页关键路径 JS 最大件 62.8KB gzip）。
 * 移植为 vanilla 模块后由 SiteHeader.astro 的普通 <script> 装载：SSR 输出完整
 * 按钮标记，本模块只负责接线与状态同步，页面常驻 JS 零 React 依赖。
 *
 * 行为与原 island 对齐：
 * - 三态循环（规格 5.1.5）：light → dark → system → light；
 * - SSR 首帧按「未保存偏好 = system」渲染（按钮隐藏、tooltip/aria 指向 light），
 *   模块接线后与已存偏好对齐，并兜底重写 data-theme/colorScheme（bootstrap
 *   内联脚本已先行写入，此处对齐失败无害）；
 * - 就绪态（--ready / 图标 / tooltip）在 rAF 后写入：首帧样式先提交，保留
 *   原有淡入动效；reduced-motion 由 ThemeToggle.css 与 global.css 兜底归零；
 * - 语言切换（fandex:langchange）时 tooltip/aria 按新语言重译。三态目标键
 *   随点击动态变化，不能走 data-i18n-* 静态翻译通道，只能模块内自刷新。
 *
 * 清理纪律（astro:before-swap Set 登记模式，先例 src/lib/mermaid-interactions.ts
 * 与 src/fx/effects/count-up.ts）：换页前统一解绑监听、取消未决 rAF，
 * 防止 ClientRouter 连续导航下监听器累积。
 */
import {
  getResolvedTheme,
  getSavedThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme';
import { t, subscribeLang } from '@/lib/i18n';
import '@/styles/islands/ThemeToggle.css';

/** 三态循环顺序（规格 5.1.5）：light → dark → system → light */
const THEME_CYCLE: ThemePreference[] = ['light', 'dark', 'system'];

/** 各偏好下应点亮的图标：暗色显示太阳（提示可切回亮色），亮色显示月亮，system 半填充圆 */
const ICON_FOR_PREFERENCE: Record<ThemePreference, string> = {
  light: 'moon',
  dark: 'sun',
  system: 'system',
};

function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_CYCLE.indexOf(current);
  // ?? 'system'：防御未知名值（环始终闭合，正常不可达）
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'system';
}

interface ToggleContext {
  button: HTMLButtonElement;
  preference: ThemePreference;
}

/** 当前文档已接线的按钮上下文；astro:page-load 在首次加载也会触发，按元素去重 */
const contexts = new Map<HTMLButtonElement, ToggleContext>();

/** 跨导航累积的清理函数（解绑 / 取消），astro:before-swap 统一回收 */
const pendingCleanups = new Set<() => void>();

function syncButtonState(ctx: ToggleContext): void {
  const { button, preference } = ctx;
  for (const icon of button.querySelectorAll<SVGElement>('[data-theme-icon]')) {
    icon.classList.toggle(
      'is-visible',
      icon.getAttribute('data-theme-icon') === ICON_FOR_PREFERENCE[preference],
    );
  }
  // tooltip/aria 描述点击后的去向：light → dark → system → light
  const target = nextThemePreference(preference);
  const tooltipKey =
    target === 'dark'
      ? 'theme.tooltipDark'
      : target === 'system'
        ? 'theme.tooltipSystem'
        : 'theme.tooltipLight';
  const ariaKey =
    target === 'dark'
      ? 'theme.switchDark'
      : target === 'system'
        ? 'theme.switchSystem'
        : 'theme.switchLight';
  button.setAttribute('data-tooltip', t(tooltipKey));
  button.setAttribute('aria-label', t(ariaKey));
}

function cycleTheme(ctx: ToggleContext): void {
  const next = nextThemePreference(ctx.preference);
  ctx.preference = next;
  setThemePreference(next);
  syncButtonState(ctx);
}

function wireButton(button: HTMLButtonElement): void {
  if (contexts.has(button)) return;

  const preference = getSavedThemePreference() ?? 'system';
  // 兜底：bootstrap 内联脚本已写 data-theme，这里把解析值与其对齐（与原 island effect 一致）
  const resolved = getResolvedTheme();
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = resolved;

  const ctx: ToggleContext = { button, preference };
  contexts.set(button, ctx);

  // 语言切换时 tooltip/aria 重译；subscribeLang 返回解绑函数，随 Set 统一回收
  pendingCleanups.add(subscribeLang(() => syncButtonState(ctx)));

  const onClick = (): void => cycleTheme(ctx);
  button.addEventListener('click', onClick);
  pendingCleanups.add(() => button.removeEventListener('click', onClick));

  // rAF 后再就绪：首帧样式先提交，图标淡入与原 island 一致；未决 rAF 也入 Set
  let rafId = 0;
  const cancelReady = (): void => cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    pendingCleanups.delete(cancelReady);
    button.classList.add('fndx-theme-toggle--ready');
    button.removeAttribute('aria-hidden');
    button.setAttribute('tabindex', '0');
    syncButtonState(ctx);
  });
  pendingCleanups.add(cancelReady);
}

function wireAllButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')) {
    wireButton(button);
  }
}

function cleanupThemeToggle(): void {
  for (const cleanup of pendingCleanups) {
    try {
      cleanup();
    } catch {
      // 单个清理失败不阻断其余回收
    }
  }
  pendingCleanups.clear();
  contexts.clear();
}

let lifecycleBound = false;

/**
 * SiteHeader 脚本入口：接线当前文档的主题按钮并登记 astro 生命周期。
 * 幂等：预渲染期求值、首次加载、astro:page-load 重复触发均安全。
 */
export function initThemeToggle(): void {
  if (!import.meta.env.SSR && typeof document !== 'undefined') {
    if (!lifecycleBound) {
      lifecycleBound = true;
      document.addEventListener('astro:page-load', wireAllButtons);
      document.addEventListener('astro:before-swap', cleanupThemeToggle);
    }
    wireAllButtons();
  }
}
