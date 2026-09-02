/**
 * 语法速览数据预构建脚本
 * =============================================================================
 * 核心执行流程：
 *   1. 扫描 cnt-content/syntax 目录下的语言模块（编程语言/数据库命令语言）
 *   2. 解析每篇文档：标题（首个 H1）+ 小节（H2）+ 语法点
 *      （语法点 = 粗体标签 + 行内公式 + 围栏代码块，如
 *       "**基本写法：标准变基**" / "**form 元素**"）
 *      每个 H2 小节只保留第一个语法点作为代表，体现"速查做减法"原则
 *   3. 汇聚模块元数据（标题、分类主题色来自 shd-shared/metadata/modules.json）
 *   4. 输出语法速览数据：
 *      - src/data/syntax-index.json          语言索引（轻量，页面直接内嵌）
 *      - public/syntax-data/<module>.json    分语言卡片（客户端按需 fetch）
 *
 * 设计目的：
 *   - syntax 目录（cnt-content/syntax）是专用"速查"素材源：结构统一、代码示例
 *     精简，天然适合生成速查卡片；2026-08 起自历史遗留的 cnt-content/mobile 迁入，
 *     站点构建不再依赖 mobile 目录
 *   - 与 doc-stats.json / doc-index.json 一样，预构建为 JSON 缓存，
 *     避免运行时解析 700+ Markdown 文件，降低 dev/build 内存与耗时
 *   - 模块标题与分类颜色复用共享元数据，保证与全站模块体系一致
 *
 * 输出结构：
 *   {
 *     version: 1,
 *     generatedAt: "ISO 时间",
 *     languages: [{ id, title, icon, color, count, docCount }],
 *   }
 *   每个语言文件：{ module: "javascript", cards: [{ id, docTitle, section, name, formula, code, lang, truncated }] }
 * =============================================================================
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
 * 解析单个 Markdown 文档中的语法点
 * 结构约定（mobile 全库统一）：
 *   # 文档标题
 *   ## 小节标题
 *   **写法名称**（HTML 等文档为 "**form 元素**" 等标签）
 *   `行内公式`
 *   ```语言
 *   示例代码
 *   ```
 * @param {string} filePath - Markdown 文件绝对路径
 * @param {string} moduleId - 模块 ID
 * @returns {Array<object>} 语法点数组（每个 H2 小节至多一个代表点）
 */
function parseSyntaxPoints(filePath, moduleId) {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const text = readFileSync(filePath, 'utf-8');
    const points = [];

  // 文档标题：取首个 H1；缺失时回退为文件名（去编号前缀）
  const h1Match = text.match(/^#\s+(.+)$/m);
  const docTitle = h1Match
    ? h1Match[1].trim()
    : fileName.replace(/^\d+-/, '').replace(/\.md$/, '');

  // 按 H2 切分正文，sections 形如 [前言, 标题1, 正文1, 标题2, 正文2, ...]
    const sections = text.split(/^##\s+(.+)$/m);
    for (let i = 1; i < sections.length; i += 2) {
      const sectionTitle = sections[i].trim();
      const body = sections[i + 1] || '';
      // 小节代表点：每个小节只保留第一个符合条件的语法点
      let representative = null;
      // 按粗体标签切分小节，parts 形如 [前文, 标签1, 内容1, 标签2, 内容2, ...]
      const parts = body.split(/\*\*(.+?)\*\*/);
      for (let j = 1; j < parts.length; j += 2) {
        const rawLabel = parts[j].trim();
        const after = parts[j + 1] || '';
        // 行内公式：标签后第一个反引号片段
        const formulaMatch = after.match(/`([^`\n]+)`/);
        const formula = formulaMatch ? formulaMatch[1].trim() : '';
        // 示例代码：标签后第一个围栏代码块
        const codeMatch = after.match(/```([^\n`]*)\n([\s\S]*?)```/);
        // 语法点判定：同时具备行内公式与围栏代码块（结构特征，语言无关）
        if (!formula || !codeMatch) continue;
        // 写法名称：去掉"基本写法：/基本语法："等前缀
        const name = rawLabel.replace(/^(基本|常用|核心)?\s*(写法|语法)\s*[：:]\s*/, '').trim() || rawLabel.trim();
        const lang = codeMatch[1].trim() || 'text';
        const capped = capCode(codeMatch[2].replace(/\s+$/, ''));
        representative = {
          module: moduleId,
          docTitle,
          section: sectionTitle,
          name,
          formula,
          code: capped.code,
          lang,
          truncated: capped.truncated,
        };
        break;
      }
      if (representative) points.push(representative);
    }
  return points;
}

/**
 * 主函数：扫描 mobile 语言模块并生成语法速查数据
 */
function main() {
  console.log('[build-syntax] Scanning', syntaxContentDir);
  const { byId, categoryColors } = loadModuleMetadata();
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
      const points = parseSyntaxPoints(join(folderPath, fileName), moduleId);
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
    version: 1,
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

main();
