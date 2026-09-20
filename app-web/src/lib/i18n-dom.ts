/**
 * DOM 文案应用器 + 语言切换入口（lib/i18n-dom）
 * =============================================================================
 * 职责：
 *   1. 扫描全文档的 data-i18n* 属性，把 SSR 中文文案替换为当前语言版本
 *      （zh 模式下替换结果与 SSR 逐字一致，等效幂等）
 *   2. 绑定语言切换按钮（[data-lang-toggle]，事件委托，View Transitions 后天然有效）
 *   3. 语言变化（fandex:langchange）与 View Transitions（astro:after-swap）
 *      后全量重放，保证新文档/新语言下文案一致
 *   4. 初始化语言持久化（astro:after-swap 属性重应用 + 跨标签页同步）
 *
 * 支持的 data 属性协议（约定：data-i18n 只放在叶子元素上）：
 *   data-i18n            - 切换 textContent
 *   data-i18n-aria       - 切换 aria-label
 *   data-i18n-tooltip    - 切换 data-tooltip（CSS attr() 驱动，属性替换即时生效）
 *   data-i18n-placeholder- 切换 input/textarea placeholder
 *   data-i18n-title      - 切换 title（悬停提示）
 *   data-i18n-date       - 按 ISO 日期值切换本地化日期格式（zh-CN / en-US）
 *   data-i18n-params     - JSON 插值参数，供同元素以上各键共享（如 {"n":42}）
 *
 * 引入位置：BaseLayout（全站每页）+ 404 / disclaimer 独立静态页
 * =============================================================================
 */
import { getLang, toggleLang, initLangPersistence, t, type Lang } from './i18n';

/** 元素级 i18n 属性 → 目标 DOM 属性/内容的映射表 */
const ATTR_TARGETS: ReadonlyArray<{ attr: string; target: 'text' | string }> = [
  { attr: 'data-i18n', target: 'text' },
  { attr: 'data-i18n-aria', target: 'aria-label' },
  { attr: 'data-i18n-tooltip', target: 'data-tooltip' },
  { attr: 'data-i18n-placeholder', target: 'placeholder' },
  { attr: 'data-i18n-title', target: 'title' },
];

/** 各语言的日期格式化 locale（文档更新日期等内容级日期的界面呈现） */
const DATE_LOCALE: Record<Lang, string> = { zh: 'zh-CN', en: 'en-US' };

/** 解析元素上的 data-i18n-params JSON（缺失或损坏时返回空对象） */
function readParams(el: Element): Record<string, string | number> {
  const raw = el.getAttribute('data-i18n-params');
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string | number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * 把当前语言应用到指定根元素子树的所有 i18n 标记元素
 * @param root - 扫描根（默认 document，View Transitions 后由监听器触发）
 */
export function applyI18nToDom(root: ParentNode = document): void {
  const lang = getLang();

  // 文案与属性切换
  for (const { attr, target } of ATTR_TARGETS) {
    root.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((el) => {
      const key = el.getAttribute(attr);
      if (!key) return;
      const text = t(key, readParams(el), lang);
      if (target === 'text') {
        el.textContent = text;
      } else {
        el.setAttribute(target, text);
      }
    });
  }

  // 日期本地化：data-i18n-date 携带 ISO 日期值，按语言重新格式化
  root.querySelectorAll<HTMLElement>('[data-i18n-date]').forEach((el) => {
    const iso = el.getAttribute('data-i18n-date');
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    el.textContent = date.toLocaleDateString(DATE_LOCALE[lang]);
  });
}

// 浏览器环境守卫（Astro 预渲染期不求值本模块主体）
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  // 首屏应用：模块脚本在 DOM 解析完成后、首帧绘制前执行，英文用户基本无感知切换
  applyI18nToDom();

  // 语言切换（事件委托：无需逐按钮绑定，View Transitions 换文档后依然有效）
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-lang-toggle]')) {
      toggleLang();
    }
  });

  // 语言变化后全量重放（toggleLang 触发；跨标签页同步走同一路径）
  document.addEventListener('fandex:langchange', () => {
    applyI18nToDom();
  });

  // View Transitions 切页：新文档是 SSR 中文内容，重放当前语言
  document.addEventListener('astro:after-swap', () => {
    applyI18nToDom();
  });

  // 持久化初始化（after-swap 属性重应用 + 跨标签页 storage 同步）
  initLangPersistence();
}
