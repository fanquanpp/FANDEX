/**
 * fx — FANDEX 动效特效体系单一入口。
 *
 * 分层结构：
 *   fx/capabilities.ts   能力门控（full / lite / off 三档）
 *   fx/registry.ts       注册表：data-fx 命名挂载 + 选择器挂载，幂等
 *   fx/lifecycle.ts      astro:page-load / before-swap 生命周期对齐
 *   fx/scene.ts          场景令牌读取、主题订阅、共享 rAF 循环
 *   fx/layers/           画布层：scene-backdrop、letter-glitch
 *   fx/effects/          DOM 特效：reveal、split/decrypt、count-up
 *   fx/decor-config.ts   GeoBgDecor 律动装饰配置（SSR 渲染的单一来源）
 *
 * 与 src/motion/ 的分工：motion/ 是 React 岛屿用的 motion/react 预设；
 * fx/ 是无框架的 DOM 级体系，服务 Astro 静态页与任何原生节点。
 *
 * 注册即生效：本模块被 BaseLayout 的脚本引入一次，全站初始化。
 */

import { FX_MODE_STORAGE_KEY, getFxTier, hasWebgl2, isAutomation, prefersReducedMotion } from './capabilities';
import { initFxLifecycle } from './lifecycle';
import { registerFx } from './registry';
import { createRenderLoop, onThemeChange, readSceneColor } from './scene';
import { mountCountUp } from './effects/count-up';
import { mountReveal, mountRevealGroup } from './effects/reveal';
import { mountDecrypt, mountSplit } from './effects/text';
import { ensureBackdrop } from './layers/backdrop';
import { mountLetterGlitch } from './layers/letter-glitch';

/* 画布层仅在 full 档挂载（桌面、无减少动效、非自动化环境） */
registerFx('scene-backdrop', (host) => {
  if (getFxTier() !== 'full' || !hasWebgl2() || isAutomation()) return undefined;
  return ensureBackdrop(host);
});

registerFx('letter-glitch', (host) => {
  if (getFxTier() !== 'full' || !hasWebgl2() || isAutomation()) return undefined;
  return mountLetterGlitch(host);
});

/* DOM 特效：lite 档内部自行降级为静态显形 */
registerFx('reveal', mountReveal, '.fx-reveal[data-fx-reveal]:not([data-fx-reveal-group])');
registerFx('reveal-group', mountRevealGroup, '[data-fx-reveal-group]');
registerFx('split', mountSplit, '[data-fx-split]');
registerFx('decrypt', mountDecrypt, '[data-fx-decrypt]');
registerFx('count-up', mountCountUp, '.stat-num[data-countup],[data-fx-count]');

initFxLifecycle();

export {
  FX_MODE_STORAGE_KEY,
  createRenderLoop,
  getFxTier,
  hasWebgl2,
  isAutomation,
  mountCountUp,
  mountDecrypt,
  mountLetterGlitch,
  mountReveal,
  mountRevealGroup,
  mountSplit,
  onThemeChange,
  prefersReducedMotion,
  readSceneColor,
  registerFx,
};
