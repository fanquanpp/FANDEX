/**
 * 子级功能页入口单一数据源
 * -----------------------------------------------------------------------------
 * 首页 hero 入口 / 子功能页 FeatureNav / 文档页顶栏直达链接 / 移动端功能面板
 * 共用同一组入口定义，保证全站各表面看到的入口集合与顺序一致；
 * 新增子级功能页时只需在此追加一项，各表面自动同步。
 *
 * 文案双语：nameKey/tooltipKey 指向 lib/i18n-strings 字典键，
 * SSR 由消费方 t(key) 渲染中文，运行时经 data-i18n* 属性协议切换英文。
 *
 * 桌面端构建（DESKTOP_BUILD=1）不提供在线前端，webOnly 入口由
 * getFeatureEntries 统一过滤，序号随实际渲染重排（与入场动画 --entry-i 解耦）。
 */
import { IS_DESKTOP_BUILD } from '@/lib/constants';
import { t } from '@/lib/i18n';

export interface FeatureEntry {
  /** 入口文案字典键（nameKey 渲染用 / nameKey 运行时切换用） */
  nameKey: string;
  /** 悬停提示字典键 */
  tooltipKey: string;
  /** 相对 BASE_URL 的路径（以 / 结尾；trailingSlash: 'always'） */
  path: string;
  /** 仅 web 构建渲染（桌面端无在线前端） */
  webOnly?: boolean;
}

/** 顶栏与首页 hero 共用的四个顶级子功能入口（顺序即跨页心智模型） */
export const FEATURE_ENTRIES: FeatureEntry[] = [
  { nameKey: 'feature.playground.name', tooltipKey: 'feature.playground.tooltip', path: 'playground/', webOnly: true },
  { nameKey: 'feature.syntax.name', tooltipKey: 'feature.syntax.tooltip', path: 'syntax/' },
  { nameKey: 'feature.learningPath.name', tooltipKey: 'feature.learningPath.tooltip', path: 'learning-path/' },
  { nameKey: 'feature.algorithms.name', tooltipKey: 'feature.algorithms.tooltip', path: 'algorithms/' },
];

/** 功能面板附加直达项：较深的功能视图，绕过父级页中转一步直达 */
export const FEATURE_SHEET_EXTRA_ENTRIES: FeatureEntry[] = [
  { nameKey: 'feature.sheet.problems.name', tooltipKey: 'feature.sheet.problems.tooltip', path: 'algorithms/?view=problems' },
];

/** 解析为带完整前缀的入口（构建期静态过滤 webOnly），name/tooltip 为 SSR 中文渲染值 */
export function resolveFeatureEntries(base: string, entries: FeatureEntry[]) {
  return entries
    .filter(entry => !IS_DESKTOP_BUILD || !entry.webOnly)
    .map(entry => ({
      ...entry,
      href: `${base}${entry.path}`,
      name: t(entry.nameKey),
      tooltip: t(entry.tooltipKey),
    }));
}

/** 顶栏 / 首页 hero 入口 */
export function getFeatureEntries(base: string) {
  return resolveFeatureEntries(base, FEATURE_ENTRIES);
}

/** 移动端功能面板入口（含次级直达项） */
export function getFeatureSheetEntries(base: string) {
  return resolveFeatureEntries(base, [...FEATURE_ENTRIES, ...FEATURE_SHEET_EXTRA_ENTRIES]);
}
