import { UI_STRINGS } from './i18n-strings';
import { getItem, setItem, onStorageChange } from './storage';

export type Lang = 'zh' | 'en';

export const LANG_STORAGE_KEY = 'fandex-lang';

export const LANG_CHANGE_EVENT = 'fandex:langchange';

const HTML_LANG_ATTR: Record<Lang, string> = { zh: 'zh-CN', en: 'en' };

const isServer = typeof document === 'undefined';

function readLangFromDom(): Lang {
  if (isServer) return 'zh';
  const raw = document.documentElement.getAttribute('data-lang');
  return raw === 'en' ? 'en' : 'zh';
}

let currentLang: Lang = isServer ? 'zh' : readLangFromDom();

export function getSavedLang(): Lang | null {
  const raw = getItem(LANG_STORAGE_KEY);
  if (raw === 'zh' || raw === 'en') return raw;
  return null;
}

export function getLang(): Lang {
  return currentLang;
}

export function applyLang(lang: Lang): void {
  if (isServer) return;
  currentLang = lang;
  const root = document.documentElement;
  root.setAttribute('data-lang', lang);
  root.setAttribute('lang', HTML_LANG_ATTR[lang]);
}

export function setLang(lang: Lang): void {
  setItem(LANG_STORAGE_KEY, lang);
  applyLang(lang);
  if (!isServer) {
    // detail 直接携带 Lang：订阅端 subscribeLang 把 detail 原样交给回调，
    // 包成 { lang } 会让 React state 变成对象、t() 里 entry[lang] 取到
    // undefined 抛 replace TypeError，整树 island 崩溃（交互深检 L1）。
    document.dispatchEvent(new CustomEvent<Lang>(LANG_CHANGE_EVENT, { detail: lang }));
  }
}

export function toggleLang(): Lang {
  const next: Lang = currentLang === 'en' ? 'zh' : 'en';
  setLang(next);
  return next;
}

export function subscribeLang(callback: (lang: Lang) => void): () => void {
  if (isServer) return () => {};
  const handler = (event: Event): void => {
    // 防御性归一：detail 契约为 Lang（'zh'/'en'）；历史事件或第三方派发
    // 可能带 { lang } 包装（truthy 对象会让 ?? 兜底失效，回调拿到非
    // Lang 值后 t() 里 entry[lang] 为 undefined 抛 replace TypeError，
    // useLang 消费 island 整树崩溃，交互深检 L1）。异常形态一律回读
    // DOM 权威值。
    const raw = (event as CustomEvent<unknown>).detail;
    const normalized =
      raw === 'zh' || raw === 'en'
        ? raw
        : raw && typeof raw === 'object' && ((raw as { lang?: unknown }).lang === 'zh' || (raw as { lang?: unknown }).lang === 'en')
          ? (raw as { lang: Lang }).lang
          : readLangFromDom();
    callback(normalized);
  };
  document.addEventListener(LANG_CHANGE_EVENT, handler);
  return () => document.removeEventListener(LANG_CHANGE_EVENT, handler);
}

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

export function initLangPersistence(): void {
  if (isServer) return;

  document.addEventListener('astro:after-swap', () => {
    applyLang(getSavedLang() ?? readLangFromDom());
  });

  onStorageChange(LANG_STORAGE_KEY, (newValue) => {
    if (newValue === 'zh' || newValue === 'en') {
      setLang(newValue);
    }
  });
}
