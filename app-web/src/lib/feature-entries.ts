import { IS_DESKTOP_BUILD } from '@/lib/constants';
import { t } from '@/lib/i18n';

export interface FeatureEntry {
  nameKey: string;
  tooltipKey: string;
  path: string;
  webOnly?: boolean;
}

export const FEATURE_ENTRIES: FeatureEntry[] = [
  { nameKey: 'feature.playground.name', tooltipKey: 'feature.playground.tooltip', path: 'playground/', webOnly: true },
  { nameKey: 'feature.syntax.name', tooltipKey: 'feature.syntax.tooltip', path: 'syntax/' },
  { nameKey: 'feature.learningPath.name', tooltipKey: 'feature.learningPath.tooltip', path: 'learning-path/' },
  { nameKey: 'feature.algorithms.name', tooltipKey: 'feature.algorithms.tooltip', path: 'algorithms/' },
];

export const FEATURE_SHEET_EXTRA_ENTRIES: FeatureEntry[] = [
  { nameKey: 'feature.sheet.problems.name', tooltipKey: 'feature.sheet.problems.tooltip', path: 'algorithms/?view=problems' },
];

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

export function getFeatureEntries(base: string) {
  return resolveFeatureEntries(base, FEATURE_ENTRIES);
}

export function getFeatureSheetEntries(base: string) {
  return resolveFeatureEntries(base, [...FEATURE_ENTRIES, ...FEATURE_SHEET_EXTRA_ENTRIES]);
}
