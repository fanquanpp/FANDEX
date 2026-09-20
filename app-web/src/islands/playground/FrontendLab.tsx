/**
 * 前端实验沙箱（CodePen 风格编辑器）
 *
 * 功能概述：
 *   - 三栏编辑器（HTML/CSS/JS）+ 实时预览 iframe + 控制台面板
 *   - 支持顶部/左右两种布局、面板显隐切换、拖拽调整预览区比例
 *   - 编辑内容自动保存到浏览器 IndexedDB，刷新不丢失
 *   - 本地作品库：另存为新作品、打开历史作品、删除作品
 *   - 模板库：新建时可选空白页 / 交互示例 / CSS 动画三个起步模板
 *   - 灵感画廊：内置 25 个前端设计成品（加载动画/按钮/卡片/文本/背景/
 *     组件六类），实时预览效果并一键把源码载入编辑器
 *   - 快捷键：Ctrl/Cmd + Enter 运行预览
 *   - URL 同步：打开/另存作品后同步 ?pen= 参数，刷新不丢上下文
 *   - 窄屏（≤768px）下面板开关自动变为标签页行为，单屏聚焦当前编辑器
 *
 * 安全与性能：
 *   - 预览 iframe 使用 sandbox 隔离，用户代码运行在独立不透明源
 *   - 自动运行采用防抖（600ms），避免每次按键都重建 iframe
 *   - 控制台日志上限 200 条，防止长期运行撑爆内存
 *   - 所有数据仅存本地，不提供分享/上传/导出功能
 *
 * UI 双语：界面文案经 lib/i18n 的 t() 取当前语言（useLang 订阅全局切换）；
 * 模板初始代码与作品内容（用户数据）不参与翻译。
 */

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

/** 起步模板结构（新建时可选；name/desc 走 i18n 字典键） */
interface PenTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称字典键 */
  nameKey: string;
  /** 模板一句话说明字典键 */
  descKey: string;
  /** HTML 初始代码 */
  html: string;
  /** CSS 初始代码 */
  css: string;
  /** JS 初始代码 */
  js: string;
}

/** 空白模板内容（与旧版默认草稿一致的最小结构） */
const BLANK_HTML = '<h1>你好，FANDEX</h1>\n<button id="demo">点我</button>\n<p id="tip">打开控制台查看输出</p>';
const BLANK_CSS =
  'body {\n  font-family: var(--font-family-body, sans-serif);\n  text-align: center;\n  padding: 40px 16px;\n}\nbutton {\n  padding: 8px 20px;\n  border-radius: 8px;\n  border: 1px solid #0B6E7E;\n  background: #E6FBFC;\n  color: #0B6E7E;\n  cursor: pointer;\n}';
const BLANK_JS =
  "const tip = document.getElementById('tip');\nconst btn = document.getElementById('demo');\nbtn.addEventListener('click', () => {\n  tip.textContent = '点击次数 +1';\n  console.log('按钮被点击');\n});\nconsole.log('预览已就绪');";

/** 起步模板列表（新建菜单展示顺序；名称/说明见字典 pg.template.*） */
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

/** 默认草稿：取第一个模板（交互示例） */
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

/** 存储用量预警阈值（占比） */
const STORAGE_WARN_RATIO = 0.85;

/**
 * 视口窄于 700px 时新作品默认上下堆叠：
 * 左右分栏在窄屏下编辑器与预览各占约一半宽度，两者都不可用。
 * 仅影响新建草稿的初始值；已保存作品保持用户上次的布局选择。
 */
function narrowPreferredLayout(): FrontendLayout {
  return typeof window !== 'undefined' && window.innerWidth < 700 ? 'top' : 'left';
}

/** 编辑器面板 key（从分栏 Hook 再导出，模板/工具栏共用） */

/**
 * 格式化时间戳为本地时间字符串
 * @param ts - 时间戳（毫秒）；0 表示未保存（文案走 i18n 字典）
 */
function formatTime(ts: number, lang: Lang): string {
  if (!ts) return t('pg.unsaved', undefined, lang);
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化字节数为可读文本
 * @param bytes - 字节数
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * 同步地址栏 ?pen= 参数（replaceState，不产生历史记录）
 * @param penId - 作品 ID；传 null 时移除参数回到草稿态
 */
function syncPenUrl(penId: string | null): void {
  const url = new URL(window.location.href);
  if (penId) {
    url.searchParams.set('pen', penId);
  } else {
    url.searchParams.delete('pen');
  }
  window.history.replaceState(null, '', url.toString());
}

/** 前端实验沙箱主组件 */
function FrontendLab() {
  /** 界面语言（工作台全部 UI 文案双语，订阅全局切换） */
  const lang = useLang();
  /** 当前编辑中的作品 */
  const [pen, setPen] = useState<FrontendPen>(DEFAULT_TEMPLATE);
  /** 是否打开作品库面板 */
  const [showLibrary, setShowLibrary] = useState(false);
  /** 是否打开新建模板菜单 */
  const [showTemplates, setShowTemplates] = useState(false);
  /** 是否打开灵感画廊 */
  const [showGallery, setShowGallery] = useState(false);
  /** 是否打开快捷键说明面板 */
  const [showShortcuts, setShowShortcuts] = useState(false);
  /** 作品库列表 */
  const [library, setLibrary] = useState<FrontendPen[]>([]);
  /** 是否正在格式化代码 */
  const [formatting, setFormatting] = useState(false);
  /** 工具栏提示（格式化结果等） */
  const [toolbarNote, setToolbarNote] = useState('');
  /** 存储用量提示（存数值，文案渲染期按当前语言取字典） */
  const [storageWarning, setStorageWarning] = useState<{ used: string; quota: string } | null>(null);
  /** 当前作品字节数（用于本地占用提示）：纯派生值，随 pen 渲染期计算 */
  const penBytes = useMemo(() => estimatePenBytes(pen), [pen]);
  /** 窄屏标签页：当前聚焦的编辑器面板 */
  const [activePane, setActivePane] = useState<PaneKey>('html');

  /**
   * 更新作品内容的通用入口
   * 字节估算由持久化/预览 Hook 外的渲染期派生，无需在此处重复计算
   */
  const updatePen = useCallback((patch: Partial<FrontendPen>) => {
    setPen((prev) => ({ ...prev, ...patch }));
  }, []);

  // 窄屏首建草稿默认上下堆叠：DEFAULT_TEMPLATE 是模块常量（构建期 SSR 求值，
  // 不能读视口），故在客户端首渲染期做一次守卫式校正——仅未落盘的初始草稿
  // （id=draft 且 createdAt=0）触发，已保存作品保持用户上次的布局选择
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

  // 布局域：编辑器/预览分栏与三栏权重拖拽（split 供持久化与网格模板消费）
  const {
    split,
    setSplit,
    dragging,
    editorsRef,
    handleSplitStart,
    handleSplitMove,
    handleSplitEnd,
    handlePaneSplitStart,
    handlePaneSplitMove,
    handlePaneSplitEnd,
  } = useSplitPanes({ pen, updatePen });
  // 预览域：srcdoc 构建、自动/手动运行、快捷键与控制台消息
  const {
    previewDoc,
    runId,
    consoleEntries,
    setConsoleEntries,
    iframeRef,
    handleRun,
    resetPreview,
  } = usePreviewRuntime({ pen });
  // 持久化域：防抖自动保存与页面隐藏兜底落盘
  const { saveState, setSaveState } = usePenPersistence({ pen, split });

  /**
   * 挂载时读取本地草稿与存储用量
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 深链优先级：?showcase= 载入图鉴成品 > ?pen= 打开指定作品 > 恢复草稿；
      // ?panel=gallery 打开时直接展开灵感画廊面板
      const params = new URLSearchParams(window.location.search);
      const showcaseId = params.get('showcase');
      const openGallery = params.get('panel') === 'gallery';
      const penId = params.get('pen');

      let target: FrontendPen | null = null;
      const showcase = showcaseId
        ? SHOWCASE_ITEMS.find((s) => s.id === showcaseId)
        : undefined;
      if (showcase) {
        // 图鉴深链：用户从功能主页/图鉴主动点击而来，直接载入无需覆盖确认
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
      }
      if (!target) {
        target = await loadPenDraft();
      }
      if (!cancelled && target) {
        // 兼容历史作品：缺失 paneWeights/split 时回退默认值
        const opened = {
          ...target,
          paneWeights: target.paneWeights ?? { html: 1, css: 1, js: 1 },
          split: target.split ?? 0.5,
          lastOpenedAt: target.lastOpenedAt || Date.now(),
        };
        setPen(opened);
        setSplit(opened.split ?? 0.5);
        resetPreview(opened);
        // 地址栏与实际打开的作品保持一致（草稿态移除参数）
        syncPenUrl(target.id !== 'draft' ? target.id : null);
      }
      // 深链参数一次性消费：应用后清除地址参数，刷新不再重复覆盖草稿
      if (showcaseId || openGallery) {
        window.history.replaceState(null, '', window.location.pathname + window.location.hash);
      }
      if (!cancelled && openGallery) {
        setShowGallery(true);
      }
      setLibrary(await loadPens());
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

  /**
   * 格式化三个编辑器（HTML/CSS/JS 使用各自语言解析器）
   * 仅更新发生变化的编辑器，避免无意义重绘
   */
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

  /**
   * 将当前作品另存为新作品（复制到作品库），并同步地址栏参数
   */
  const handleSaveAsNew = useCallback(async () => {
    const now = Date.now();
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `pen-${now}-${Math.random().toString(36).slice(2, 10)}`;
    const newPen: FrontendPen = {
      ...pen,
      id: newId,
      title: pen.title.trim() || '未命名作品',
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
    };    await savePen(newPen);
    setPen(newPen);
    setLibrary(await loadPens());
    setSaveState('saved');
    syncPenUrl(newId);
  }, [pen, setSaveState]);

  /**
   * 智能保存（Ctrl/Cmd+S）：草稿另存为新作品；已保存作品原地更新，
   * 避免连续保存产生重复副本（CodePen 的 Save / Fork 双语义）
   */
  const handleSave = useCallback(async () => {
    if (pen.id === 'draft') {
      await handleSaveAsNew();
      return;
    }
    const saved: FrontendPen = { ...pen, updatedAt: Date.now(), lastOpenedAt: Date.now() };
    await savePen(saved);
    setPen(saved);
    setLibrary(await loadPens());
    setSaveState('saved');
  }, [pen, handleSaveAsNew, setSaveState]);

  // 全局快捷键：Ctrl/Cmd+S 保存、Shift+Alt+F 格式化、? 打开快捷键说明。
  // 输入类元素聚焦时仅放行 Ctrl/Cmd+S 与 Shift+Alt+F（组合键不干扰打字）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
        return;
      }
      if (event.shiftKey && event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void handleFormat();
        return;
      }
      if (event.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
        return;
      }
      if (event.key === '?' && !event.ctrlKey && !event.metaKey && !event.altKey && !isTyping) {
        event.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleFormat, showShortcuts]);

  /**
   * 按模板新建草稿（会覆盖当前未另存的编辑内容，需用户确认）
   * @param template - 目标模板；缺省时使用交互示例模板
   */
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

  /**
   * 把灵感画廊成品载入编辑器（覆盖当前草稿，需用户确认）
   * 确认策略与新建草稿一致：草稿有改动时提醒覆盖；作品态只提示切换且不影响已保存内容
   * @param item - 目标成品
   */
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

  /**
   * 打开作品库面板并刷新列表
   */  const handleOpenLibrary = useCallback(async () => {
    setLibrary(await loadPens());
    setShowLibrary(true);
  }, []);

  /**
   * 打开作品库中的某条作品，并同步地址栏参数
   */
  const handleOpenPen = useCallback(async (item: FrontendPen) => {
    const now = Date.now();
    // 兼容历史作品：缺失 paneWeights/split 时回退默认值
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

  /**
   * 删除作品库中的一条作品（用户主动操作，带确认）
   */
  const handleDeletePen = useCallback(async (item: FrontendPen) => {
    if (!window.confirm(t('pg.deleteConfirm', { title: item.title }, lang))) return;
    await deletePen(item.id);
    setLibrary(await loadPens());
  }, [lang]);

  /**
   * 切换编辑器面板可见性；窄屏下同时把该面板设为标签页焦点
   * @param key - 面板 key
   */
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

  /** 编辑器区域网格模板（按布局方向生成） */
  const workspaceStyle = useMemo<CSSProperties>(() => {
    const ratio = `${split * 100}%`;
    return pen.layout === 'left'
      ? { gridTemplateColumns: `${ratio} 3px 1fr`, gridTemplateRows: '100%' }
      : { gridTemplateColumns: '100%', gridTemplateRows: `${ratio} 3px 1fr` };
  }, [pen.layout, split]);

  /** 当前打开的编辑器语言映射 */
  const editors = useMemo(
    () =>
      [
        { key: 'html', label: 'HTML', visible: pen.showHtml },
        { key: 'css', label: 'CSS', visible: pen.showCss },
        { key: 'js', label: 'JS', visible: pen.showJs },
      ] as const,
    [pen.showHtml, pen.showCss, pen.showJs],
  );
  /** 可见编辑器列表（用于在相邻面板间插入分隔条） */
  const visibleEditors = editors.filter((editor) => editor.visible);
  /** 窄屏标签页实际生效的面板：活动面板被收起时回退到首个可见面板 */
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
      <div className="pg-workspace" style={workspaceStyle}>
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
                  consoleEntries.map((entry, index) => (
                    <div className={`pg-console-line pg-console-line--${entry.kind}`} key={`${entry.time}-${index}`}>
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
