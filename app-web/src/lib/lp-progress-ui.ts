/**
 * 学习路线进度直显（总览页 + 单技术地图页共用）
 * -----------------------------------------------------------------------------
 * 功能直达迭代（2026-09-19）：
 * 1. 单技术地图页：进入即记录「最近学习的技术」（localStorage fandex-lp-last），
 *    作为总览页「继续上次学习」直达芯片的数据源
 * 2. 总览页 hero：读取最近学习记录，点亮「继续上次」芯片，一步回到上次的地图
 * 3. 总览页技术卡片：读取三态进度表（fandex-lp-progress，islands/learning-path/
 *    progress.ts 同源键名），在卡片上直接标注「已完成 x / N · 学习中 y」，
 *    不进入地图即可看到每门技术的真实学习进度
 *
 * 兼容 ClientRouter：astro:page-load 重新绑定（dataset 防重入）；
 * localStorage 不可用（隐私模式）时全部静默降级为隐藏。
 * 徽章文案经 lib/i18n 的 t() 取当前语言（UI 双语）。
 */
import { t } from './i18n';

/** 最近学习记录键 */
const LAST_KEY = 'fandex-lp-last';
/** 三态进度表键（与 islands/learning-path/progress.ts 的 STORAGE_KEY 同源） */
const PROGRESS_KEY = 'fandex-lp-progress';

interface LastVisit {
  module: string;
  title: string;
  ts?: number;
}

/** 进度表：技术模块 -> 节点 ID -> learning/done */
type ProgressStore = Record<string, Record<string, 'learning' | 'done'>>;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** 总览页：点亮「继续上次学习」直达芯片 */
function initResumeChip(hub: HTMLElement): void {
  const wrap = hub.querySelector<HTMLElement>('[data-lp-resume]');
  if (!wrap) return;
  const last = readJson<LastVisit>(LAST_KEY);
  if (!last?.module || !last.title) return;
  const base = hub.dataset.lpBase ?? '/';
  const link = wrap.querySelector<HTMLAnchorElement>('[data-lp-resume-link]');
  const name = wrap.querySelector<HTMLElement>('[data-lp-resume-name]');
  if (!link || !name) return;
  link.href = `${base}learning-path/${last.module}/`;
  name.textContent = last.title;
  // 芯片色块跟随目标技术的分类主题色（--lp-colors：module -> 分类色，构建期注入）
  try {
    const colors = hub.dataset.lpColors ? (JSON.parse(hub.dataset.lpColors) as Record<string, string>) : null;
    const color = colors?.[last.module];
    if (color) link.style.setProperty('--resume-color', color);
  } catch {
    /* 颜色映射解析失败时保持兜底色 */
  }
  wrap.hidden = false;
}

/** 总览页：技术卡片标注本机学习进度（已完成 / 学习中） */
function initCardBadges(hub: HTMLElement): void {
  const store = readJson<ProgressStore>(PROGRESS_KEY) ?? {};
  hub.querySelectorAll<HTMLElement>('[data-lp-module]').forEach((card) => {
    const badge = card.querySelector<HTMLElement>('[data-lp-progress]');
    if (!badge) return;
    const tech = store[card.dataset.lpModule ?? ''];
    if (!tech) return;
    let done = 0;
    let learning = 0;
    Object.values(tech).forEach((state) => {
      if (state === 'done') done += 1;
      if (state === 'learning') learning += 1;
    });
    if (done === 0 && learning === 0) return;
    const total = card.dataset.lpTotal ?? '';
    const parts = [
      total
        ? t('lp.badgeDoneTotal', { n: done, t: total })
        : t('lp.badgeDone', { n: done }),
    ];
    if (learning > 0) parts.push(t('lp.badgeLearning', { n: learning }));
    badge.textContent = parts.join(' · ');
    badge.hidden = false;
  });
}

/** 绑定两个表面（每次页面切换后由 astro:page-load 调用） */
function initLpProgressUi(): void {
  // 总览页：继续上次 + 卡片进度徽章
  const hub = document.querySelector<HTMLElement>('[data-lp-hub]');
  if (hub && hub.dataset.lpHubBound !== 'true') {
    hub.dataset.lpHubBound = 'true';
    initResumeChip(hub);
    initCardBadges(hub);
  }

  // 单技术地图页：记录最近学习（总览页直达芯片的数据源）
  const tech = document.querySelector<HTMLElement>('[data-lp-tech]');
  if (tech && tech.dataset.lpTechBound !== 'true') {
    tech.dataset.lpTechBound = 'true';
    const moduleId = tech.dataset.lpTech;
    const title = tech.dataset.lpTechTitle;
    if (moduleId && title) {
      try {
        localStorage.setItem(
          LAST_KEY,
          JSON.stringify({ module: moduleId, title, ts: Date.now() }),
        );
      } catch {
        /* 存储不可用（隐私模式/容量满）时放弃持久化 */
      }
    }
  }
}

// 浏览器专属代码：模块顶层执行守卫，避免构建期求值报错
if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initLpProgressUi);
}
