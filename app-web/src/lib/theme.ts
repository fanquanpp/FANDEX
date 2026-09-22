import { getItem, setItem, onStorageChange } from './storage';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'fandex-theme';

const THEME_COLOR_LIGHT = '#EBEFF3';

const THEME_COLOR_DARK = '#0a0e14';

export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function getSavedTheme(): Theme | null {
  const raw = getItem(THEME_STORAGE_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return null;
}

export function getResolvedTheme(): Theme {
  const saved = getSavedTheme();
  if (saved) return saved;
  return prefersDarkMode() ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  updateMetaThemeColor(theme);
}

export function setTheme(theme: Theme): void {
  setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const current = getResolvedTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
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

export function initThemePersistence(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('astro:after-swap', () => {
    applyTheme(getResolvedTheme());
  });

  onStorageChange(THEME_STORAGE_KEY, (newValue) => {
    if (newValue === 'light' || newValue === 'dark') {
      applyTheme(newValue);
    }
  });

  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }
}
