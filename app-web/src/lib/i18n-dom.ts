import { getLang, toggleLang, initLangPersistence, t, type Lang } from './i18n';

const ATTR_TARGETS: ReadonlyArray<{ attr: string; target: 'text' | string }> = [
  { attr: 'data-i18n', target: 'text' },
  { attr: 'data-i18n-aria', target: 'aria-label' },
  { attr: 'data-i18n-tooltip', target: 'data-tooltip' },
  { attr: 'data-i18n-placeholder', target: 'placeholder' },
  { attr: 'data-i18n-title', target: 'title' },
];

const DATE_LOCALE: Record<Lang, string> = { zh: 'zh-CN', en: 'en-US' };

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

export function applyI18nToDom(root: ParentNode = document): void {
  const lang = getLang();

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

  root.querySelectorAll<HTMLElement>('[data-i18n-date]').forEach((el) => {
    const iso = el.getAttribute('data-i18n-date');
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    el.textContent = date.toLocaleDateString(DATE_LOCALE[lang]);
  });
}

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  applyI18nToDom();

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('[data-lang-toggle]')) {
      toggleLang();
    }
  });

  document.addEventListener('fandex:langchange', () => {
    applyI18nToDom();
  });

  document.addEventListener('astro:after-swap', () => {
    applyI18nToDom();
  });

  initLangPersistence();
}
