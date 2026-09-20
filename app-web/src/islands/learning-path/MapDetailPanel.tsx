/**
 * 思维导图详情面板
 * -----------------------------------------------------------------------------
 * 展示当前悬停/选中知识点的说明、难度、文档状态与跳转入口；
 * 提供三态学习进度标记（未学习/学习中/已完成，localStorage 持久化）；
 * 待补充节点提供官方资料兜底与"定位到节点"操作。
 * 界面文案经 lib/i18n 的 t() 取当前语言（UI 双语）。
 */
import type { CSSProperties } from 'react';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';
import type { NodeProgress, NodeVM } from './types';

interface Props {
  /** 当前节点（null 时显示引导提示） */
  node: NodeVM | null;
  /** 技术标题 */
  techTitle: string;
  /** 技术主题色 */
  color: string;
  /** 当前节点学习进度（null = 未学习） */
  progress: NodeProgress | null;
  /** 设置节点进度（null = 清除标记） */
  onSetProgress: (nodeId: string, state: NodeProgress | null) => void;
  /** 关闭选中 */
  onClose: () => void;
  /** 定位到节点（画布居中） */
  onFocus: () => void;
}

/** 难度标签字典键 */
const DIFFICULTY_KEY: Record<string, string> = {
  beginner: 'lpMap.legendBeginner',
  intermediate: 'lpMap.legendIntermediate',
  advanced: 'lpMap.legendAdvanced',
};

/** 进度三态选项（value null 用 'none' 字符串承载以便遍历） */
const PROGRESS_OPTIONS: Array<{ value: 'none' | NodeProgress; labelKey: string }> = [
  { value: 'none', labelKey: 'lpMap.statusNone' },
  { value: 'learning', labelKey: 'lpMap.statusLearning' },
  { value: 'done', labelKey: 'lpMap.statusDone' },
];

/** 难度标签取词：未知难度回退原始值（noUncheckedIndexedAccess 收窄） */
function difficultyLabel(difficulty: string, lang: Lang): string {
  const key = DIFFICULTY_KEY[difficulty];
  return key ? t(key, undefined, lang) : difficulty;
}

/** 详情面板：无节点时展示引导，有节点时展示完整信息 */
export default function MapDetailPanel({
  node,
  techTitle,
  color,
  progress,
  onSetProgress,
  onClose,
  onFocus,
}: Props) {
  const lang = useLang();
  if (!node) {
    return (
      <aside className="lp-panel lp-panel--empty">
        {/* 自绘 SVG 导图示意：根节点 → 阶段 → 知识点链 */}
        <svg className="lp-panel__empty-svg" viewBox="0 0 160 96" aria-hidden="true">
          <path className="lp-panel__empty-edge" d="M 24 20 C 52 20, 52 44, 82 44" />
          <path className="lp-panel__empty-edge" d="M 82 44 C 112 44, 112 68, 142 68" />
          <rect className="lp-panel__empty-node lp-panel__empty-node--root" x="4" y="10" width="20" height="20" rx="2" />
          <rect className="lp-panel__empty-node" x="82" y="34" width="20" height="20" rx="2" />
          <rect className="lp-panel__empty-node lp-panel__empty-node--planned" x="142" y="58" width="16" height="20" rx="2" />
        </svg>
        <h3 className="lp-panel__empty-title">{t('lpMap.emptyTitle', undefined, lang)}</h3>
        <p className="lp-panel__hint">{t('lpMap.emptyHint', undefined, lang)}</p>
        <p className="lp-panel__sub">{t('lpMap.emptySub', undefined, lang)}</p>
      </aside>
    );
  }

  const planned = !node.href;
  const currentState: 'none' | NodeProgress = progress ?? 'none';
  return (
    <aside className="lp-panel" style={{ '--lp-panel-color': color } as CSSProperties}>
      <div className="lp-panel__head">
        <span className="lp-panel__stage">{node.stageTitle}</span>
        <button type="button" className="fndx-icon-btn" onClick={onClose} aria-label={t('lpMap.closeDetail', undefined, lang)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <h3 className="lp-panel__title">{node.title}</h3>
      <div className="lp-panel__meta">
        {node.difficulty && (
          <span className={`lp-panel__difficulty diff-${node.difficulty}`}>
            {difficultyLabel(node.difficulty, lang)}
          </span>
        )}
        <span className={`lp-panel__status${planned ? ' lp-panel__status--planned' : ''}`}>
          {planned ? t('lpMap.statusPlanned', undefined, lang) : t('lpMap.statusPublished', undefined, lang)}
        </span>
      </div>
      {node.desc && <p className="lp-panel__desc">{node.desc}</p>}

      {/* 学习进度标记：三态分段选择（roadmap.sh 模式，localStorage 持久化） */}
      <div className="lp-panel__progress" role="group" aria-label={t('lpMap.progressGroupAria', undefined, lang)}>
        {PROGRESS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`lp-panel__progress-btn${
              currentState === option.value ? ' is-active' : ''
            }${option.value === 'done' && currentState === 'done' ? ' is-done' : ''}`}
            aria-pressed={currentState === option.value}
            onClick={() => onSetProgress(node.id, option.value === 'none' ? null : option.value)}
          >
            {t(option.labelKey, undefined, lang)}
          </button>
        ))}
      </div>

      {node.href ? (
        <a className="lp-panel__doc-link" href={node.href}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          {node.docTitle
            ? t('lpMap.readDoc', { title: node.docTitle }, lang)
            : t('lpMap.readGeneric', undefined, lang)}
        </a>
      ) : (
        <div className="lp-panel__notice">
          {t('lpMap.noDoc', undefined, lang)}
        </div>
      )}

      {node.official && (
        <a
          className="lp-panel__official"
          href={node.official.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          {node.official.label}
        </a>
      )}

      <button type="button" className="lp-panel__locate" onClick={onFocus}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="9" />
        </svg>
        {t('lpMap.locate', undefined, lang)}
      </button>
      <p className="lp-panel__footer">{t('lpMap.panelFooter', { title: techTitle }, lang)}</p>
    </aside>
  );
}
