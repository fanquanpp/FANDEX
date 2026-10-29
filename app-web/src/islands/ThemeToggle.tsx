import { useState, useEffect, useCallback } from 'react';
import {
  getSavedThemePreference,
  getResolvedTheme,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import '@/styles/islands/ThemeToggle.css';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 岛屿约定保留空接口：Record<string, never> 会拒绝 Astro 的 client:* 属性传递
interface ThemeToggleProps {}

/** 三态循环顺序（规格 5.1.5）：light → dark → system → light */
const THEME_CYCLE: ThemePreference[] = ['light', 'dark', 'system'];

function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = THEME_CYCLE.indexOf(current);
  // ?? 'system'：防御未知名值（环始终闭合，正常不可达）
  return THEME_CYCLE[(index + 1) % THEME_CYCLE.length] ?? 'system';
}

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

/** 跟随系统：半填充圆（右半墨水 = 取当前系统明暗），与太阳/月亮同线宽 */
function SystemIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={`fndx-theme-icon fndx-theme-icon--system${visible ? ' is-visible' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThemeToggle(_props: ThemeToggleProps) {
  // SSR 首帧按"未保存偏好 = system"渲染，hydration 后与已存偏好对齐
  const [preference, setPreference] = useState<ThemePreference>('system');

  const lang = useLang();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getSavedThemePreference() ?? 'system';
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreference(initial);
    // 兜底：bootstrap 内联脚本已写 data-theme，这里把 island 状态与其对齐
    const resolved = getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.style.colorScheme = resolved;
    const rafId = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, []);

  const cycle = useCallback(() => {
    const next = nextThemePreference(preference);
    setThemePreference(next);
    setPreference(next);
  }, [preference]);

  // tooltip/aria 描述点击后的去向：light → dark → system → light
  const target = nextThemePreference(preference);
  const targetTooltipKey =
    target === 'dark' ? 'theme.tooltipDark' : target === 'system' ? 'theme.tooltipSystem' : 'theme.tooltipLight';
  const targetAriaKey =
    target === 'dark' ? 'theme.switchDark' : target === 'system' ? 'theme.switchSystem' : 'theme.switchLight';

  return (
    <button
      type="button"
      className={`fndx-theme-toggle fndx-icon-btn${mounted ? ' fndx-theme-toggle--ready' : ''}`}
      onClick={mounted ? cycle : undefined}
      data-tooltip={t(targetTooltipKey, undefined, lang)}
      data-tooltip-pos="bottom"
      aria-label={t(targetAriaKey, undefined, lang)}
      tabIndex={mounted ? 0 : -1}
      aria-hidden={!mounted}
    >
      {/* 暗色模式下显示太阳图标（提示用户可切换到亮色） */}
      <SunIcon visible={mounted && preference === 'dark'} />
      {/* 亮色模式下显示月亮图标（提示用户可切换到暗色） */}
      <MoonIcon visible={mounted && preference === 'light'} />
      {/* 跟随系统模式显示半填充圆 */}
      <SystemIcon visible={mounted && preference === 'system'} />
    </button>
  );
}

export default ThemeToggle;
