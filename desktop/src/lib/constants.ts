/**
 * FANDEX 全局常量定义（Phase 5）
 *
 * 功能概述：
 * - 集中管理站点元信息、存储键名、CDN 地址、超时阈值、响应式断点等常量
 * - 统一常量来源，避免散落在各模块中的魔法数字与字符串
 * - 使用 `as const` 断言保证字面量类型，便于 TypeScript 进行精确类型推断
 *
 * 模块划分：
 * - SITE：站点元信息（名称、标题、描述、URL、作者、语言、主题色）
 * - STORAGE_KEYS：localStorage / IndexedDB 持久化键名
 * - CDN：外部资源 CDN 地址
 * - TIMEOUTS：超时阈值（毫秒）
 * - BREAKPOINTS：响应式断点（与 Tailwind 默认断点一致）
 * - PROGRESS_STATUS：阅读进度状态枚举
 * - ANNOTATION_COLORS：批注高亮颜色选项
 *
 * 使用示例：
 *   import { SITE, STORAGE_KEYS, BREAKPOINTS } from '@/lib/constants';
 *   console.log(SITE.name); // 'FANDEX'
 *   localStorage.setItem(STORAGE_KEYS.theme, 'dark');
 */

/**
 * 站点元信息
 *
 * 字段说明：
 * - name：站点品牌名（用于 Logo、页脚、版权声明）
 * - title：首页标题（SEO 与浏览器标签页）
 * - description：站点描述（用于 meta description 与社交媒体卡片）
 * - url：生产环境站点 URL（用于生成 sitemap 与规范链接）
 * - author：作者标识（用于版权与署名）
 * - locale：站点语言区域（影响 <html lang> 与日期格式化）
 * - themeColor：PWA 主题色（light/dark 双主题，影响移动浏览器地址栏颜色）
 */
export const SITE = {
  name: 'FANDEX',
  title: 'FANDEX - 零基础到本科毕业的渐进式自学平台',
  description:
    'FANDEX 是一个涵盖编程语言、前端、后端、计算机科学、人工智能、大数据、云计算、数据库、DevOps 等 51 个模块的渐进式自学平台，提供 1900+ 篇结构化文档、术语表、速查表与测验。',
  url: 'https://fanquanpp.github.io/FANDEX-exe/',
  author: 'fanquanpp',
  locale: 'zh-CN',
  themeColor: { light: '#ffffff', dark: '#0f172a' },
} as const;

/**
 * 持久化存储键名
 *
 * 用于 localStorage 与 IndexedDB 中的键命名，统一前缀 `fandex-` 避免与其他应用冲突。
 */
export const STORAGE_KEYS = {
  /** 主题模式（light / dark / system） */
  theme: 'fandex-theme',
  /** 阅读进度数据（docId → status） */
  progress: 'fandex-progress',
  /** 文档批注数据（docId → Annotation[]） */
  annotations: 'fandex-annotations',
  /** 最近搜索词列表 */
  recentSearches: 'fandex-recent-searches',
  /** 侧边栏展开/收起状态 */
  sidebar: 'fandex-sidebar',
  /** 通用缓存（搜索索引、术语表索引等） */
  cache: 'fandex-cache',
} as const;

/**
 * 外部 CDN 资源地址
 *
 * 用于按需加载第三方库（如 KaTeX 数学公式渲染、Giscus 评论系统）。
 */
export const CDN = {
  /** KaTeX 数学公式渲染库 */
  katex: 'https://cdn.jsdelivr.net/npm/katex@latest/dist',
  /** Giscus GitHub Discussions 评论系统 */
  giscus: 'https://giscus.app',
} as const;

/**
 * 超时与时间阈值（毫秒）
 *
 * 用于网络请求、代码执行、搜索防抖、自动保存等场景的超时控制。
 */
export const TIMEOUTS = {
  /** 代码运行沙箱最大执行时长（5 秒，防止死循环） */
  codeRunner: 5000,
  /** 搜索请求超时（3 秒，保证响应速度） */
  search: 3000,
  /** 网络请求默认超时（10 秒） */
  network: 10000,
  /** 自动保存间隔（30 秒） */
  autoSave: 30000,
} as const;

/**
 * 响应式断点（像素）
 *
 * 与 Tailwind CSS v4 默认断点保持一致：
 * - sm：640px（大手机横屏 / 小平板竖屏）
 * - md：768px（平板竖屏）
 * - lg：1024px（平板横屏 / 小笔电）
 * - xl：1280px（桌面显示器）
 * - 2xl：1536px（大屏显示器）
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * 阅读进度状态枚举
 *
 * 三态循环：unread（未读）→ reading（阅读中）→ read（已读）→ unread
 */
export const PROGRESS_STATUS = {
  /** 未读 */
  UNREAD: 'unread',
  /** 阅读中 */
  READING: 'reading',
  /** 已读 */
  READ: 'read',
} as const;

/**
 * 批注高亮颜色选项
 *
 * 五种高亮色，对应视觉上的常见荧光笔颜色。
 */
export const ANNOTATION_COLORS = ['yellow', 'green', 'blue', 'pink', 'purple'] as const;

/** 批注颜色类型（由 ANNOTATION_COLORS 派生） */
export type AnnotationColor = (typeof ANNOTATION_COLORS)[number];

/** 阅读进度状态类型（由 PROGRESS_STATUS 派生） */
export type ProgressStatus = (typeof PROGRESS_STATUS)[keyof typeof PROGRESS_STATUS];
