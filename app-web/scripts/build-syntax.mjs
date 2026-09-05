/**
 * 语法速览数据预构建脚本
 * =============================================================================
 * 核心执行流程：
 *   1. 扫描 cnt-content/syntax 目录下的语言模块（编程语言/数据库命令语言）
 *   2. 用 remark-parse（unified 生态标准 Markdown 解析器）解析每篇文档：
 *      标题（首个 H1）+ 小节（H2）+ 语法点
 *      （语法点 = 粗体标签 + 行内公式 + 围栏代码块，如
 *       "**基本写法：标准变基**" / "**form 元素**"）
 *      每个 H2 小节只保留第一个语法点作为代表，体现"速查做减法"原则
 *   3. 用 Shiki（与站点文档管线同一高亮器）在构建期为每张卡片生成
 *      双主题高亮 HTML（codeHtml），客户端零高亮依赖
 *   4. 汇聚模块元数据（标题、分类主题色来自 shd-shared/metadata/modules.json）
 *   5. 输出语法速览数据：
 *      - src/data/syntax-index.json          语言索引（轻量，页面直接内嵌）
 *      - public/syntax-data/<module>.json    分语言卡片（客户端按需 fetch）
 *
 * 设计目的：
 *   - syntax 目录（cnt-content/syntax）是专用"速查"素材源：结构统一、代码示例
 *     精简，天然适合生成速查卡片
 *   - 与 doc-stats.json / doc-index.json 一样，预构建为 JSON 缓存，
 *     避免运行时解析数千 Markdown 文件，降低 dev/build 内存与耗时
 *   - 结构解析使用 remark-parse 替代早期手写正则（不再依赖素材的脆弱文本特征，
 *     如粗体/围栏在行内代码与代码块内的误匹配）；高亮使用 Shiki 替代客户端
 *     Prism（SyntaxExplorer 岛不再打包 20 种语言的高亮组件）
 *
 * 输出结构：
 *   {
 *     version: 2,
 *     generatedAt: "ISO 时间",
 *     languages: [{ id, title, icon, color, count, docCount }],
 *   }
 *   每个语言文件：{ module, cards: [{ id, docTitle, section, name, formula,
 *     code, codeHtml, lang, truncated }] }
 * =============================================================================
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { createHighlighter } from 'shiki';

const __dirname = dirname(fileURLToPath(import.meta.url));
const syntaxContentDir = join(__dirname, '..', '..', 'cnt-content', 'syntax');
const metadataPath = join(__dirname, '..', '..', 'shd-shared', 'metadata', 'modules.json');
const indexOutputPath = join(__dirname, '..', 'src', 'data', 'syntax-index.json');
const publicDataDir = join(__dirname, '..', 'public', 'syntax-data');

/**
 * 语法速览收录的模块：syntax 文件夹前缀 -> 模块 ID
 * 只收录编程语言与数据库命令语言（SQL/MySQL/PostgreSQL/Redis），
 * 排除运维、云计算、测试、框架、标记语言等非编程语言模块
 */
const LANGUAGE_FOLDERS = {
  '008-javascript': 'javascript',
  '009-typescript': 'typescript',
  '013-java': 'java',
  '014-kotlin': 'kotlin',
  '015-csharp': 'csharp',
  '016-go': 'go',
  '019-sql': 'sql',
  '020-mysql': 'mysql',
  '021-postgresql': 'postgresql',
  '022-redis': 'redis',
  '025-c': 'c',
  '026-cpp': 'cpp',
  '040-python': 'python',
  '041-rust': 'rust',
};

/** 代码块最大保留行数：速查卡片只展示核心示例，避免长示例淹没要点 */
const MAX_CODE_LINES = 8;
/** 代码块最大保留字符数，防止个别超长示例撑大 JSON */
const MAX_CODE_CHARS = 300;

/**
 * 语法数据 lang 字段 -> Shiki 语言标识映射
 * 未知/别名语言降级为相近语法或纯文本（与原 Prism 映射语义一致）
 */
const SHIKI_LANG_ALIAS = {
  bash: 'bash',
  c: 'c',
  cmake: 'cmake',
  conf: 'ini',
  cpp: 'cpp',
  csharp: 'csharp',
  go: 'go',
  groovy: 'groovy',
  java: 'java',
  javascript: 'javascript',
  json: 'json',
  kotlin: 'kotlin',
  lua: 'lua',
  makefile: 'makefile',
  properties: 'ini',
  protobuf: 'protobuf',
  python: 'python',
  redis: 'ini',
  sql: 'sql',
  toml: 'toml',
  typescript: 'typescript',
  xml: 'xml',
  yaml: 'yaml',
  text: 'plaintext',
};

/**
 * 读取共享模块元数据，返回按模块 ID 索引的查询表
 * @returns {{ byId: Map<string, object>, categoryColors: Record<string, string> }}
 */
function loadModuleMetadata() {
  let raw = {};
  try {
    raw = JSON.parse(readFileSync(metadataPath, 'utf-8'));
  } catch {
    // 元数据缺失时使用空表，脚本仍可运行，语言颜色回退为默认色
  }
  const byId = new Map();
  const categoryColors = raw.categoryColors || {};
  for (const mod of raw.modules || []) {
    byId.set(mod.id, mod);
  }
  return { byId, categoryColors };
}

/**
 * 截断长代码块：保留前若干行与字符上限，标记是否被截断
 * @param {string} code - 原始代码内容
 * @returns {{ code: string, truncated: boolean }}
 */
function capCode(code) {
  const lines = code.split('\n');
  const truncated = lines.length > MAX_CODE_LINES || code.length > MAX_CODE_CHARS;
  const kept = lines.slice(0, MAX_CODE_LINES).join('\n');
  return {
    code: kept.length > MAX_CODE_CHARS ? kept.slice(0, MAX_CODE_CHARS) : kept,
    truncated,
  };
}

/**
 * 提取节点的纯文本内容（用于粗体标签文本）
 * @param {object} node - mdast 节点
 * @returns {string} 纯文本
 */
function nodeText(node) {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
  return '';
}

/**
 * 深度优先收集节点（任意嵌套层级）
 * @param {object} root - mdast 节点
 * @param {(node: object) => boolean} predicate - 节点判定
 * @returns {object[]} 按文档顺序排列的命中节点
 */
function collectNodes(root, predicate) {
  const found = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node !== root && predicate(node)) found.push(node);
    // 逆序入栈保证深度优先的文档顺序
    if (Array.isArray(node.children)) {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
    }
  }
  return found;
}

/**
 * 解析单个 Markdown 文档中的语法点（remark-parse AST 驱动）
 * 结构约定（syntax 素材源统一）：
 *   # 文档标题
 *   ## 小节标题
 *   **写法名称**（HTML 等文档为 "**form 元素**" 等标签）
 *   `行内公式`
 *   ```语言
 *   示例代码
 *   ```
 * @param {string} filePath - Markdown 文件绝对路径
 * @param {string} moduleId - 模块 ID
 * @param {object} parser - unified remark-parse 处理器实例
 * @returns {Array<object>} 语法点数组（每个 H2 小节至多一个代表点）
 */
function parseSyntaxPoints(filePath, moduleId, parser) {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const text = readFileSync(filePath, 'utf-8');
  const tree = parser.parse(text);
  const points = [];

  // 文档标题：取首个 H1；缺失时回退为文件名（去编号前缀）
  const h1 = tree.children.find((n) => n.type === 'heading' && n.depth === 1);
  const docTitle = h1
    ? nodeText(h1).trim()
    : fileName.replace(/^\d+-/, '').replace(/\.md$/, '');

  // 按 H2 切分小节（H1/H2 同时作为边界，避免 H1 后的"前言"混入首个小节）
  let currentSection = null;
  /** @type {Array<{ title: string, nodes: object[] }>} */
  const sections = [];
  for (const child of tree.children) {
    if (child.type === 'heading' && child.depth === 2) {
      currentSection = { title: nodeText(child).trim(), nodes: [] };
      sections.push(currentSection);
    } else if (currentSection) {
      currentSection.nodes.push(child);
    }
  }

  for (const section of sections) {
    // 小节内按文档顺序收集粗体标签 / 行内公式 / 围栏代码块
    const strongs = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'strong');
    const inlineCodes = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'inlineCode');
    const fences = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'code');

    // 每个粗体标签：取其后（下一个标签前）的首个行内公式与围栏代码块
    // 结构特征判定：同时具备行内公式与围栏代码块（语言无关）
    for (let s = 0; s < strongs.length; s++) {
      const rawLabel = nodeText(strongs[s]).trim();
      const rangeEnd = s + 1 < strongs.length ? strongs[s + 1] : null;
      const afterInline = inlineCodes.filter((n) => n.position.start.offset > strongs[s].position.end.offset && (!rangeEnd || n.position.end.offset < rangeEnd.position.start.offset));
      const afterFences = fences.filter((n) => n.position.start.offset > strongs[s].position.end.offset && (!rangeEnd || n.position.end.offset < rangeEnd.position.start.offset));
      if (afterInline.length === 0 || afterFences.length === 0) continue;

      const formula = afterInline[0].value.trim();
      const lang = (afterFences[0].lang || '').trim() || 'text';
      const capped = capCode(afterFences[0].value.replace(/\s+$/, ''));
      // 写法名称：去掉"基本写法：/基本语法："等前缀
      const name = rawLabel.replace(/^(基本|常用|核心)?\s*(写法|语法)\s*[：:]\s*/, '').trim() || rawLabel.trim();
      points.push({
        module: moduleId,
        docTitle,
        section: section.title,
        name,
        formula,
        code: capped.code,
        lang,
        truncated: capped.truncated,
      });
      break; // 每个小节只保留第一个代表点
    }
  }
  return points;
}

// 与站点文档管线保持一致的 GFM 容错解析

/**
 * 初始化 Shiki 高亮器：双主题与素材涉及的语言一次性加载
 * @returns {{ highlight(code: string, lang: string): string }}
 */
async function createSyntaxHighlighter() {
  const langs = [...new Set(Object.values(SHIKI_LANG_ALIAS))];
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs,
  });
  return {
    /**
     * 高亮代码为 HTML（双主题 CSS 变量方案，与站点 .astro-code 样式一致）
     * 失败时返回空串，客户端回退纯文本展示
     */
    highlight(code, lang) {
      const shikiLang = SHIKI_LANG_ALIAS[lang];
      if (!shikiLang) return '';
      try {
        return highlighter.codeToHtml(code, {
          lang: shikiLang,
          themes: { light: 'github-light', dark: 'github-dark' },
          defaultColor: false,
        });
      } catch {
        return '';
      }
    },
  };
}

/**
 * 主函数：扫描 syntax 语言模块并生成语法速查数据
 */
async function main() {
  console.log('[build-syntax] Scanning', syntaxContentDir);
  const { byId, categoryColors } = loadModuleMetadata();
  // 结构特征（粗体/行内码/围栏代码块）为核心 Markdown 语法，
  // 纯 remark-parse 即可覆盖，无需 GFM 扩展
  const parser = unified().use(remarkParse);
  const highlighter = await createSyntaxHighlighter();
  /** @type {Map<string, { id: string, title: string, icon: string, color: string, order: number, count: number, docCount: number, cards: Array<object> }>} */
  const languages = new Map();

  for (const [folder, moduleId] of Object.entries(LANGUAGE_FOLDERS)) {
    const folderPath = join(syntaxContentDir, folder);
    if (!readdirSync(syntaxContentDir, { withFileTypes: true }).some((e) => e.isDirectory() && e.name === folder)) {
      console.warn(`[build-syntax] Missing folder: ${folder}`);
      continue;
    }
    const meta = byId.get(moduleId) || {};
    const categoryId = (meta.categories || [])[0];
    const color = categoryColors[categoryId] || '#3b82f6';
    languages.set(moduleId, {
      id: moduleId,
      title: meta.title || moduleId,
      // 模块图标（共享元数据）：首页模块卡片同款 2-4 字符标识，缺失时回退模块 ID 大写
      icon: meta.icon || moduleId.slice(0, 2).toUpperCase(),
      color,
      order: typeof meta.folder_order === 'number' ? meta.folder_order : Number(folder.split('-')[0]) || 999,
      count: 0,
      docCount: 0,
      cards: [],
    });

    const files = readdirSync(folderPath)
      .filter((name) => name.endsWith('.md'))
      .sort();
    const seen = new Set();
    for (const fileName of files) {
      const points = parseSyntaxPoints(join(folderPath, fileName), moduleId, parser);
      if (points.length > 0) languages.get(moduleId).docCount += 1;
      for (const point of points) {
        // 同一文档内按 (小节, 名称, 代码) 去重，避免重复内容刷屏
        const key = `${point.docTitle}|${point.section}|${point.name}|${point.code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const lang = languages.get(moduleId);
        lang.cards.push({
          id: `${lang.count}`,
          docTitle: point.docTitle,
          section: point.section,
          name: point.name,
          formula: point.formula,
          code: point.code,
          // 构建期 Shiki 高亮 HTML：客户端零高亮依赖（原为 Prism 运行时高亮）
          codeHtml: highlighter.highlight(point.code, point.lang),
          lang: point.lang,
          truncated: point.truncated,
        });
        lang.count += 1;
      }
    }
  }

  const languageList = [...languages.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ order, cards, ...rest }) => rest);

  const data = {
    version: 2,
    generatedAt: new Date().toISOString(),
    languages: languageList,
  };

  // 清理旧的分语言文件，避免模块调整后残留过期数据
  rmSync(publicDataDir, { recursive: true, force: true });
  mkdirSync(publicDataDir, { recursive: true });

  let totalCards = 0;
  for (const lang of languages.values()) {
    const { cards, ...meta } = lang;
    writeFileSync(join(publicDataDir, `${lang.id}.json`), JSON.stringify({ module: meta.id, cards }) + '\n', 'utf-8');
    totalCards += cards.length;
  }
  console.log(`[build-syntax] Languages: ${languageList.length}, Cards: ${totalCards}`);

  mkdirSync(dirname(indexOutputPath), { recursive: true });
  writeFileSync(indexOutputPath, JSON.stringify(data) + '\n', 'utf-8');
  console.log('[build-syntax] Written index to', indexOutputPath);
  console.log('[build-syntax] Written language chunks to', publicDataDir);
}

main().catch((err) => {
  console.error('[build-syntax] Failed:', err);
  process.exit(1);
});
