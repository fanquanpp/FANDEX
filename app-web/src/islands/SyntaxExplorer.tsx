/**
 * 语法速览交互岛（SyntaxExplorer）
 * =============================================================================
 * 功能概述：
 * - 语言切换：通过彩色语言 chip 过滤语法卡片（无搜索）
 * - 按需加载：卡片数据按语言拆分到 public/syntax-data/<module>.json，
 *   切换语言时 fetch 对应分块并缓存，避免页面内嵌 2MB 数据
 * - 速查卡片：复用首页模块卡片体系（.module-card 特效），
 *   缩小为"图标 + 小节 + 写法 + 公式"的紧凑入口
 * - 悬浮面板：点击卡片后弹出详情面板（Radix Dialog），
 *   展示完整公式、示例代码、复制按钮与完整文档入口
 *
 * 数据流：
 *   languages prop（页面内嵌索引）→ activeId state → fetch 语言分块
 *   → cards state → 网格渲染；点击卡片 → selected state → 悬浮面板
 *
 * 设计说明：
 * - 并发保护：请求序号 ref 保证快速切换语言时旧响应不会覆盖新状态
 * - 缓存：已加载语言分块存于 Map ref，再次切换零网络开销
 * - 无障碍：chip 使用 aria-pressed；面板由 Radix Dialog 提供
 *   焦点陷阱、Escape 关闭与 aria 语义
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
// 复用首页模块卡片样式（顶部色条、hover 边框/阴影、几何图标、标题变色）
import '@/styles/components/module-card.css';
import '@/styles/islands/syntax-explorer.css';

/** 语法速览语言元数据（与 syntax-service 类型一致） */
interface SyntaxLanguage {
  id: string;
  title: string;
  icon: string;
  color: string;
  count: number;
  docCount: number;
}

/** 单张语法速查卡片 */
interface SyntaxCard {
  id: string;
  docTitle: string;
  section: string;
  name: string;
  formula: string;
  code: string;
  /** 构建期 Shiki 高亮 HTML（双主题 CSS 变量方案）；空串表示无高亮，回退纯文本 */
  codeHtml: string;
  lang: string;
  truncated: boolean;
}

/** 语言分块 JSON 结构（scripts/build-syntax.mjs 输出） */
interface SyntaxLanguageData {
  module: string;
  cards: SyntaxCard[];
}

/** SyntaxExplorer 组件入参 */
interface SyntaxExplorerProps {
  /** 语言索引列表（由页面通过 syntax-service 提供） */
  languages: SyntaxLanguage[];
  /** 站点 base 路径（GitHub Pages 为 /FANDEX/），用于拼接数据与文档链接 */
  base: string;
}

/** 单批渲染的卡片数量：兼顾首屏密度与滚动性能 */
const PAGE_SIZE = 36;
/** 复制成功提示持续时长（毫秒） */
const COPIED_MS = 1600;
/** 未指定语言时的默认选中项（优先常用语言） */
const DEFAULT_LANGUAGE = 'javascript';
/** 首页滚动容器选择器：面板打开时锁定滚动 */
const HOME_MAIN_SELECTOR = '.home-main';

/**
 * 语法速览交互岛
 * 提供语言切换、紧凑速查卡片、悬浮详情面板与代码复制能力
 */
export function SyntaxExplorer({ languages, base }: SyntaxExplorerProps) {
  /** 当前选中的语言 ID */
  const [activeId, setActiveId] = useState<string>(
    () =>
      languages.find((lang) => lang.id === DEFAULT_LANGUAGE)?.id ??
      languages[0]?.id ??
      '',
  );
  /** 当前语言的卡片列表；null 表示尚未加载完成 */
  const [cards, setCards] = useState<SyntaxCard[] | null>(null);
  /** 是否正在加载语言分块 */
  const [loading, setLoading] = useState(false);
  /** 加载失败信息；为空表示正常 */
  const [error, setError] = useState('');
  /** 当前可见卡片数量（分批渲染） */
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  /** 悬浮面板当前展示的卡片；null 表示面板关闭 */
  const [selected, setSelected] = useState<SyntaxCard | null>(null);
  /** 最近一次复制成功的卡片 ID，用于按钮反馈 */
  const [copiedId, setCopiedId] = useState('');
  /** 已加载语言分块缓存：切换回已访问语言时零网络开销 */
  const cacheRef = useRef<Map<string, SyntaxCard[]>>(new Map());
  /** 请求序号：防止快速切换时旧响应覆盖新语言状态 */
  const requestSeqRef = useRef(0);
  /** 复制反馈定时器句柄（组件卸载时清理） */
  const copiedTimerRef = useRef<number | undefined>(undefined);

  const active = languages.find((lang) => lang.id === activeId);
  const activeColor = active?.color || 'var(--color-accent-base)';

  /**
   * 切换语言：清空旧卡片并触发对应分块加载
   * @param id - 目标语言 ID
   */
  function selectLanguage(id: string): void {
    if (id === activeId) return;
    setActiveId(id);
  }

  /**
   * 复制代码到剪贴板
   * @param cardId - 卡片 ID（用于复制按钮反馈）
   * @param code - 待复制的代码文本
   */
  async function copyCode(cardId: string, code: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(cardId);
      window.clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = window.setTimeout(() => {
        setCopiedId((current) => (current === cardId ? '' : current));
      }, COPIED_MS);
    } catch {
      // 剪贴板权限不可用时静默降级，不打断用户操作
    }
  }

  /**
   * 加载语言分块并更新卡片状态
   * 使用请求序号防止竞态：仅当响应仍是最新请求时写入状态
   * @param id - 语言 ID
   */
  async function loadLanguage(id: string): Promise<void> {
    const seq = ++requestSeqRef.current;
    // 已缓存数据直接渲染，无需网络请求
    const cached = cacheRef.current.get(id);
    if (cached) {
      setCards(cached);
      setLoading(false);
      setError('');
      setVisibleCount(PAGE_SIZE);
      return;
    }
    setLoading(true);
    setError('');
    setVisibleCount(PAGE_SIZE);
    try {
      const response = await fetch(`${base}syntax-data/${id}.json`, {
        // 静态分块不可变，允许浏览器复用缓存
        cache: 'force-cache',
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = (await response.json()) as SyntaxLanguageData;
      const cardList = Array.isArray(data.cards) ? data.cards : [];
      cacheRef.current.set(id, cardList);
      // 竞态保护：仅最新请求可写入状态
      if (seq !== requestSeqRef.current) return;
      setCards(cardList);
    } catch {
      if (seq !== requestSeqRef.current) return;
      setError('语法数据加载失败，请稍后重试或切换其他语言');
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }

  // 语言切换或首次挂载时加载对应分块
  useEffect(() => {
    if (!activeId) return;
    void loadLanguage(activeId);
    // 组件卸载时清理复制反馈定时器
    return () => window.clearTimeout(copiedTimerRef.current);
  }, [activeId]);

  // 面板打开时锁定首页滚动容器，关闭后恢复
  useEffect(() => {
    const main = document.querySelector<HTMLElement>(HOME_MAIN_SELECTOR);
    if (!main) return;
    if (selected) {
      main.classList.add('syntax-panel-open');
    } else {
      main.classList.remove('syntax-panel-open');
    }
    return () => main.classList.remove('syntax-panel-open');
  }, [selected]);

  const visibleCards = cards?.slice(0, visibleCount) ?? [];

  return (
    <div className="syntax-explorer">
      {/* 语言切换区：彩色 chip 导航，颜色跟随模块分类主题色 */}
      <nav className="syntax-langs" aria-label="语法语言切换">
        {languages.map((lang) => {
          const isActive = lang.id === activeId;
          return (
            <button
              key={lang.id}
              type="button"
              className={`syntax-lang-chip${isActive ? ' is-active' : ''}`}
              style={{ '--lang-color': lang.color } as CSSProperties}
              aria-pressed={isActive}
              onClick={() => selectLanguage(lang.id)}
            >
              <span className="syntax-lang-bar" aria-hidden="true" />
              <span className="syntax-lang-name">{lang.title}</span>
              <span className="syntax-lang-count">{lang.count}</span>
            </button>
          );
        })}
      </nav>

      {/* 当前语言元信息：供屏幕阅读器播报加载状态 */}
      <div className="syntax-meta" aria-live="polite">
        {loading
          ? '正在加载语法卡片'
          : active
            ? `${active.title} · ${active.count} 个语法点 · 来自 ${active.docCount} 篇文档`
            : ''}
      </div>

      {/* 加载失败提示 */}
      {error && (
        <div className="syntax-error" role="alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* 速查卡片网格：复用首页模块卡片特效，点击打开悬浮面板 */}
      {cards && cards.length > 0 && (
        <>
          <div className="syntax-grid">
            {visibleCards.map((card, index) => (
              <button
                type="button"
                className="module-card syntax-card"
                key={card.id}
                style={
                  {
                    '--module-color': activeColor,
                    animationDelay: `${Math.min(index, 7) * 40}ms`,
                  } as CSSProperties
                }
                onClick={() => setSelected(card)}
              >
                <span className="card-header">
                  <span className="card-icon">{active?.icon}</span>
                  <span className="card-title" title={card.section}>
                    {card.section}
                  </span>
                </span>
                <span className="card-desc">{card.name}</span>
                {card.formula && <code className="syntax-card__formula">{card.formula}</code>}
              </button>
            ))}
          </div>

          {/* 增量加载：未展示完时提供"加载更多" */}
          {visibleCount < cards.length && (
            <button
              type="button"
              className="syntax-more fndx-icon-btn fndx-icon-btn--labeled"
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
            >
              加载更多（剩余 {cards.length - visibleCount} 条）
            </button>
          )}
        </>
      )}

      {/* 空数据兜底：语言分块为空时提示（正常情况不会出现） */}
      {!loading && !error && cards && cards.length === 0 && (
        <div className="syntax-empty">该语言暂无速查卡片</div>
      )}

      {/* 悬浮详情面板：Radix Dialog 提供焦点陷阱与 Escape 关闭 */}
      <DialogPrimitive.Root
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="syntax-panel-overlay" />
          <DialogPrimitive.Content
            className="syntax-panel"
            style={{ '--lang-color': activeColor } as CSSProperties}
            aria-label={`${active?.title} 语法详情`}
          >
            {/* 面板头部：语言徽标 + 来源文档 */}
            <div className="syntax-panel__header">
              <span className="syntax-panel__badge" style={{ backgroundColor: activeColor }}>
                {active?.title}
              </span>
              <span className="syntax-panel__doc" title={selected?.docTitle}>
                {selected?.docTitle}
              </span>
            </div>

            {/* 语法要点：小节标题 + 写法名称 + 完整公式 */}
            <h2 className="syntax-panel__section">{selected?.section}</h2>
            <p className="syntax-panel__name">{selected?.name}</p>
            {selected?.formula && (
              <code className="syntax-panel__formula">{selected.formula}</code>
            )}

            {/* 示例代码：语言标签 + 复制按钮 + 代码区 */}
            {selected && (
              <div className="syntax-panel__code">
                <div className="syntax-panel__codebar">
                  <span className="syntax-panel__lang">{selected.lang}</span>
                  <button
                    type="button"
                    className="syntax-panel__copy fndx-icon-btn fndx-icon-btn--labeled"
                    aria-label={copiedId === selected.id ? '已复制' : '复制代码'}
                    onClick={() => void copyCode(selected.id, selected.code)}
                  >
                    {copiedId === selected.id ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                    <span>{copiedId === selected.id ? '已复制' : '复制'}</span>
                  </button>
                </div>
                <pre className="syntax-panel__pre">
                  {/* 高亮 HTML 由构建期 Shiki 生成（build-syntax.mjs），来源为站内构建数据，可安全注入 */}
                  {selected.codeHtml ? (
                    <code dangerouslySetInnerHTML={{ __html: selected.codeHtml }} />
                  ) : (
                    <code>{selected.code}</code>
                  )}
                </pre>
                {selected.truncated && (
                  <div className="syntax-panel__truncated">示例已省略，详见完整文档</div>
                )}
              </div>
            )}

            {/* 面板底部：完整文档入口 + 关闭按钮 */}
            <div className="syntax-panel__footer">
              <a
                className="syntax-panel__link fndx-icon-btn fndx-icon-btn--labeled"
                href={`${base}${active?.id}/`}
              >
                <span>查看 {active?.title} 完整文档</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>
              <DialogPrimitive.Close className="syntax-panel__close fndx-icon-btn fndx-icon-btn--labeled">
                关闭
              </DialogPrimitive.Close>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

export default SyntaxExplorer;
