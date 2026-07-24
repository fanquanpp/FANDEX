/**
 * FANDEX 文档数据访问层 — Desktop 端（Expo/React Native）
 *
 * 功能概述：
 * - 从 public/data/module-docs-index.json 加载文档元数据索引
 * - 从 public/content/<module>/<slug>.md 加载文档 Markdown 原文
 * - 解析 YAML frontmatter 提取标题、描述、难度等元信息
 * - 提供文档列表查询与单篇文档内容获取两类接口
 *
 * 设计要点：
 * - 运行时 fetch：兼容 Expo Web（Tauri 打包）与 React Native（原生 bundle）
 * - 零硬编码路径：模块 ID 与文档 slug 均从路由参数获取
 * - Frontmatter 轻量解析：不依赖 gray-matter，手动提取 YAML 块
 * - 类型严格：接口返回值均有显式类型声明
 *
 * 数据流：
 *   module-docs-index.json → fetchModuleDocs(moduleId) → 文档列表
 *   content/<module>/<slug>.md → fetchDocContent(moduleId, slug) → { meta, body }
 */

// ============================================================
// 类型定义
// ============================================================

/**
 * 文档索引中的单条文档记录
 * 对应 module-docs-index.json 中 docs 数组的元素
 */
export interface DocIndexEntry {
  /** 文档 slug（格式：<module>/<doc-name>） */
  readonly slug: string;
  /** 文档标题 */
  readonly title: string;
  /** 排序权重 */
  readonly order: number;
  /** 标签列表 */
  readonly tags: readonly string[];
  /** 难度级别 */
  readonly difficulty: string;
}

/**
 * 文档索引结构
 * 对应 module-docs-index.json 顶层结构
 */
export interface DocsIndex {
  /** 生成时间戳 */
  readonly generatedAt: string;
  /** 按模块分组的文档列表（键格式：<category>/<module>） */
  readonly modules: Readonly<Record<string, Readonly<{ name: string; docs: readonly DocIndexEntry[] }>>>;
}

/**
 * 从 Markdown frontmatter 解析出的文档元信息
 */
export interface DocMeta {
  /** 文档标题 */
  readonly title?: string;
  /** 文档描述 */
  readonly description?: string;
  /** 模块 ID */
  readonly module?: string;
  /** 难度级别 */
  readonly difficulty?: string;
  /** 排序权重 */
  readonly order?: number;
  /** 更新日期 */
  readonly updated?: string;
  /** 标签列表 */
  readonly tags?: readonly string[];
}

/**
 * 文档完整内容（frontmatter + 正文）
 */
export interface DocContent {
  /** 从 frontmatter 解析的元信息 */
  readonly meta: DocMeta;
  /** Markdown 正文（已去除 frontmatter） */
  readonly body: string;
}

// ============================================================
// 内部工具函数
// ============================================================

/**
 * 轻量 YAML frontmatter 解析器
 *
 * 从 Markdown 文本中提取 `---` 包裹的 YAML 块，
 * 解析常见的标量字段（title、description、module、difficulty、order、updated、tags）。
 *
 * 不依赖 gray-matter / js-yaml，保持零额外依赖。
 * 仅支持 flat key-value 与简单数组，满足 FANDEX frontmatter 结构。
 *
 * @param raw - 原始 Markdown 文本
 * @returns { meta, body } 元信息与正文
 */
function parseFrontmatter(raw: string): DocContent {
  const fmMatch = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);

  // 无 frontmatter 时，整段作为正文
  if (!fmMatch) {
    return { meta: {}, body: raw };
  }

  const [, yamlBlock, body] = fmMatch;
  const meta: Record<string, unknown> = {};

  // 逐行解析 YAML（仅支持 flat key: value 与简单数组）
  let inArray = false;
  let arrayKey = '';

  for (const line of yamlBlock!.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    // 数组项（以 - 开头）
    if (trimmed.startsWith('- ')) {
      if (inArray && arrayKey) {
        const existing = (meta[arrayKey] as unknown[]) ?? [];
        existing.push(trimmed.slice(2).replace(/^['"]|['"]$/g, ''));
        meta[arrayKey] = existing;
      }
      continue;
    }

    // 键值对
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      const [, key, value] = kvMatch;
      // 空值表示后续为数组
      if (value === '') {
        inArray = true;
        arrayKey = key!;
        meta[arrayKey] = [];
      } else {
        inArray = false;
        arrayKey = '';
        // 去除引号
        const cleanValue = value!.replace(/^['"]|['"]$/g, '');
        // 数字转换
        const numValue = Number(cleanValue);
        meta[key!] = !isNaN(numValue) && cleanValue !== '' ? numValue : cleanValue;
      }
    }
  }

  return { meta: meta as unknown as DocMeta, body: body ?? '' };
}

/**
 * 构建文档内容的 fetch URL
 *
 * @param moduleId - 模块 ID（如 javascript）
 * @param slug - 文档 slug（如 javascript/Promise静态方法）
 * @returns 编码后的 URL 路径
 */
function buildContentUrl(moduleId: string, slug: string): string {
  // slug 格式为 "<module>/<doc-name>"，取 doc-name 部分
  const docName = slug.includes('/') ? slug.split('/').slice(1).join('/') : slug;
  const path = `${moduleId}/${docName}.md`;
  return `/content/${encodeURI(path)}`;
}

// ============================================================
// 公共 API
// ============================================================

/**
 * 文档索引缓存（避免重复 fetch）
 */
let indexCache: DocsIndex | null = null;

/**
 * 加载文档索引（全量）
 *
 * 从 public/data/module-docs-index.json 获取所有模块的文档元数据。
 * 结果缓存在内存中，后续调用直接返回缓存。
 *
 * @returns 文档索引对象
 * @throws 网络错误或 JSON 解析错误时抛出
 */
export async function loadDocsIndex(): Promise<DocsIndex> {
  if (indexCache) return indexCache;

  const response = await fetch('/data/module-docs-index.json');
  if (!response.ok) {
    throw new Error(`文档索引加载失败: HTTP ${response.status}`);
  }

  indexCache = (await response.json()) as DocsIndex;
  return indexCache;
}

/**
 * 获取指定模块下的文档列表
 *
 * 从索引中查找匹配 moduleId 的条目（键格式为 <category>/<module>），
 * 返回按 order 排序的文档列表。
 *
 * @param moduleId - 模块 ID（如 javascript）
 * @returns 文档列表，按 order 升序排列
 */
export async function getModuleDocs(moduleId: string): Promise<DocIndexEntry[]> {
  const index = await loadDocsIndex();

  // 索引键格式为 "<category>/<module>"，遍历查找匹配 moduleId 的条目
  const entries = Object.values(index.modules).filter(
    (entry) => entry !== null && entry !== undefined,
  );

  // 合并所有匹配 moduleId 的文档条目
  const docs: DocIndexEntry[] = [];
  for (const entry of entries) {
    // 检查该模块下是否有文档
    const moduleDocs = entry.docs.filter((doc) => {
      // slug 格式为 "<module>/<doc-name>"
      const parts = doc.slug.split('/');
      return parts[0] === moduleId;
    });
    docs.push(...moduleDocs);
  }

  // 按 order 升序排序
  return docs.sort((a, b) => a.order - b.order);
}

/**
 * 获取单篇文档的完整内容
 *
 * 从 public/content/<module>/<slug>.md 加载 Markdown 原文，
 * 解析 frontmatter 后返回元信息与正文。
 *
 * @param moduleId - 模块 ID
 * @param slug - 文档 slug
 * @returns 文档内容（含 meta 与 body）
 * @throws 网络错误时抛出
 */
export async function fetchDocContent(
  moduleId: string,
  slug: string,
): Promise<DocContent> {
  const url = buildContentUrl(moduleId, slug);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`文档内容加载失败: HTTP ${response.status} — ${url}`);
  }

  const raw = await response.text();
  return parseFrontmatter(raw);
}
