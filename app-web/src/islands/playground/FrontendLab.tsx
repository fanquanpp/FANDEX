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
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import CodeMirrorBox from './CodeMirrorBox';
import { PgIcon } from './pg-icons';
import { formatCode } from './pg-formatter';
import { buildPreviewDoc, estimatePenBytes, parsePreviewMessage } from './pg-frontend-runtime';
import ShowcaseGallery from './ShowcaseGallery';
import { SHOWCASE_ITEMS, type ShowcaseItem } from './pg-showcase';
import {
  deletePen,
  getStorageUsage,
  loadPenDraft,
  loadPens,
  savePen,
  savePenDraft,
} from './pg-storage';
import type { ConsoleEntry, FrontendPen } from './types';

/** 起步模板结构（新建时可选） */
interface PenTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板一句话说明 */
  desc: string;
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
  'body {\n  font-family: var(--font-body, sans-serif);\n  text-align: center;\n  padding: 40px 16px;\n}\nbutton {\n  padding: 8px 20px;\n  border-radius: 8px;\n  border: 1px solid #0B6E7E;\n  background: #E6FBFC;\n  color: #0B6E7E;\n  cursor: pointer;\n}';
const BLANK_JS =
  "const tip = document.getElementById('tip');\nconst btn = document.getElementById('demo');\nbtn.addEventListener('click', () => {\n  tip.textContent = '点击次数 +1';\n  console.log('按钮被点击');\n});\nconsole.log('预览已就绪');";

/** 起步模板列表（新建菜单展示顺序） */
const TEMPLATES: readonly PenTemplate[] = [
  { id: 'blank', name: '交互示例', desc: '按钮点击 + 控制台输出', html: BLANK_HTML, css: BLANK_CSS, js: BLANK_JS },
  {
    id: 'animation',
    name: 'CSS 动画',
    desc: '几何图形循环动画',
    html: '<div class="stage">\n  <div class="box box-a"></div>\n  <div class="box box-b"></div>\n  <div class="box box-c"></div>\n</div>',
    css:
      '.stage {\n  display: flex;\n  gap: 24px;\n  justify-content: center;\n  align-items: center;\n  height: 100vh;\n  background: #101418;\n}\n.box {\n  width: 48px;\n  height: 48px;\n  animation: pulse 1.6s ease-in-out infinite;\n}\n.box-a { background: #35C4DC; border-radius: 4px; }\n.box-b { background: #E8B93E; border-radius: 24px; animation-delay: 0.2s; }\n.box-c { background: #E05A4E; border-radius: 4px; transform: rotate(45deg); animation-delay: 0.4s; }\n@keyframes pulse {\n  0%, 100% { transform: translateY(0) rotate(0deg); }\n  50% { transform: translateY(-24px) rotate(8deg); }\n}',
    js: "console.log('纯 CSS 动画：无需 JavaScript');",
  },
  {
    id: 'empty',
    name: '空白页面',
    desc: '从零开始自由编写',
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

/** 编辑器区域占预览区的比例范围 */
const SPLIT_MIN = 0.2;
const SPLIT_MAX = 0.8;
/** 自动保存防抖时长（毫秒） */
const AUTOSAVE_MS = 800;
/** 自动运行防抖时长（毫秒） */
const AUTORUN_MS = 600;
/** 控制台日志条数上限 */
const CONSOLE_LIMIT = 200;
/** 存储用量预警阈值（占比） */
const STORAGE_WARN_RATIO = 0.85;

/** 保存状态文案 */
type SaveState = 'saved' | 'saving';
/** 编辑器面板 key（与作品字段一一对应） */
type PaneKey = 'html' | 'css' | 'js';
/** 拖拽调整面板权重时的最小/最大占比 */
const PANE_RATIO_MIN = 0.15;
const PANE_RATIO_MAX = 0.85;

/**
 * 格式化时间戳为本地时间字符串
 * @param ts - 时间戳（毫秒）
 */
function formatTime(ts: number): string {
  if (!ts) return '未保存';
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
  /** 当前编辑中的作品 */
  const [pen, setPen] = useState<FrontendPen>(DEFAULT_TEMPLATE);
  /** 自动保存状态 */
  const [saveState, setSaveState] = useState<SaveState>('saved');
  /** 预览文档（srcdoc 内容） */
  const [previewDoc, setPreviewDoc] = useState<string>(() => buildPreviewDoc(DEFAULT_TEMPLATE));
  /** 手动运行计数（作为 iframe key 强制刷新） */
  const [runId, setRunId] = useState(0);
  /** 控制台日志 */
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  /** 是否打开作品库面板 */
  const [showLibrary, setShowLibrary] = useState(false);
  /** 是否打开新建模板菜单 */
  const [showTemplates, setShowTemplates] = useState(false);
  /** 是否打开灵感画廊 */
  const [showGallery, setShowGallery] = useState(false);
  /** 作品库列表 */
  const [library, setLibrary] = useState<FrontendPen[]>([]);
  /** 编辑器区域占比（0-1） */
  const [split, setSplit] = useState(0.5);
  /** 是否正在拖拽分隔条 */
  const [dragging, setDragging] = useState(false);
  /** 是否正在格式化代码 */
  const [formatting, setFormatting] = useState(false);
  /** 工具栏提示（格式化结果等） */
  const [toolbarNote, setToolbarNote] = useState('');
  /** 存储用量提示 */
  const [storageWarning, setStorageWarning] = useState<string>('');
  /** 当前作品字节数（用于本地占用提示） */
  const [penBytes, setPenBytes] = useState(0);
  /** 窄屏标签页：当前聚焦的编辑器面板 */
  const [activePane, setActivePane] = useState<PaneKey>('html');
  /** iframe 引用（用于控制台消息来源校验） */
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  /** 拖拽起始信息 */
  const dragRef = useRef<{ start: number; value: number } | null>(null);
  /** 面板权重拖拽起始信息 */
  const paneDragRef = useRef<{ a: PaneKey; b: PaneKey; start: number; wa: number; wb: number } | null>(null);
  /** 编辑器区域容器引用（用于计算拖拽比例） */
  const editorsRef = useRef<HTMLElement | null>(null);

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
        setPreviewDoc(buildPreviewDoc(opened));
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
        setStorageWarning(
          `本地存储已使用 ${formatBytes(usage.usageBytes)} / ${formatBytes(usage.quotaBytes)}，建议整理作品库`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 同步当前作品字节估算（用于本地占用提示）
   */
  useEffect(() => {
    setPenBytes(estimatePenBytes(pen));
  }, [pen]);

  /**
   * 自动保存（防抖）：草稿与作品库记录都实时落盘
   */
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSaveState('saving');
      const now = Date.now();
      const payload: FrontendPen = {
        ...pen,
        split,
        updatedAt: now,
        lastOpenedAt: pen.lastOpenedAt || now,
      };
      if (pen.id === 'draft') {
        await savePenDraft(payload);
      } else {
        await savePen(payload);
      }
      setSaveState('saved');
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [pen, split]);

  /**
   * 自动运行（防抖）：内容变化后延迟重建预览
   */
  useEffect(() => {
    if (!pen.autoRun) return;
    const timer = setTimeout(() => {
      setPreviewDoc(buildPreviewDoc(pen));
      setRunId((n) => n + 1);
    }, AUTORUN_MS);
    return () => clearTimeout(timer);
  }, [pen.html, pen.css, pen.js, pen.autoRun]);

  /**
   * 全局快捷键：Ctrl/Cmd + Enter 运行预览
   */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setPreviewDoc(buildPreviewDoc(pen));
        setRunId((n) => n + 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pen]);

  /**
   * 监听预览 iframe 回传的控制台消息
   */
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const entry = parsePreviewMessage(e, iframeRef.current?.contentWindow ?? null);
      if (!entry) return;
      setConsoleEntries((prev) => [...prev.slice(-(CONSOLE_LIMIT - 1)), entry]);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  /**
   * 更新作品内容的通用入口
   * 字节估算由上方独立 effect 随 pen 变化同步，无需在此处重复计算
   */
  const updatePen = useCallback((patch: Partial<FrontendPen>) => {
    setPen((prev) => ({ ...prev, ...patch }));
  }, []);

  /**
   * 手动运行：立即重建预览并强制刷新 iframe
   */
  const handleRun = useCallback(() => {
    setPreviewDoc(buildPreviewDoc(pen));
    setRunId((n) => n + 1);
  }, [pen]);

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
    };
    await savePen(newPen);
    setPen(newPen);
    setLibrary(await loadPens());
    setSaveState('saved');
    syncPenUrl(newId);
  }, [pen]);

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
          ? '当前正在编辑作品库中的作品，新建草稿不会影响已保存的作品，是否继续？'
          : !isUntouched
            ? '当前草稿尚未另存为作品，新建会覆盖草稿内容，是否继续？'
            : '';
      if (needsConfirm && !window.confirm(needsConfirm)) return;
      const next: FrontendPen = {
        ...DEFAULT_TEMPLATE,
        html: template.html,
        css: template.css,
        js: template.js,
        lastOpenedAt: Date.now(),
      };
      setPen(next);
      setPreviewDoc(buildPreviewDoc(next));
      setRunId((n) => n + 1);
      setConsoleEntries([]);
      setActivePane('html');
      setShowTemplates(false);
      syncPenUrl(null);
    },
    [pen],
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
          ? '当前正在编辑作品库中的作品，载入成品会切换到新的草稿，已保存的作品不受影响，是否继续？'
          : !isUntouched
            ? '当前草稿尚未另存为作品，载入成品会覆盖草稿内容，是否继续？'
            : '';
      if (needsConfirm && !window.confirm(needsConfirm)) return;
      const next: FrontendPen = {
        ...DEFAULT_TEMPLATE,
        title: item.name,
        html: item.html,
        css: item.css,
        js: item.js,
        lastOpenedAt: Date.now(),
      };
      setPen(next);
      setPreviewDoc(buildPreviewDoc(next));
      setRunId((n) => n + 1);
      setConsoleEntries([]);
      setActivePane('html');
      setShowGallery(false);
      syncPenUrl(null);
    },
    [pen],
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
    setPreviewDoc(buildPreviewDoc(opened));
    setRunId((n) => n + 1);
    setConsoleEntries([]);
    setShowLibrary(false);
    syncPenUrl(opened.id);
  }, []);

  /**
   * 删除作品库中的一条作品（用户主动操作，带确认）
   */
  const handleDeletePen = useCallback(async (item: FrontendPen) => {
    if (!window.confirm(`确定删除作品「${item.title}」？删除后无法恢复。`)) return;
    await deletePen(item.id);
    setLibrary(await loadPens());
  }, []);

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

  /**
   * 开始拖拽分隔条
   */
  const handleSplitStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      // 捕获指针，保证拖拽移出分隔条后仍能持续更新比例
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        start: pen.layout === 'left' ? e.clientX : e.clientY,
        value: split,
      };
      setDragging(true);
    },
    [pen.layout, split],
  );

  /**
   * 拖拽过程中更新分隔比例
   */
  const handleSplitMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!dragRef.current) return;
      const total = pen.layout === 'left' ? window.innerWidth : window.innerHeight;
      const delta = (pen.layout === 'left' ? e.clientX : e.clientY) - dragRef.current.start;
      const next = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, dragRef.current.value + delta / total));
      setSplit(next);
    },
    [pen.layout],
  );

  /**
   * 结束拖拽：把最终比例写回作品（随自动保存持久化）
   */
  const handleSplitEnd = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  /**
   * 开始拖拽面板权重（HTML/CSS/JS 三栏边界）
   * 捕获指针，保证拖出分隔条后仍能持续更新
   */
  const handlePaneSplitStart = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, a: PaneKey, b: PaneKey) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      paneDragRef.current = {
        a,
        b,
        start: pen.layout === 'left' ? e.clientY : e.clientX,
        wa: pen.paneWeights[a],
        wb: pen.paneWeights[b],
      };
      setDragging(true);
    },
    [pen.layout, pen.paneWeights],
  );

  /**
   * 拖拽过程中更新两侧面板权重
   * 位移换算为总权重内的增量，并限制单侧最小占比
   */
  const handlePaneSplitMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const drag = paneDragRef.current;
      const container = editorsRef.current;
      if (!drag || !container) return;
      const size = pen.layout === 'left' ? container.clientHeight : container.clientWidth;
      if (size <= 0) return;
      const total = drag.wa + drag.wb;
      const delta = (pen.layout === 'left' ? e.clientY : e.clientX) - drag.start;
      const nextA = Math.min(
        total * PANE_RATIO_MAX,
        Math.max(total * PANE_RATIO_MIN, drag.wa + total * (delta / size)),
      );
      setPen((prev) => ({
        ...prev,
        paneWeights: { ...prev.paneWeights, [drag.a]: nextA, [drag.b]: total - nextA },
      }));
    },
    [pen.layout],
  );

  /** 结束面板权重拖拽 */
  const handlePaneSplitEnd = useCallback(() => {
    paneDragRef.current = null;
    setDragging(false);
  }, []);

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
          <a className="pg-back" href={`${import.meta.env.BASE_URL}`} aria-label="返回首页">
            <PgIcon name="arrow-left" size={15} />
            <span>首页</span>
          </a>
          <input
            className="pg-title-input"
            value={pen.title}
            placeholder="作品标题"
            onChange={(e) => updatePen({ title: e.target.value })}
            aria-label="作品标题"
          />
          <span className={`pg-save-state pg-save-state--${saveState}`}>
            {saveState === 'saved' ? '已保存到本地' : '保存中'}
          </span>
        </div>
        <div className="pg-toolbar-row pg-toolbar-row--actions">
          {/* 编辑器开关组：桌面为显隐开关，窄屏为标签页 */}
          <div className="pg-toolbar-group pg-toolbar-group--editors" role="group" aria-label="编辑器面板">
            {editors.map((editor) => (
              <button
                key={editor.key}
                type="button"
                className={`pg-btn pg-btn--editors${editor.visible ? ' is-on' : ''}${effectivePane === editor.key ? ' is-active' : ''}`}
                onClick={() => togglePane(editor.key)}
                aria-pressed={editor.visible}
                title={`切换到 ${editor.label} 编辑器`}
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
              title="格式化 HTML/CSS/JS 代码"
            >
              <PgIcon name="spark" size={14} />
              <span>格式化</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ autoRun: !pen.autoRun })}
              aria-pressed={pen.autoRun}
              title="自动运行预览"
            >
              <PgIcon name="refresh" size={14} />
              <span>自动</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ layout: pen.layout === 'left' ? 'top' : 'left' })}
              title="切换编辑区布局"
            >
              <PgIcon name={pen.layout === 'left' ? 'layout-left' : 'layout-top'} size={14} />
              <span>{pen.layout === 'left' ? '左右' : '上下'}</span>
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => updatePen({ showConsole: !pen.showConsole })}
              aria-pressed={pen.showConsole}
              title="控制台"
            >
              <PgIcon name="terminal" size={14} />
              <span>控制台</span>
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
              title="浏览灵感画廊：25 个设计成品，可一键载入源码"
            >
              <PgIcon name="gallery" size={14} />
              <span>灵感库</span>
            </button>
            <div className="pg-new-wrap">
              <button
                type="button"
                className="pg-btn pg-btn--ghost"
                onClick={() => setShowTemplates((v) => !v)}
                aria-expanded={showTemplates}
                title="从模板新建草稿"
              >
                <PgIcon name="plus" size={14} />
                <span>新建</span>
              </button>
              {showTemplates && (
                <div className="pg-menu" role="menu" aria-label="选择新建模板">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      className="pg-menu-item"
                      role="menuitem"
                      onClick={() => handleNewDraft(template)}
                    >
                      <span className="pg-menu-name">{template.name}</span>
                      <span className="pg-menu-desc">{template.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" className="pg-btn pg-btn--ghost" onClick={() => void handleSaveAsNew()} title="另存为新作品">
              <PgIcon name="copy" size={14} />
              <span>另存</span>
            </button>
            <button type="button" className="pg-btn pg-btn--ghost pg-btn--library" onClick={() => void handleOpenLibrary()} title="本地作品库">
              <PgIcon name="folder" size={14} />
              <span>作品库</span>
              {library.length > 0 && <em className="pg-count">{library.length}</em>}
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--primary"
              onClick={handleRun}
              title="运行预览（Ctrl/Cmd + Enter）"
            >
              <PgIcon name="play" size={14} />
              <span>运行</span>
            </button>
          </div>
          {toolbarNote && <span className="pg-toolbar-note">{toolbarNote}</span>}
        </div>
      </header>

      {/* 存储用量预警 */}
      {storageWarning && (
        <div className="pg-warning-bar">
          <PgIcon name="alert" size={14} />
          <span>{storageWarning}</span>
        </div>
      )}

      {/* 主工作区 */}
      <div className="pg-workspace" style={workspaceStyle}>
        {/* 编辑器区域 */}
        <section
          className={`pg-editors pg-editors--${pen.layout}`}
          aria-label="代码编辑器"
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
                    aria-label={`调整 ${visibleEditors[index - 1]!.label} 与 ${editor.label} 比例`}
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
                      title={`收起 ${editor.label}`}
                    >
                      <PgIcon name="close" size={12} />
                    </button>
                  </div>
                  <div className="pg-pane-body">
                    <CodeMirrorBox
                      value={value}
                      language={language as 'html' | 'css' | 'javascript'}
                      onChange={(next) =>
                        updatePen(editor.key === 'html' ? { html: next } : editor.key === 'css' ? { css: next } : { js: next })
                      }
                      ariaLabel={`${editor.label} 编辑器`}
                    />
                  </div>
                </div>
              </Fragment>
            );
          })}
          {!pen.showHtml && !pen.showCss && !pen.showJs && (
            <div className="pg-pane-empty">全部编辑器已收起，请从工具栏的 HTML / CSS / JS 按钮重新打开</div>
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
          aria-label="调整编辑区与预览区比例"
        />

        {/* 预览区域 */}
        <section className="pg-preview">
          <div className="pg-preview-head">
            <span className="pg-preview-title">
              <PgIcon name="spark" size={13} />
              实时预览
            </span>
            <div className="pg-preview-actions">
              <span className="pg-preview-size">{formatBytes(penBytes)}</span>
              <button
                type="button"
                className="pg-btn pg-btn--ghost pg-btn--sm"
                onClick={handleRun}
                title="重新运行预览（Ctrl/Cmd + Enter）"
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
            title="前端效果预览"
          />
          {pen.showConsole && (
            <div className="pg-console">
              <div className="pg-console-head">
                <span className="pg-console-title">
                  <PgIcon name="terminal" size={12} />
                  控制台
                </span>
                <div className="pg-console-actions">
                  {consoleEntries.length > 0 && (
                    <button
                      type="button"
                      className="pg-btn pg-btn--ghost pg-btn--sm"
                      onClick={() => setConsoleEntries([])}
                    >
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    className="pg-btn pg-btn--ghost pg-btn--sm"
                    onClick={() => updatePen({ showConsole: false })}
                    title="收起控制台"
                  >
                    <PgIcon name="close" size={12} />
                  </button>
                </div>
              </div>
              <div className="pg-console-body">
                {consoleEntries.length === 0 ? (
                  <div className="pg-console-empty">暂无输出，运行预览后 console 内容会显示在这里</div>
                ) : (
                  consoleEntries.map((entry, index) => (
                    <div className={`pg-console-line pg-console-line--${entry.kind}`} key={`${entry.time}-${index}`}>
                      <span className="pg-console-kind">{entry.kind}</span>
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
                本地作品库
              </span>
              <button type="button" className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => setShowLibrary(false)}>
                <PgIcon name="close" size={14} />
              </button>
            </div>
            <div className="pg-drawer-body">
              {library.length === 0 ? (
                <div className="pg-drawer-empty">
                  暂无保存的作品。编辑完成后点击「另存」即可保存在当前浏览器。
                </div>
              ) : (
                library.map((item) => (
                  <div className={`pg-lib-item ${item.id === pen.id ? 'pg-lib-item--active' : ''}`} key={item.id}>
                    <div className="pg-lib-info">
                      <span className="pg-lib-title">{item.title || '未命名作品'}</span>
                      <span className="pg-lib-meta">
                        {formatTime(item.updatedAt)} · {formatBytes(estimatePenBytes(item))}
                      </span>
                    </div>
                    <div className="pg-lib-actions">
                      <button type="button" className="pg-btn pg-btn--ghost pg-btn--sm" onClick={() => void handleOpenPen(item)}>
                        打开
                      </button>
                      <button
                        type="button"
                        className="pg-btn pg-btn--ghost pg-btn--sm pg-btn--danger"
                        onClick={() => handleDeletePen(item)}
                      >
                        删除
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
