import { useState, useEffect, useCallback } from 'react';
import { getSavedTheme, prefersDarkMode, setTheme as persistTheme, type Theme } from '@/lib/theme';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import '@/styles/islands/ThemeToggle.css';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 岛屿约定保留空接口：Record<string, never> 会拒绝 Astro 的 client:* 属性传递
interface ThemeToggleProps {}

function SunIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fndx-theme-icon${visible ? ' is-visible' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fndx-theme-icon fndx-theme-icon--moon${visible ? ' is-visible' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeToggle(_props: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const lang = useLang();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = getSavedTheme();
    const initial: Theme = saved ?? (prefersDarkMode() ? 'dark' : 'light');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    document.documentElement.style.colorScheme = initial;
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    persistTheme(next);
    setTheme(next);
  }, [theme]);

  return (
    <button
      type="button"
      className={`fndx-theme-toggle fndx-icon-btn${mounted ? ' fndx-theme-toggle--ready' : ''}`}
      onClick={mounted ? toggle : undefined}
      data-tooltip={theme === 'dark' ? t('theme.tooltipLight', undefined, lang) : t('theme.tooltipDark', undefined, lang)}
      data-tooltip-pos="bottom"
      aria-label={theme === 'dark' ? t('theme.switchLight', undefined, lang) : t('theme.switchDark', undefined, lang)}
      tabIndex={mounted ? 0 : -1}
      aria-hidden={!mounted}
    >
      {/* 暗色模式下显示太阳图标（提示用户可切换到亮色） */}
      <SunIcon visible={mounted && theme === 'dark'} />
      {/* 亮色模式下显示月亮图标（提示用户可切换到暗色） */}
      <MoonIcon visible={mounted && theme === 'light'} />
    </button>
  );
}

export default ThemeToggle;
