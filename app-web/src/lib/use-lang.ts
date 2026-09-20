/**
 * React 岛屿语言订阅钩子（lib/use-lang）
 * =============================================================================
 * 职责：
 *   - 为 React 岛屿提供当前界面语言状态：语言切换时触发重渲染，
 *     组件内以 t(key, params) 渲染文案即可获得双语能力
 *
 * 水合一致性约定（与 ThemeToggle 同一模式）：
 *   - SSR 输出恒为中文，useState 初值固定 'zh'，保证水合前后一致
 *   - 挂载后 useEffect 读取 <html data-lang>（由 BaseLayout 内联 FOUC 脚本
 *     先行设置）并订阅 fandex:langchange，英文用户在首帧后完成一次切换
 * =============================================================================
 */
import { useEffect, useState } from 'react';
import { getLang, subscribeLang, type Lang } from './i18n';

/**
 * 订阅界面语言的 React 钩子
 * @returns 当前语言（SSR 与水合首帧恒为 'zh'，挂载后同步真实状态）
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>('zh');

  useEffect(() => {
    // 挂载即同步真实语言（覆盖英文用户的首帧中文）
    // SSR 下无法在 useState 初始化器读 DOM/localStorage，两段式初始化是必要模式
    // （与 ThemeToggle 同一豁免：set-state-in-effect）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLang(getLang());
    // 订阅后续切换（含跨标签页同步触发的 setLang 广播）
    return subscribeLang(setLang);
  }, []);

  return lang;
}
