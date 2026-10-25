/**
 * fx — FANDEX 动效特效体系单一入口。
 *
 * 分层结构：
 *   fx/capabilities.ts   能力门控（full / lite / off 三档）
 *   fx/registry.ts       注册表：data-fx 命名挂载 + 选择器挂载，幂等
 *   fx/lifecycle.ts      astro:page-load / before-swap 生命周期对齐
 *   fx/scene.ts          场景令牌读取、主题订阅
 *   fx/layers/           画布层：letter-glitch
 *   fx/effects/          DOM 特效：reveal、split/decrypt、count-up
 *   fx/decor-config.ts   律动装饰配置（SceneBackdrop 单图层渲染的单一来源）
 *
 * 背景视觉收敛在 SceneBackdrop 的唯一图层内（z-index -1 垫底）：
 * 底色 + 暗角 + 律动装饰 + 字符故障场。波浪线场与指针网格已按
 * 2026-10-25 视觉裁定删除，勿再加回。
 *
 * 注册即生效：本模块被 BaseLayout 的脚本引入一次，全站初始化。
 */

import { getFxTier, hasWebgl2, isAutomation } from './capabilities';
import { initFxLifecycle } from './lifecycle';
import { registerFx } from './registry';
import { mountCountUp } from './effects/count-up';
import { mountReveal, mountRevealGroup } from './effects/reveal';
import { mountDecrypt, mountSplit } from './effects/text';
import { mountLetterGlitch } from './layers/letter-glitch';

/* 画布层仅在 full 档挂载（桌面、无减少动效、非自动化环境） */
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
