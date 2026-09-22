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
    document.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang } }));
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
    callback((event as CustomEvent<Lang>).detail ?? readLangFromDom());
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
