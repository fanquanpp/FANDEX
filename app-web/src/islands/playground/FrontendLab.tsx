
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import CodeMirrorBoxLoader from './CodeMirrorBoxLoader';
import { PgIcon } from './pg-icons';
import { formatCode } from './pg-formatter';
import { estimatePenBytes } from './pg-frontend-runtime';
import ShowcaseGallery from './ShowcaseGallery';
import { SHOWCASE_ITEMS, type ShowcaseItem } from './pg-showcase';
import {
  deletePen,
  getStorageUsage,
  loadPenDraft,
  loadPens,
  savePen,
} from './pg-storage';
import type { FrontendLayout, FrontendPen } from './types';
import { usePenPersistence } from './use-pen-persistence';
import { usePreviewRuntime } from './use-preview-runtime';
import { useSplitPanes, type PaneKey } from './use-split-panes';
import { useLang } from '@/lib/use-lang';
import { t, type Lang } from '@/lib/i18n';

interface PenTemplate {
  id: string;
  nameKey: string;
  descKey: string;
  html: string;
  css: string;
  js: string;
}

const BLANK_HTML = '<h1>你好，FANDEX</h1>\n<button id="demo">点我</button>\n<p id="tip">打开控制台查看输出</p>';
const BLANK_CSS =
  'body {\n  font-family: var(--font-family-body, sans-serif);\n  text-align: center;\n  padding: 40px 16px;\n}\nbutton {\n  padding: 8px 20px;\n  border-radius: 8px;\n  border: 1px solid #0B6E7E;\n  background: #E6FBFC;\n  color: #0B6E7E;\n  cursor: pointer;\n}';
const BLANK_JS =
  "const tip = document.getElementById('tip');\nconst btn = document.getElementById('demo');\nbtn.addEventListener('click', () => {\n  tip.textContent = '点击次数 +1';\n  console.log('按钮被点击');\n});\nconsole.log('预览已就绪');";

const TEMPLATES: readonly PenTemplate[] = [
  { id: 'blank', nameKey: 'pg.template.interactive.name', descKey: 'pg.template.interactive.desc', html: BLANK_HTML, css: BLANK_CSS, js: BLANK_JS },
  {
    id: 'animation',
    nameKey: 'pg.template.animation.name',
    descKey: 'pg.template.animation.desc',
    html: '<div class="stage">\n  <div class="box box-a"></div>\n  <div class="box box-b"></div>\n  <div class="box box-c"></div>\n</div>',
    css:
      '.stage {\n  display: flex;\n  gap: 24px;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background: #101418;\n}\n.box {\n  width: 48px;\n  height: 48px;\n  animation: pulse 1.6s ease-in-out infinite;\n}\n.box-a { background: #35C4DC; border-radius: 4px; }\n.box-b { background: #E8B93E; border-radius: 24px; animation-delay: 0.2s; }\n.box-c { background: #E05A4E; border-radius: 4px; transform: rotate(45deg); animation-delay: 0.4s; }\n@keyframes pulse {\n  0%, 100% { transform: translateY(0) rotate(0deg); }\n  50% { transform: translateY(-24px) rotate(8deg); }\n}',
    js: "console.log('纯 CSS 动画：无需 JavaScript');",
  },
  {
    id: 'empty',
    nameKey: 'pg.template.blank.name',
    descKey: 'pg.template.blank.desc',
    html: '<h1>空白页面</h1>\n<p>从这里开始你的作品</p>',
    css: 'body {\n  font-family: sans-serif;\n  padding: 40px 16px;\n  text-align: center;\n}',
    js: "console.log('开始编写吧');",
  },
];

const DEFAULT_TEMPLATE: FrontendPen = {
  id: 'draft',
  title: '未命名作品',
  html: TEMPLATES[0]!.html,
  css: TEMPLATES[0]!.css,
  js: TEMPLATES[0]!.js,
  autoRun: true,
  layout: 'left',
  showHtml: true,
  showCss: true,
  showJs: true,
  paneWeights: { html: 1, css: 1, js: 1 },
  split: 0.5,
  showConsole: true,
  createdAt: 0,
  updatedAt: 0,
  lastOpenedAt: 0,
};

const STORAGE_WARN_RATIO = 0.85;

function narrowPreferredLayout(): FrontendLayout {
  return typeof window !== 'undefined' && window.innerWidth < 700 ? 'top' : 'left';
}

function formatTime(ts: number, lang: Lang): string {
  if (!ts) return t('pg.unsaved', undefined, lang);
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function syncPenUrl(penId: string | null): void {
  const url = new URL(window.location.href);
  if (penId) {
    url.searchParams.set('pen', penId);
  } else {
    url.searchParams.delete('pen');
  }
  window.history.replaceState(null, '', url.toString());
}

function FrontendLab() {
  const lang = useLang();
  const [pen, setPen] = useState<FrontendPen>(DEFAULT_TEMPLATE);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [library, setLibrary] = useState<FrontendPen[]>([]);
  const [formatting, setFormatting] = useState(false);
  const [toolbarNote, setToolbarNote] = useState('');
  const [storageWarning, setStorageWarning] = useState<{ used: string; quota: string } | null>(null);
  const penBytes = useMemo(() => estimatePenBytes(pen), [pen]);
  const [activePane, setActivePane] = useState<PaneKey>('html');

  const updatePen = useCallback((patch: Partial<FrontendPen>) => {
    setPen((prev) => ({ ...prev, ...patch }));
  }, []);

  const [narrowLayoutChecked, setNarrowLayoutChecked] = useState(false);
  if (!narrowLayoutChecked) {
    setNarrowLayoutChecked(true);
    const preferred = narrowPreferredLayout();
    setPen((prev) =>
      prev.id === 'draft' && prev.createdAt === 0 && prev.layout !== preferred
        ? { ...prev, layout: preferred }
        : prev,
    );
  }

  const {
    split,
    setSplit,
    dragging,
    editorsRef,
    workspaceRef,
    handleSplitStart,
    handleSplitMove,
    handleSplitEnd,
    handlePaneSplitStart,
    handlePaneSplitMove,
    handlePaneSplitEnd,
  } = useSplitPanes({ pen, updatePen });
  const {
    previewDoc,
    runId,
    consoleEntries,
    setConsoleEntries,
    iframeRef,
    handleRun,
    resetPreview,
  } = usePreviewRuntime({ pen });
  // 初始深链/草稿加载完成前禁止自动保存，防止默认模板覆盖已存草稿
  const [bootstrapped, setBootstrapped] = useState(false);
  const { saveState, setSaveState } = usePenPersistence({ pen, split, autosaveEnabled: bootstrapped });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const showcaseId = params.get('showcase');
      const openGallery = params.get('panel') === 'gallery';
      const penId = params.get('pen');

      let target: FrontendPen | null = null;
      const showcase = showcaseId
        ? SHOWCASE_ITEMS.find((s) => s.id === showcaseId)
        : undefined;
      if (showcase) {
        target = {
          ...DEFAULT_TEMPLATE,
          layout: narrowPreferredLayout(),
          title: showcase.name,
          html: showcase.html,
          css: showcase.css,
          js: showcase.js,
          lastOpenedAt: Date.now(),
        };
      } else if (penId) {
        const pens = await loadPens();
        target = pens.find((p) => p.id === penId) ?? null;
        // 深链指向已删除/不存在的作品时清掉失效参数，避免刷新后反复解析失败
        if (!target && !cancelled) syncPenUrl(null);
      }
      if (!target) {
        target = await loadPenDraft();
      }
      if (!cancelled && target) {
        const opened = {
          ...target,
          paneWeights: target.paneWeights ?? { html: 1, css: 1, js: 1 },
          split: target.split ?? 0.5,
          lastOpenedAt: target.lastOpenedAt || Date.now(),
        };
        setPen(opened);
        setSplit(opened.split ?? 0.5);
        resetPreview(opened);
        syncPenUrl(target.id !== 'draft' ? target.id : null);
      }
      if (showcaseId || openGallery) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
      if (!cancelled && openGallery) {
        setShowGallery(true);
      }
      if (!cancelled) setBootstrapped(true);
      const pens = await loadPens();
      if (!cancelled) setLibrary(pens);
      const usage = await getStorageUsage();
      if (!cancelled && usage.quotaBytes > 0 && usage.usageBytes / usage.quotaBytes > STORAGE_WARN_RATIO) {
        setStorageWarning({
          used: formatBytes(usage.usageBytes),
          quota: formatBytes(usage.quotaBytes),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // 挂载引导仅执行一次：深链解析与草稿恢复不依赖响应式值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormat = useCallback(async () => {
    if (formatting) return;
    setFormatting(true);
    setToolbarNote('');
    const targets = [
      { key: 'html' as PaneKey, lang: 'html', value: pen.html },
      { key: 'css' as PaneKey, lang: 'css', value: pen.css },
      { key: 'js' as PaneKey, lang: 'javascript', value: pen.js },
    ];
    const results = await Promise.all(
      targets.map((t) => formatCode(t.lang, t.value)),
    );
    const patch: Partial<FrontendPen> = {};
    const notes: string[] = [];
    results.forEach((result, index) => {
      const target = targets[index]!;
      if (result.code !== target.value) {
        patch[target.key] = result.code;
      }
      if (result.note) notes.push(result.note);
    });
    if (Object.keys(patch).length > 0) {
      updatePen(patch);
    }
    if (notes.length > 0) {
      setToolbarNote(notes.join('；'));
    }
    setFormatting(false);
  }, [formatting, pen.html, pen.css, pen.js, updatePen]);

  const handleSaveAsNew = useCallback(async () => {
    const now = Date.now();
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pen-${now}-${Math.random().toString(36).slice(2, 10)}`;
    const newPen: FrontendPen = {
      ...pen,
      split,
      id: newId,
      title: pen.title.trim() || '未命名作品',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };
    try {
      await savePen(newPen);
    } catch {
      setSaveState('error');
      return;
    }
    setPen(newPen);
    setLibrary(await loadPens());
    setSaveState('saved');
    syncPenUrl(newId);
  }, [pen, split, setSaveState]);

  const handleSave = useCallback(async () => {
    if (pen.id === 'draft') {
      await handleSaveAsNew();
      return;
    }
    const saved: FrontendPen = {
      ...pen,
      split,
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };
    try {
      await savePen(saved);
    } catch {
      setSaveState('error');
      return;
    }
    setPen(saved);
    setLibrary(await loadPens());
    setSaveState('saved');
  }, [pen, split, handleSaveAsNew, setSaveState]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
        return;
      }
      // 用 event.code 识别按键：macOS 上 Option 会把 event.key 变成 'ƒ' 等字符
      if (event.shiftKey && event.altKey && event.code === 'KeyF') {
        event.preventDefault();
        void handleFormat();
        return;
      }
      // Escape 只关最上层弹层，并用 stopImmediatePropagation 拦住画廊等兄弟监听器
      if (event.key === 'Escape') {
        if (showTemplates) {
          event.stopImmediatePropagation();
          setShowTemplates(false);
          return;
        }
        if (showLibrary) {
          event.stopImmediatePropagation();
          setShowLibrary(false);
          return;
        }
        if (showShortcuts) {
          event.stopImmediatePropagation();
          setShowShortcuts(false);
          return;
        }
      }
      if (
        event.key === '?' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isTyping &&
        !showGallery &&
        !showLibrary
      ) {
        event.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleFormat, showShortcuts, showTemplates, showLibrary, showGallery]);

  const handleNewDraft = useCallback(
    (template: PenTemplate) => {
      const isUntouched =
        pen.id === 'draft' &&
        TEMPLATES.some((t) => pen.html === t.html && pen.css === t.css && pen.js === t.js);
      const needsConfirm =
        pen.id !== 'draft'
          ? t('pg.confirmNewSaved', undefined, lang)
          : !isUntouched
            ? t('pg.confirmNewDraft', undefined, lang)
            : '';
      if (needsConfirm && !window.confirm(needsConfirm)) return;
      const next: FrontendPen = {
        ...DEFAULT_TEMPLATE,
        layout: narrowPreferredLayout(),
        html: template.html,
        css: template.css,
        js: template.js,
        lastOpenedAt: Date.now(),
      };
      setPen(next);
      resetPreview(next);
      setActivePane('html');
      setShowTemplates(false);
      syncPenUrl(null);
    },
    [pen, resetPreview, lang],
  );

  const handleLoadShowcase = useCallback(
    (item: ShowcaseItem) => {
      const isUntouched =
        pen.id === 'draft' &&
        TEMPLATES.some((t) => pen.html === t.html && pen.css === t.css && pen.js === t.js);
      const needsConfirm =
        pen.id !== 'draft'
          ? t('pg.confirmLoadSaved', undefined, lang)
          : !isUntouched
            ? t('pg.confirmLoadDraft', undefined, lang)
            : '';
      if (needsConfirm && !window.confirm(needsConfirm)) return;
      const next: FrontendPen = {
        ...DEFAULT_TEMPLATE,
        layout: narrowPreferredLayout(),
        title: item.name,
        html: item.html,
        css: item.css,
        js: item.js,
        lastOpenedAt: Date.now(),
      };
      setPen(next);
      resetPreview(next);
      setActivePane('html');
      setShowGallery(false);
      syncPenUrl(null);
    },
    [pen, resetPreview, lang],
  );

const handleOpenLibrary = useCallback(async () => {
    setLibrary(await loadPens());
    setShowLibrary(true);
  }, []);

  const handleOpenPen = useCallback(async (item: FrontendPen) => {
    const now = Date.now();
    const opened = {
      ...item,
      paneWeights: item.paneWeights ?? { html: 1, css: 1, js: 1 },
      split: item.split ?? 0.5,
      lastOpenedAt: now,
    };
    await savePen(opened);
    setPen(opened);
    setSplit(opened.split ?? 0.5);
    resetPreview(opened);
    setShowLibrary(false);
    syncPenUrl(opened.id);
  }, [resetPreview, setSplit]);

  const handleDeletePen = useCallback(async (item: FrontendPen) => {
    if (!window.confirm(t('pg.deleteConfirm', { title: item.title }, lang))) return;
    await deletePen(item.id);
    setLibrary(await loadPens());
  }, [lang]);

  const togglePane = useCallback(
    (key: PaneKey) => {
      setActivePane(key);
      const visibleKey =
        key === 'html' ? 'showHtml' : key === 'css' ? 'showCss' : 'showJs';
      if (!pen[visibleKey]) {
        updatePen({ [visibleKey]: true } as Partial<FrontendPen>);
      }
    },
    [pen, updatePen],
  );

  const workspaceStyle = useMemo<CSSProperties>(() => {
    const ratio = `${split * 100}%`;
    return pen.layout === 'left'
      ? { gridTemplateColumns: `${ratio} 3px 1fr`, gridTemplateRows: '100%' }
      : { gridTemplateColumns: '100%', gridTemplateRows: `${ratio} 3px 1fr` };
  }, [pen.layout, split]);

  const editors = useMemo(
    () =>
      [
        { key: 'html', label: 'HTML', visible: pen.showHtml },
        { key: 'css', label: 'CSS', visible: pen.showCss },
        { key: 'js', label: 'JS', visible: pen.showJs },
      ] as const,
    [pen.showHtml, pen.showCss, pen.showJs],
  );
  const visibleEditors = editors.filter((editor) => editor.visible);
  const effectivePane = visibleEditors.some((editor) => editor.key === activePane)
    ? activePane
    : (visibleEditors[0]?.key ?? null);

  return (
    <div className={`pg-frontend ${dragging ? 'pg-dragging' : ''}`}>
      {/* 顶部工具栏：品牌区 / 面板开关 / 视图操作 / 作品操作 / 运行 */}
      <header className="pg-toolbar">
        <div className="pg-toolbar-row">
          <a className="pg-back" href={`${import.meta.env.BASE_URL}`} aria-label={t('pg.backHomeAria', undefined, lang)}>
            <PgIcon name="arrow-left" size={15} />
            <span>{t('pg.backHome', undefined, lang)}</span>
          </a>
          <input
            className="pg-title-input"
            value={pen.title}
            placeholder={t('pg.titlePlaceholder', undefined, lang)}
            onChange={(e) => updatePen({ title: e.target.value })}
            aria-label={t('pg.titleAria', undefined, lang)}
          />
          <span className={`pg-save-state pg-save-state--${saveState}`}>
            {saveState === 'saved'
              ? t('pg.saveState.saved', undefined, lang)
              : saveState === 'error'
                ? t('pg.saveState.error', undefined, lang)
                : t('pg.saveState.saving', undefined, lang)}
          </span>
        </div>
        <div className="pg-toolbar-row pg-toolbar-row--actions">
          {/* 编辑器开关组：桌面为显隐开关，窄屏为标签页 */}
          <div className="pg-toolbar-group pg-toolbar-group--editors" role="group" aria-label={t('pg.editorsAria', undefined, lang)}>
            {editors.map((editor) => (
              <button
                key={editor.key}
                type="button"
                className={`pg-btn pg-btn--editors${editor.visible ? ' is-on' : ''}${effectivePane === editor.key ? ' is-active' : ''}`}
                onClick={() => togglePane(editor.key)}
                aria-pressed={editor.visible}
                title={t('pg.switchEditor', { lang: editor.label }, lang)}
              >
                {editor.label}
              </button>
            ))}
          </div>
          <div className="pg-toolbar-group">
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => void handleFormat()}
              disabled={formatting}
              title={t('pg.formatTitle', undefined, lang)}
            >
              <PgIcon name="spark" size={14} />
              <span>{t('pg.format', undefined, lang)}</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ autoRun: !pen.autoRun })}
              aria-pressed={pen.autoRun}
              title={t('pg.autoTitle', undefined, lang)}
            >
              <PgIcon name="refresh" size={14} />
              <span>{t('pg.auto', undefined, lang)}</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ layout: pen.layout === 'left' ? 'top' : 'left' })}
              title={t('pg.layoutTitle', undefined, lang)}
            >
              <PgIcon name={pen.layout === 'left' ? 'layout-left' : 'layout-top'} size={14} />
              <span>{pen.layout === 'left' ? t('pg.layoutLeft', undefined, lang) : t('pg.layoutTop', undefined, lang)}</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ showConsole: !pen.showConsole })}
              aria-pressed={pen.showConsole}
              title={t('pg.consoleTitle', undefined, lang)}
            >
              <PgIcon name="terminal" size={14} />
              <span>{t('pg.console', undefined, lang)}</span>
              {consoleEntries.filter((entry) => entry.kind === 'error').length > 0 && (
                <em className="pg-count pg-count--danger">
                  {consoleEntries.filter((entry) => entry.kind === 'error').length}
                </em>
              )}
            </button>
          </div>
          <div className="pg-toolbar-group">
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => setShowGallery(true)}
              title={t('pg.galleryTitle', undefined, lang)}
            >
              <PgIcon name="gallery" size={14} />
              <span>{t('pg.gallery', undefined, lang)}</span>
            </button>
            <div className="pg-new-wrap">
              <button
                type="button"
                className="pg-btn pg-btn--ghost"
                onClick={() => setShowTemplates((v) => !v)}
                aria-expanded={showTemplates}
                title={t('pg.newTitle', undefined, lang)}
              >
                <PgIcon name="plus" size={14} />
                <span>{t('pg.new', undefined, lang)}</span>
              </button>
              {showTemplates && (
                <div className="pg-menu" role="menu" aria-label={t('pg.templateMenuAria', undefined, lang)}>
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="pg-menu-item"
                      role="menuitem"
                      onClick={() => handleNewDraft(template)}
                    >
                      <span className="pg-menu-name">{t(template.nameKey, undefined, lang)}</span>
                      <span className="pg-menu-desc">{t(template.descKey, undefined, lang)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="pg-btn pg-btn--ghost" onClick={() => void handleSave()} title={t('pg.saveTitle', undefined, lang)}>
              <PgIcon name="copy" size={14} />
              <span>{t('pg.save', undefined, lang)}</span>
            </button>
            <button type="button" className="pg-btn pg-btn--ghost pg-btn--library" onClick={() => void handleOpenLibrary()} title={t('pg.libraryTitle', undefined, lang)}>
              <PgIcon name="folder" size={14} />
              <span>{t('pg.library', undefined, lang)}</span>
              {library.length > 0 && <em className="pg-count">{library.length}</em>}
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => setShowShortcuts((v) => !v)}
              aria-expanded={showShortcuts}
              title={t('pg.keysTitle', undefined, lang)}
            >
              <PgIcon name="keyboard" size={14} />
              <span>{t('pg.keys', undefined, lang)}</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--primary"
              onClick={handleRun}
              title={t('pg.runTitle', undefined, lang)}
            >
              <PgIcon name="play" size={14} />
              <span>{t('pg.run', undefined, lang)}</span>
            </button>
          </div>
          {toolbarNote && <span className="pg-toolbar-note">{toolbarNote}</span>}
        </div>
      </header>

      {/* 存储用量预警 */}
      {storageWarning && (
        <div className="pg-warning-bar">
          <PgIcon name="alert" size={14} />
          <span>{t('pg.storageWarn', { used: storageWarning.used, quota: storageWarning.quota }, lang)}</span>
        </div>
      )}

      {/* 主工作区 */}
      <div className="pg-workspace" style={workspaceStyle} ref={workspaceRef}>
        {/* 编辑器区域 */}
        <section
          className={`pg-editors pg-editors--${pen.layout}`}
          aria-label={t('pg.editorsAria2', undefined, lang)}
          ref={editorsRef}
        >
          {visibleEditors.map((editor, index) => {
            const value = editor.key === 'html' ? pen.html : editor.key === 'css' ? pen.css : pen.js;
            const language = editor.key === 'html' ? 'html' : editor.key === 'css' ? 'css' : 'javascript';
            const isActive = effectivePane === editor.key;
            return (
              <Fragment key={editor.key}>
                {index > 0 && (
                  <div
                    className={`pg-pane-splitter pg-pane-splitter--${pen.layout}`}
                    onPointerDown={(e) =>
                      handlePaneSplitStart(e, visibleEditors[index - 1]!.key, editor.key)
                    }
                    onPointerMove={handlePaneSplitMove}
                    onPointerUp={handlePaneSplitEnd}
                    onPointerCancel={handlePaneSplitEnd}
                    role="separator"
                    aria-orientation={pen.layout === 'left' ? 'horizontal' : 'vertical'}
                    aria-label={t('pg.resizeEditors', { a: visibleEditors[index - 1]!.label, b: editor.label }, lang)}
                  />
                )}
                <div
                  className={`pg-pane${isActive ? ' is-active' : ''}`}
                  style={{
                    flexGrow: pen.paneWeights[editor.key],
                    flexBasis: 0,
                  }}
                >
                  <div className="pg-pane-head">
                    <span className="pg-pane-title">{editor.label}</span>
                    <button
                      type="button"
                      className="pg-pane-toggle"
                      onClick={() =>
                        updatePen(
                          editor.key === 'html'
                            ? { showHtml: false }
                            : editor.key === 'css'
                              ? { showCss: false }
                              : { showJs: false },
                        )
                      }
                      title={t('pg.collapseEditor', { lang: editor.label }, lang)}
                    >
                      <PgIcon name="close" size={12} />
                    </button>
                  </div>
                  <div className="pg-pane-body">
                    <CodeMirrorBoxLoader
                      value={value}
                      language={language as 'html' | 'css' | 'javascript'}
                      onChange={(next: string) =>
                        updatePen(editor.key === 'html' ? { html: next } : editor.key === 'css' ? { css: next } : { js: next })
                      }
                      ariaLabel={t('pg.editorAria', { lang: editor.label }, lang)}
                    />
                  </div>
                </div>
              </Fragment>
            );
          })}
          {!pen.showHtml && !pen.showCss && !pen.showJs && (
            <div className="pg-pane-empty">{t('pg.paneEmpty', undefined, lang)}</div>
          )}
        </section>

        {/* 分隔条 */}
        <div
          className={`pg-splitter pg-splitter--${pen.layout}`}
          onPointerDown={handleSplitStart}
          onPointerMove={handleSplitMove}
          onPointerUp={handleSplitEnd}
          onPointerCancel={handleSplitEnd}
          role="separator"
          aria-orientation={pen.layout === 'left' ? 'vertical' : 'horizontal'}
          aria-label={t('pg.resizeMain', undefined, lang)}
        />

        {/* 预览区域 */}
        <section className="pg-preview">
          <div className="pg-preview-head">
            <span className="pg-preview-title">
              <PgIcon name="spark" size={13} />
              {t('pg.livePreview', undefined, lang)}
            </span>
            <div className="pg-preview-actions">
              <span className="pg-preview-size">{formatBytes(penBytes)}</span>
              <button
                type="button"
                className="pg-btn pg-btn--ghost pg-btn--sm"
                onClick={handleRun}
                title={t('pg.rerunTitle', undefined, lang)}
              >
                <PgIcon name="refresh" size={12} />
              </button>
            </div>
          </div>
          <iframe
            ref={iframeRef}
            key={runId}
            className="pg-frame"
            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-pointer-lock"
            srcDoc={previewDoc}
            title={t('pg.previewTitle', undefined, lang)}
          />
          {pen.showConsole && (
            <div className="pg-console">
              <div className="pg-console-head">
                <span className="pg-console-title">{t('pg.console', undefined, lang)}</span>
                <div className="pg-console-actions">
                  {consoleEntries.length > 0 && (
                    <button
                      type="button"
                      className="pg-btn pg-btn--ghost pg-btn--sm"
                      onClick={() => setConsoleEntries([])}
                    >
                      {t('pg.consoleClear', undefined, lang)}
                    </button>
                  )}
                  <button
                    type="button"
                    className="pg-btn pg-btn--ghost pg-btn--sm"
                    onClick={() => updatePen({ showConsole: false })}
                    title={t('pg.consoleCollapse', undefined, lang)}
                  >
                    <PgIcon name="close" size={12} />
                  </button>
                </div>
              </div>
              <div className="pg-console-body">
                {consoleEntries.length === 0 ? (
                  <div className="pg-console-empty">{t('pg.consoleEmpty', undefined, lang)}</div>
                ) : (
                  consoleEntries.map((entry) => (
                    <div className={`pg-console-line pg-console-line--${entry.kind}`} key={entry.id}>
                      <pre className="pg-console-text">{entry.text}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 新建模板菜单的点击关闭层 */}
      {showTemplates && <div className="pg-menu-mask" onClick={() => setShowTemplates(false)} />}

      {/* 快捷键说明面板：轻量居中弹层（Esc / 点击遮罩关闭） */}
      {showShortcuts && (
        <div className="pg-keys-mask" onClick={() => setShowShortcuts(false)}>
          <div
            className="pg-keys"
            role="dialog"
            aria-modal="true"
            aria-label={t('pg.keysPanelAria', undefined, lang)}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="pg-keys__head">
              <span className="pg-keys__title">
                <PgIcon name="keyboard" size={14} />
                {t('pg.keysPanelTitle', undefined, lang)}
              </span>
              <button
                type="button"
                className="pg-btn pg-btn--ghost pg-btn--sm"
                onClick={() => setShowShortcuts(false)}
                title={t('pg.closeAria', undefined, lang)}
              >
                <PgIcon name="close" size={14} />
              </button>
            </header>
            <div className="pg-keys__body">
              <div className="pg-keys__row">
                <span className="pg-keys__desc">{t('pg.keysRun', undefined, lang)}</span>
                <span className="pg-keys__combo">
                  <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>Enter</kbd>
                </span>
              </div>
              <div className="pg-keys__row">
                <span className="pg-keys__desc">{t('pg.keysFormat', undefined, lang)}</span>
                <span className="pg-keys__combo">
                  <kbd>Shift</kbd> + <kbd>Alt</kbd> + <kbd>F</kbd>
                </span>
              </div>
              <div className="pg-keys__row">
                <span className="pg-keys__desc">{t('pg.keysSave', undefined, lang)}</span>
                <span className="pg-keys__combo">
                  <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd>
                </span>
              </div>
              <div className="pg-keys__row">
                <span className="pg-keys__desc">{t('pg.keysPanel', undefined, lang)}</span>
                <span className="pg-keys__combo">
                  <kbd>?</kbd>
                </span>
              </div>
              <div className="pg-keys__row">
                <span className="pg-keys__desc">{t('pg.keysClose', undefined, lang)}</span>
                <span className="pg-keys__combo">
                  <kbd>Esc</kbd>
                </span>
              </div>
            </div>
            <p className="pg-keys__note">{t('pg.keysNote', undefined, lang)}</p>
          </div>
        </div>
      )}

      {/* 灵感画廊：设计成品实时预览与源码载入 */}
      <ShowcaseGallery
        open={showGallery}
        onClose={() => setShowGallery(false)}
        onLoad={handleLoadShowcase}
      />

      {/* 本地作品库面板 */}
      {showLibrary && (
        <div className="pg-drawer-mask" onClick={() => setShowLibrary(false)}>
          <aside className="pg-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="pg-drawer-head">
              <span className="pg-drawer-title">
                <PgIcon name="folder" size={15} />
                {t('pg.libraryTitle2', undefined, lang)}
              </span>
              <button type="button" className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => setShowLibrary(false)}>
                <PgIcon name="close" size={14} />
              </button>
            </div>
            <div className="pg-drawer-body">
              {library.length === 0 ? (
                <div className="pg-drawer-empty">
                  {t('pg.libraryEmpty', undefined, lang)}
                </div>
              ) : (
                library.map((item) => (
                  <div className={`pg-lib-item ${item.id === pen.id ? 'pg-lib-item--active' : ''}`} key={item.id}>
                    <div className="pg-lib-info">
                      <span className="pg-lib-title">{item.title || t('pg.untitled', undefined, lang)}</span>
                      <span className="pg-lib-meta">
                        {formatTime(item.updatedAt, lang)} · {formatBytes(estimatePenBytes(item))}
                      </span>
                    </div>
                    <div className="pg-lib-actions">
                      <button type="button" className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => void handleOpenPen(item)}>
                        {t('pg.open', undefined, lang)}
                      </button>
                      <button
                        type="button"
                        className="pg-btn pg-btn--ghost pg-btn--sm pg-btn--danger"
                        onClick={() => handleDeletePen(item)}
                      >
                        {t('pg.delete', undefined, lang)}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default FrontendLab;
