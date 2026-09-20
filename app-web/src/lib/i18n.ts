/**
 * 界面语言管理模块（web 端 i18n 核心）
 * =============================================================================
 * 职责：
 *   1. 提供界面语言（zh / en）读取/写入的统一 API，封装 localStorage 持久化
 *   2. 提供 SSR 安全的语言检测（构建期恒为 zh，中文为 SSR 基准语言）
 *   3. 提供 t(key, params) 文案查询与 {n} 占位符插值
 *   4. 语言变化以 document 级自定义事件广播，React 岛屿（lib/use-lang）据此重渲染
 *   5. View Transitions 切页后的语言重应用与跨标签页同步
 *
 * 架构对齐（与 lib/theme 同构，主题系统的四层防护在此一一对应）：
 *   - 第一层：<head> 内联同步脚本在 body 渲染前设置 data-lang（见 BaseLayout.astro）
 *   - 第二层：astro:after-swap 重应用（initLangPersistence，ClientRouter 换文档后属性可能丢失）
 *   - 第三层：DOM 文案应用器（lib/i18n-dom）按 data-i18n 属性批量切换
 *   - 第四层：跨标签页 storage 同步
 *
 * 边界约定：
 *   - 仅覆盖 UI/UX 文案；文档正文与教学内容永远保持原文，不进入字典
 *   - SSR 输出恒为中文：SEO、RSS、无 JS 降级均为完整中文页面；
 *     英文为纯客户端增强（渐进增强，与主题切换同一模型）
 *
 * 存储 key：fandex-lang
 * 值：'zh' | 'en'（缺省 zh，不跟随系统——目标用户为中文学习者，英文为主动选择）
 * =============================================================================
 */
import { UI_STRINGS } from './i18n-strings';
import { getItem, setItem, onStorageChange } from './storage';

/** 界面语言类型 */
export type Lang = 'zh' | 'en';

/** 语言存储 key（与 BaseLayout 内联 FOUC 脚本约定一致） */
export const LANG_STORAGE_KEY = 'fandex-lang';

/** 语言变化广播事件名（document 级 CustomEvent，岛屿订阅） */
export const LANG_CHANGE_EVENT = 'fandex:langchange';

/** 语言对应的 <html lang> 值（影响浏览器翻译建议、读屏发音等） */
const HTML_LANG_ATTR: Record<Lang, string> = { zh: 'zh-CN', en: 'en' };

/** SSR 环境检测：Astro 构建期与预渲染期返回 true */
const isServer = typeof document === 'undefined';

/**
 * 从 DOM 读取当前语言（data-lang 属性由 BaseLayout 内联脚本先行设置）
 * SSR 环境恒返回 'zh'（构建基准语言）
 */
function readLangFromDom(): Lang {
  if (isServer) return 'zh';
  const raw = document.documentElement.getAttribute('data-lang');
  return raw === 'en' ? 'en' : 'zh';
}

/** 模块级当前语言（客户端首次求值时从 DOM 读取，与内联 FOUC 脚本一致） */
let currentLang: Lang = isServer ? 'zh' : readLangFromDom();

/**
 * 从 localStorage 读取已保存的语言偏好
 * @returns 已保存的语言；无保存值或异常时返回 null
 */
export function getSavedLang(): Lang | null {
  const raw = getItem(LANG_STORAGE_KEY);
  if (raw === 'zh' || raw === 'en') return raw;
  return null;
}

/**
 * 获取当前生效的界面语言
 * 优先级：模块状态（内联脚本/切换动作已同步）> 'zh'
 */
export function getLang(): Lang {
  return currentLang;
}

/**
 * 将语言应用到 document.documentElement
 * 同步 data-lang 属性（供 CSS 与岛屿读取）与 lang 属性（无障碍/浏览器语义）
 */
export function applyLang(lang: Lang): void {
  if (isServer) return;
  currentLang = lang;
  const root = document.documentElement;
  root.setAttribute('data-lang', lang);
  root.setAttribute('lang', HTML_LANG_ATTR[lang]);
}

/**
 * 持久化语言并全站生效
 * 1. 写入 localStorage
 * 2. 应用到 <html>（data-lang + lang）
 * 3. 广播 fandex:langchange：DOM 应用器与所有已挂载岛屿同步切换
 */
export function setLang(lang: Lang): void {
  setItem(LANG_STORAGE_KEY, lang);
  applyLang(lang);
  if (!isServer) {
    document.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang } }));
  }
}

/**
 * 切换界面语言（zh <-> en）
 * @returns 切换后的新语言
 */
export function toggleLang(): Lang {
  const next: Lang = currentLang === 'en' ? 'zh' : 'en';
  setLang(next);
  return next;
}

/**
 * 订阅语言变化（岛屿与运行时脚本使用）
 * @returns 取消订阅函数
 */
export function subscribeLang(callback: (lang: Lang) => void): () => void {
  if (isServer) return () => {};
  const handler = (event: Event): void => {
    callback((event as CustomEvent<Lang>).detail?.lang ?? readLangFromDom());
  };
  document.addEventListener(LANG_CHANGE_EVENT, handler);
  return () => document.removeEventListener(LANG_CHANGE_EVENT, handler);
}

/**
 * 查询 UI 文案并插值
 * 占位符形如 {n} / {title}，与字典值一一对应；缺失键返回键名本身便于排查
 *
 * @param key - 字典键（与 data-i18n 属性值同一名空间）
 * @param params - 插值参数（SSR 场景由 Astro 组件传入；运行时由 data-i18n-params 提供）
 * @param lang - 指定语言（默认当前语言；SSR 恒为 zh）
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  lang: Lang = currentLang,
): string {
  const entry = UI_STRINGS[key];
  if (!entry) return key;
  let text: string = entry[lang];
  if (params) {
    text = text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }
  return text;
}

/**
 * 初始化语言持久化（与 lib/theme 的 initThemePersistence 同构）
 * - View Transitions 切页后重新应用语言属性并重放 DOM 文案切换
 * - 跨标签页同步：其他标签页切换语言时当前标签页跟随
 *
 * 此函数应在客户端入口（lib/i18n-dom）调用一次，自动管理生命周期
 */
export function initLangPersistence(): void {
  if (isServer) return;

  // View Transitions 切换后：ClientRouter 替换 document.documentElement，
  // 新文档的 data-lang 由 BaseLayout 内联脚本重设，但已挂载岛屿与
  // DOM 文案需要重放切换（i18n-dom 监听 after-swap 自行重放，这里兜底属性）
  document.addEventListener('astro:after-swap', () => {
    applyLang(getSavedLang() ?? readLangFromDom());
  });

  // 跨标签页同步
  onStorageChange(LANG_STORAGE_KEY, (newValue) => {
    if (newValue === 'zh' || newValue === 'en') {
      setLang(newValue);
    }
  });
}
