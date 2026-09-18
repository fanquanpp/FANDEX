/**
 * 子级功能页入口单一数据源
 * -----------------------------------------------------------------------------
 * 首页 hero 入口 / 子功能页 FeatureNav / 文档页顶栏直达链接 / 移动端功能面板
 * 共用同一组入口定义，保证全站各表面看到的入口集合与顺序一致；
 * 新增子级功能页时只需在此追加一项，各表面自动同步。
 *
 * 桌面端构建（DESKTOP_BUILD=1）不提供在线编程，webOnly 入口由
 * getFeatureEntries 统一过滤，序号随实际渲染重排（与入场动画 --entry-i 解耦）。
 */
import { IS_DESKTOP_BUILD } from '@/lib/constants';

export interface FeatureEntry {
  /** 入口文案 */
  name: string;
  /** 相对 BASE_URL 的路径（以 / 结尾；trailingSlash: 'always'） */
  path: string;
  /** 悬停提示 */
  tooltip: string;
  /** 仅 web 构建渲染（桌面端无在线编程） */
  webOnly?: boolean;
}

/** 顶栏与首页 hero 共用的四个顶级子功能入口（顺序即跨页心智模型） */
export const FEATURE_ENTRIES: FeatureEntry[] = [
  { name: '在线编程', path: 'playground/', tooltip: '在线编写与运行代码', webOnly: true },
  { name: '语法速览', path: 'syntax/', tooltip: '语法快速查阅' },
  { name: '学习路线', path: 'learning-path/', tooltip: '系统化学习路径' },
  { name: '算法教学', path: 'algorithms/', tooltip: '算法教程与刷题图鉴' },
];

/** 功能面板附加直达项：层级较深的次级页，绕过父级页中转一步直达 */
export const FEATURE_SHEET_EXTRA_ENTRIES: FeatureEntry[] = [
  { name: '算法题图鉴', path: 'algorithms/problems/', tooltip: '经典算法题与讲解' },
];

/** 解析为带完整前缀的入口（构建期静态过滤 webOnly） */
export function resolveFeatureEntries(base: string, entries: FeatureEntry[]) {
  return entries
    .filter(entry => !IS_DESKTOP_BUILD || !entry.webOnly)
    .map(entry => ({ ...entry, href: `${base}${entry.path}` }));
}

/** 顶栏 / 首页 hero 入口 */
export function getFeatureEntries(base: string) {
  return resolveFeatureEntries(base, FEATURE_ENTRIES);
}

/** 移动端功能面板入口（含次级直达项） */
export function getFeatureSheetEntries(base: string) {
  return resolveFeatureEntries(base, [...FEATURE_ENTRIES, ...FEATURE_SHEET_EXTRA_ENTRIES]);
}
