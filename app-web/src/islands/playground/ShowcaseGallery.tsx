/**
 * 灵感画廊：前端设计成品库（Showcase Gallery）
 *
 * 功能概述：
 *   - 全屏面板展示灵感画廊中的 25 个设计成品，按六类分组浏览
 *   - 每张成品卡片用沙箱 iframe 实时运行动画效果，所见即所得
 *   - 预览按需加载：卡片滚动进入视口后才挂载 srcDoc，避免一次性
 *     创建几十个 iframe 拖慢打开速度
 *   - 「载入编辑器」把成品三段源码交给上层组件写入工作台
 *
 * 安全与性能：
 *   - 预览 iframe 复用编辑器同一套 sandbox（无同源权限），成品代码
 *     运行在独立不透明源，无法访问站点数据
 *   - IntersectionObserver 一次性触发后即断开，滚动开销可忽略
 */

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

interface GalleryProps {
  /** 画廊是否打开（未打开时不渲染任何 DOM） */
  open: boolean;
  /** 请求关闭画廊 */
  onClose: () => void;
  /** 请求把某个成品载入编辑器 */
  onLoad: (item: ShowcaseItem) => void;
}

/** 成品预览卡片（memo 避免画廊状态变化时重渲染全部卡片） */
const ShowcaseCard = memo(function ShowcaseCard({
  item,
  active,
  onLoad,
}: {
  item: ShowcaseItem;
  active: boolean;
  onLoad: (item: ShowcaseItem) => void;
}) {
  /** 卡片根节点（IntersectionObserver 观察目标） */
  const cardRef = useRef<HTMLDivElement | null>(null);
  /** 是否已进入视口（进入后保持 true，预览只加载一次） */
  const [inView, setInView] = useState(false);

  /**
   * 懒加载：卡片进入视口附近才开始构建预览文档
   * 依赖 active（分组切换会重新挂载列表，需要重新观察）
   */
  useEffect(() => {
    if (!active) return;
    const el = cardRef.current;
    if (!el) return;
    // 环境不支持 IntersectionObserver 时直接全量加载，保证功能可用
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
      // 提前 160px 预载，滚动时预览基本已经就绪
      { rootMargin: '160px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [active]);

  /** 预览文档只在真正需要时构建一次 */
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
            title={`${item.name} 预览`}
            loading="lazy"
            tabIndex={-1}
          />
        ) : (
          <div className="pg-sc-placeholder">滚动到可视区域后加载预览</div>
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
          title={`把「${item.name}」的源码载入编辑器`}
        >
          <PgIcon name="code" size={12} />
          <span>载入编辑器</span>
        </button>
      </div>
    </div>
  );
});

/** 灵感画廊主组件 */
export default function ShowcaseGallery({ open, onClose, onLoad }: GalleryProps) {
  /** 当前分组（all 为全部） */
  const [group, setGroup] = useState<string>('all');
  /** 按分组归类的成品（模块级数据，挂载时归类一次） */
  const grouped = useMemo(() => groupShowcaseItems(), []);

  /**
   * Escape 关闭画廊：仅在打开期间监听，关闭后立即解绑
   */
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  /** 未打开时不渲染，重新打开时状态自然回到全部分组 */
  if (!open) return null;

  /** 当前分组下展示的成品列表 */
  const items: ShowcaseItem[] =
    group === 'all'
      ? SHOWCASE_GROUPS.flatMap((g) => grouped.get(g.id) ?? [])
      : (grouped.get(group) ?? []);

  /** 分组切换按钮的公共渲染 */
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
    <div className="pg-sc-mask" role="dialog" aria-modal="true" aria-label="灵感画廊">
      <div className="pg-sc-panel">
        {/* 面板头部：标题与关闭 */}
        <header className="pg-sc-head">
          <span className="pg-sc-title">
            <PgIcon name="spark" size={15} />
            灵感画廊
            <em className="pg-sc-title-note">{items.length} 个成品 · 点击卡片按钮载入源码</em>
          </span>
          <button
            type="button"
            className="pg-btn pg-btn--ghost pg-btn--sm"
            onClick={onClose}
            title="关闭画廊（Esc）"
          >
            <PgIcon name="close" size={14} />
          </button>
        </header>

        <div className="pg-sc-layout">
          {/* 分组导航：桌面侧栏、窄屏横向滚动 */}
          <nav className="pg-sc-nav" aria-label="成品分组">
            {renderGroupBtn('all', '全部', items.length)}
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
