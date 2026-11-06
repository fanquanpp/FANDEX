import { getItem, setItem, onStorageChange } from './storage';

export type Theme = 'light' | 'dark';

/** 用户主题偏好三态（规格 5.1.5）：light/dark 为显式指定，system 跟随操作系统 */
export type ThemePreference = Theme | 'system';

export const THEME_STORAGE_KEY = 'fandex-theme';

const THEME_COLOR_LIGHT = '#EBEFF3';

const THEME_COLOR_DARK = '#0a0e14';

let darkSchemeQuery: MediaQueryList | null = null;

function darkSchemeMedia(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null;
  darkSchemeQuery ??= window.matchMedia('(prefers-color-scheme: dark)');
  return darkSchemeQuery;
}

export function prefersDarkMode(): boolean {
  return darkSchemeMedia()?.matches ?? false;
}

export function getSavedThemePreference(): ThemePreference | null {
  const raw = getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return null;
}

/** 兼容旧调用面：返回显式保存的明暗值（system 视为未保存，交由系统偏好解析） */
export function getSavedTheme(): Theme | null {
  const pref = getSavedThemePreference();
  return pref === 'light' || pref === 'dark' ? pref : null;
}

export function getResolvedTheme(): Theme {
  const pref = getSavedThemePreference();
  if (pref === 'light' || pref === 'dark') return pref;
  return prefersDarkMode() ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  updateMetaThemeColor(theme);
  // 广播主题变更：Mermaid 图表等需按主题重绘的组件监听此事件
  document.dispatchEvent(new CustomEvent('fandex:themechange', { detail: { theme } }));
}

/** 保存偏好（可为 system）并把解析后的明暗值应用到 DOM */
export function setThemePreference(preference: ThemePreference): void {
  setItem(THEME_STORAGE_KEY, preference);
  applyTheme(getResolvedTheme());
}

export function updateMetaThemeColor(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const color = theme === 'dark' ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

function isExplicitTheme(value: ThemePreference | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function initThemePersistence(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('astro:after-swap', () => {
    applyTheme(getResolvedTheme());
  });

  onStorageChange(THEME_STORAGE_KEY, (newValue) => {
    if (newValue === 'light' || newValue === 'dark' || newValue === 'system') {
      applyTheme(getResolvedTheme());
    }
  });

  // system 偏好（含从未手动切换过的用户）实时跟随操作系统明暗切换
  const query = darkSchemeMedia();
  query?.addEventListener('change', (e) => {
    if (!isExplicitTheme(getSavedThemePreference())) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}
