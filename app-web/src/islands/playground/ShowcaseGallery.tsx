
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PgIcon } from './pg-icons';
import { buildPreviewDoc } from './pg-frontend-runtime';
import {
  SHOWCASE_GROUPS,
  groupShowcaseItems,
  type ShowcaseItem,
} from './pg-showcase';
import { useLang } from '@/lib/use-lang';
import { t } from '@/lib/i18n';

interface GalleryProps {
  open: boolean;
  onClose: () => void;
  onLoad: (item: ShowcaseItem) => void;
}

const ShowcaseCard = memo(function ShowcaseCard({
  item,
  active,
  onLoad,
}: {
  item: ShowcaseItem;
  active: boolean;
  onLoad: (item: ShowcaseItem) => void;
}) {
  const lang = useLang();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!active) return;
    const el = cardRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 兜底分支，同步设置即为预期
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '160px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  const previewDoc = useMemo(
    () => (inView ? buildPreviewDoc(item) : ''),
    [inView, item],
  );

  return (
    <div className="pg-sc-card" ref={cardRef}>
      <div className="pg-sc-preview">
        {inView ? (
          <iframe
            className="pg-sc-frame"
            sandbox="allow-scripts"
            srcDoc={previewDoc}
            title={t('pgSc.previewTitle', { name: item.name }, lang)}
            loading="lazy"
            tabIndex={-1}
          />
        ) : (
          <div className="pg-sc-placeholder">{t('pgSc.placeholder', undefined, lang)}</div>
        )}
      </div>
      <div className="pg-sc-meta">
        <div className="pg-sc-text">
          <span className="pg-sc-name">{item.name}</span>
          <span className="pg-sc-desc">{item.desc}</span>
        </div>
        <button
          type="button"
          className="pg-btn pg-btn--ghost pg-btn--sm pg-sc-load"
          onClick={() => onLoad(item)}
          title={t('pgSc.loadAria', { name: item.name }, lang)}
        >
          <PgIcon name="code" size={12} />
          <span>{t('pgSc.load', undefined, lang)}</span>
        </button>
      </div>
    </div>
  );
});

export default function ShowcaseGallery({ open, onClose, onLoad }: GalleryProps) {
  const lang = useLang();
  const [group, setGroup] = useState<string>('all');
  const grouped = useMemo(() => groupShowcaseItems(), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // 焦点管理（无障碍）：打开时把焦点移入面板，关闭时归还给之前的触发元素
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    };
  }, [open]);

  if (!open) return null;

  const items: ShowcaseItem[] =
    group === 'all'
      ? SHOWCASE_GROUPS.flatMap((g) => grouped.get(g.id) ?? [])
      : (grouped.get(group) ?? []);

  const renderGroupBtn = (id: string, label: string, count?: ReactNode) => (
    <button
      key={id}
      type="button"
      className={`pg-sc-group${group === id ? ' is-active' : ''}`}
      onClick={() => setGroup(id)}
      aria-pressed={group === id}
    >
      <span className="pg-sc-group-name">{label}</span>
      {count != null && <em className="pg-sc-group-count">{count}</em>}
    </button>
  );

  return (
    <div className="pg-sc-mask" role="dialog" aria-modal="true" aria-label={t('pgSc.maskAria', undefined, lang)}>
      <div ref={panelRef} tabIndex={-1} className="pg-sc-panel">
        {/* 面板头部：标题与关闭 */}
        <header className="pg-sc-head">
          <span className="pg-sc-title">
            <PgIcon name="spark" size={15} />
            {t('pgSc.title', undefined, lang)}
            <em className="pg-sc-title-note">{t('pgSc.note', { n: items.length }, lang)}</em>
          </span>
          <button
            type="button"
            className="pg-btn pg-btn--ghost pg-btn--sm"
            onClick={onClose}
            title={t('pgSc.closeTitle', undefined, lang)}
          >
            <PgIcon name="close" size={14} />
          </button>
        </header>

        <div className="pg-sc-layout">
          {/* 分组导航：桌面侧栏、窄屏横向滚动 */}
          <nav className="pg-sc-nav" aria-label={t('pgSc.groupsAria', undefined, lang)}>
            {renderGroupBtn('all', t('pgSc.all', undefined, lang), items.length)}
            {SHOWCASE_GROUPS.map((g) => {
              const list = grouped.get(g.id) ?? [];
              return (
                <div className="pg-sc-nav-item" key={g.id}>
                  {renderGroupBtn(g.id, g.name, list.length)}
                  <span className="pg-sc-group-desc">{g.desc}</span>
                </div>
              );
            })}
          </nav>

          {/* 成品网格 */}
          <div className="pg-sc-body">
            <div className="pg-sc-grid">
              {items.map((item) => (
                <ShowcaseCard key={item.id} item={item} active={open} onLoad={onLoad} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
