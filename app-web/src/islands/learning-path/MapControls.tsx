/**
 * 思维导图画布控制条
 * -----------------------------------------------------------------------------
 * 提供缩小、放大、适应视口、复位、重置进度五个操作，统一使用 fndx-icon-btn
 * 幽灵按钮风格。重置进度仅在有标记时可用（roadmap.sh 的 remove-status 模式）。
 * aria/title 文案经 lib/i18n 的 t() 取当前语言（UI 双语）。
 */
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';

interface Props {
  /** 当前缩放百分比（0-100 整数） */
  scale: number;
  /** 缩小 */
  onZoomOut: () => void;
  /** 放大 */
  onZoomIn: () => void;
  /** 适应视口 */
  onFit: () => void;
  /** 复位到 100% */
  onReset: () => void;
  /** 重置本技术的全部学习进度（组件内已带确认） */
  onResetProgress: () => void;
  /** 是否存在进度标记（无标记时禁用重置按钮） */
  hasProgress: boolean;
}

/** 控制条：仅图标按钮 + 缩放读数 */
export default function MapControls({
  scale,
  onZoomOut,
  onZoomIn,
  onFit,
  onReset,
  onResetProgress,
  hasProgress,
}: Props) {
  const lang = useLang();
  return (
    <div className="lp-controls" role="toolbar" aria-label={t('lpMap.toolbarAria', undefined, lang)}>
      <button type="button" className="fndx-icon-btn" onClick={onZoomOut} aria-label={t('lpMap.zoomOut', undefined, lang)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button type="button" className="fndx-icon-btn" onClick={onZoomIn} aria-label={t('lpMap.zoomIn', undefined, lang)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span className="lp-controls__scale" aria-live="polite">
        {Math.round(scale)}%
      </span>
      <button type="button" className="fndx-icon-btn" onClick={onFit} aria-label={t('lpMap.fit', undefined, lang)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      </button>
      <button type="button" className="fndx-icon-btn" onClick={onReset} aria-label={t('lpMap.reset', undefined, lang)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <polyline points="3 3 3 8 8 8" />
        </svg>
      </button>
      <button
        type="button"
        className="fndx-icon-btn"
        onClick={onResetProgress}
        aria-label={t('lpMap.resetProgress', undefined, lang)}
        title={t('lpMap.resetProgressTitle', undefined, lang)}
        disabled={!hasProgress}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16" />
          <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          <path d="M6 7l1 12a2 2 0 0 0 2 1.9h6a2 2 0 0 0 2-1.9l1-12" />
        </svg>
      </button>
    </div>
  );
}
