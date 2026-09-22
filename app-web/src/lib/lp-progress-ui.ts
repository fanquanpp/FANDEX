import { t } from './i18n';

const LAST_KEY = 'fandex-lp-last';
const PROGRESS_KEY = 'fandex-lp-progress';

interface LastVisit {
  module: string;
  title: string;
  ts?: number;
}

type ProgressStore = Record<string, Record<string, 'learning' | 'done'>>;

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

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
  try {
    const colors = hub.dataset.lpColors ? (JSON.parse(hub.dataset.lpColors) as Record<string, string>) : null;
    const color = colors?.[last.module];
    if (color) link.style.setProperty('--resume-color', color);
  } catch {
    /* 颜色映射解析失败时保持兜底色 */
  }
  wrap.hidden = false;
}

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

function initLpProgressUi(): void {
  const hub = document.querySelector<HTMLElement>('[data-lp-hub]');
  if (hub && hub.dataset.lpHubBound !== 'true') {
    hub.dataset.lpHubBound = 'true';
    initResumeChip(hub);
    initCardBadges(hub);
  }

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

if (!import.meta.env.SSR && typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initLpProgressUi);
}
