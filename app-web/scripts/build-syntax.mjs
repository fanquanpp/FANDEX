
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { createHighlighter } from 'shiki';
import {
  isFresh,
  parseProducerArgs,
  productDir,
  readJsonIfExists,
  resolveCacheRoot,
  sha256,
  writeIfChanged,
  writeProduct,
} from './lib/data-cache.mjs';

// 生产逻辑（提取规则 MAX_CODE_LINES/CHARS、名称清洗正则、remark-parse/shiki 用法）变更时人工 bump；
// 键只覆盖输入内容（评审 MF3）
const PRODUCER_VERSION = 1;
// 分块 payload { module, cards } 与 syntax-index { version: 2, languages } 现态形状
const SCHEMA_VERSION = 2;

const { check: CHECK_MODE, rebuild: REBUILD_MODE } = parseProducerArgs();

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolveCacheRoot(__dirname);
const syntaxContentDir = join(__dirname, '..', '..', 'cnt-content', 'syntax');
const metadataPath = join(__dirname, '..', '..', 'shd-shared', 'metadata', 'modules.json');
const indexOutputPath = join(__dirname, '..', 'src', 'data', 'syntax-index.json');
const publicDataDir = join(__dirname, '..', 'public', 'syntax-data');

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

const MAX_CODE_LINES = 8;
const MAX_CODE_CHARS = 300;

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

// 评审 N-(b)：shiki 版本号取值钉死为 JSON.parse 直读 node_modules/shiki/package.json
//（脚本为 mjs 直读文件，不用 import 断言）。shiki 升级会改变高亮输出，版本号入键即失效重建。
function loadShikiVersion() {
  const candidates = [
    join(__dirname, '..', 'node_modules', 'shiki', 'package.json'),
    join(REPO_ROOT, 'node_modules', 'shiki', 'package.json'),
  ];
  for (const path of candidates) {
    try {
      const pkg = JSON.parse(readFileSync(path, 'utf-8'));
      if (typeof pkg.version === 'string' && pkg.version) return pkg.version;
    } catch {
      // 尝试下一个候选路径
    }
  }
  throw new Error('[build-syntax] 无法读取 shiki 版本号（node_modules/shiki/package.json 缺失或损坏），请先安装依赖');
}

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

function capCode(code) {
  const lines = code.split('\n');
  const truncated = lines.length > MAX_CODE_LINES || code.length > MAX_CODE_CHARS;
  const kept = lines.slice(0, MAX_CODE_LINES).join('\n');
  return {
    code: kept.length > MAX_CODE_CHARS ? kept.slice(0, MAX_CODE_CHARS) : kept,
    truncated,
  };
}

function nodeText(node) {
  if (node.type === 'text') return node.value;
  if (Array.isArray(node.children)) return node.children.map(nodeText).join('');
  return '';
}

function collectNodes(root, predicate) {
  const found = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node !== root && predicate(node)) found.push(node);
    if (Array.isArray(node.children)) {
      for (let i = node.children.length - 1; i >= 0; i--) stack.push(node.children[i]);
    }
  }
  return found;
}

function parseSyntaxPoints(fileName, text, moduleId, parser) {
  const tree = parser.parse(text);
  const points = [];

  const h1 = tree.children.find((n) => n.type === 'heading' && n.depth === 1);
  const docTitle = h1
    ? nodeText(h1).trim()
    : fileName.replace(/^\d+-/, '').replace(/\.md$/, '');

  let currentSection = null;
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
    const strongs = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'strong');
    const inlineCodes = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'inlineCode');
    const fences = collectNodes({ type: 'root', children: section.nodes }, (n) => n.type === 'code');

    for (let s = 0; s < strongs.length; s++) {
      const rawLabel = nodeText(strongs[s]).trim();
      const rangeEnd = s + 1 < strongs.length ? strongs[s + 1] : null;
      const afterInline = inlineCodes.filter((n) => n.position.start.offset > strongs[s].position.end.offset && (!rangeEnd || n.position.end.offset < rangeEnd.position.start.offset));
      const afterFences = fences.filter((n) => n.position.start.offset > strongs[s].position.end.offset && (!rangeEnd || n.position.end.offset < rangeEnd.position.start.offset));
      if (afterInline.length === 0 || afterFences.length === 0) continue;

      const formula = afterInline[0].value.trim();
      const lang = (afterFences[0].lang || '').trim() || 'text';
      const capped = capCode(afterFences[0].value.replace(/\s+$/, ''));
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
      break;
    }
  }
  return points;
}

async function createSyntaxHighlighter() {
  const langs = [...new Set(Object.values(SHIKI_LANG_ALIAS))];
  const highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs,
  });
  return {
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

async function main() {
  const t0 = Date.now();
  console.log('[build-syntax] Scanning', syntaxContentDir);
  const { byId, categoryColors } = loadModuleMetadata();
  const shikiVersion = loadShikiVersion();

  // 惰性创建：全部语言缓存命中时跳过 remark parser 与 shiki highlighter 加载（热态提速主力）
  let parser = null;
  const getParser = () => (parser ??= unified().use(remarkParse));
  let highlighter = null;
  const getHighlighter = async () => (highlighter ??= await createSyntaxHighlighter());

  // 收集语言输入（文件名入键：无 H1 时 docTitle 兜底取文件名，重命名必须失效）
  const langInputs = [];
  for (const [folder, moduleId] of Object.entries(LANGUAGE_FOLDERS)) {
    const folderPath = join(syntaxContentDir, folder);
    if (!existsSync(folderPath)) {
      console.warn(`[build-syntax] Missing folder: ${folder}`);
      continue;
    }
    const files = readdirSync(folderPath)
      .filter((name) => name.endsWith('.md'))
      .sort();
    const texts = files.map((name) => ({ name, text: readFileSync(join(folderPath, name), 'utf-8') }));
    langInputs.push({ folder, moduleId, meta: byId.get(moduleId) || {}, texts });
  }

  const languages = new Map(); // moduleId -> meta（键序固定，保证产物字节稳定）
  const cardsByLang = new Map();
  const reused = [];
  const stale = [];

  for (const input of langInputs) {
    const { moduleId, texts } = input;
    // per-语言缓存键（spec 3.3 / 评审 MF3）：
    // - 该文件夹全部 .md 文件名 + 全文拼接
    // - modules.json 该模块完整切片 byId.get(moduleId)（title/icon/categories/folder_order
    //   等全部消费字段都进产物，必须整体入键，不能只入色表）
    // - modules.json 的 categoryColors 全表（color 经 categories[0] 派生）
    // - SHIKI_LANG_ALIAS 与 shiki 版本号（高亮输出依赖）
    // - PRODUCER_VERSION（键只覆盖输入内容，提取逻辑变更时人工 bump）
    const inputsHash = sha256(JSON.stringify({
      producer: PRODUCER_VERSION,
      files: texts.map((t) => ({ name: t.name, text: t.text })),
      moduleSlice: byId.has(moduleId) ? byId.get(moduleId) : null,
      categoryColors,
      shikiAlias: SHIKI_LANG_ALIAS,
      shikiVersion,
    }));

    const product = `syntax/${moduleId}`;
    const chunkPath = join(publicDataDir, `${moduleId}.json`);
    let hit = false;
    if (!REBUILD_MODE && isFresh(product, SCHEMA_VERSION, inputsHash, [chunkPath])) {
      const envelope = readJsonIfExists(join(productDir(product, SCHEMA_VERSION), 'payload.json'));
      const payload = envelope && envelope.payload;
      if (payload && payload.meta && payload.meta.id === moduleId && Array.isArray(payload.cards)) {
        languages.set(moduleId, payload.meta);
        cardsByLang.set(moduleId, payload.cards);
        reused.push(moduleId);
        hit = true;
      }
    }
    if (!hit) {
      stale.push({ input, inputsHash });
    }
  }

  for (const { input, inputsHash } of stale) {
    const { folder, moduleId, meta, texts } = input;
    const highlighterForLang = await getHighlighter();
    const cards = [];
    let docCount = 0;
    const seen = new Set();
    for (const { name, text } of texts) {
      const points = parseSyntaxPoints(name, text, moduleId, getParser());
      if (points.length > 0) docCount += 1;
      for (const point of points) {
        const key = `${point.docTitle}|${point.section}|${point.name}|${point.code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        cards.push({
          id: `${cards.length}`,
          docTitle: point.docTitle,
          section: point.section,
          name: point.name,
          formula: point.formula,
          code: point.code,
          codeHtml: highlighterForLang.highlight(point.code, point.lang),
          lang: point.lang,
          truncated: point.truncated,
        });
      }
    }
    const langMeta = {
      id: moduleId,
      title: meta.title || moduleId,
      icon: meta.icon || moduleId.slice(0, 2).toUpperCase(),
      color: categoryColors[(meta.categories || [])[0]] || '#3b82f6',
      order: typeof meta.folder_order === 'number' ? meta.folder_order : Number(folder.split('-')[0]) || 999,
      count: cards.length,
      docCount,
    };
    languages.set(moduleId, langMeta);
    cardsByLang.set(moduleId, cards);
    if (!CHECK_MODE) {
      // 逐文件 writeIfChanged：未变更文件零触碰（替换旧的 rmSync 整目录重建，spec 5.3）
      writeProduct(`syntax/${moduleId}`, SCHEMA_VERSION, {
        inputsHash,
        envelope: {
          schemaVersion: SCHEMA_VERSION,
          inputsHash,
          producerVersion: PRODUCER_VERSION,
          payload: { meta: langMeta, cards },
        },
        publish: [{ path: join(publicDataDir, `${moduleId}.json`), content: `${JSON.stringify({ module: moduleId, cards })}\n` }],
      });
    }
  }

  const languageList = [...languages.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ order, ...rest }) => rest);

  const data = {
    version: 2,
    languages: languageList,
  };

  let totalCards = 0;
  for (const cards of cardsByLang.values()) totalCards += cards.length;

  console.log(`[build-syntax] Languages: ${languageList.length}（缓存复用 ${reused.length} / 待重建 ${stale.length}）, Cards: ${totalCards}`);

  if (CHECK_MODE) {
    if (stale.length > 0) {
      console.log(`[build-syntax] --check: ${stale.length} 个语言待重建（${stale.map((s) => s.input.moduleId).join(', ')}），请先运行数据前置链`);
      process.exit(1);
    }
    console.log('[build-syntax] --check: 0 待算（全部分块与索引新鲜）');
    return;
  }

  // 索引由各语言 meta 汇总重建，writeIfChanged 保证未变时零写盘
  writeIfChanged(indexOutputPath, `${JSON.stringify(data)}\n`);
  console.log('[build-syntax] Written index to', indexOutputPath);
  console.log('[build-syntax] Written language chunks to', publicDataDir);
  console.log(`[build-syntax] Done in ${Date.now() - t0}ms`);
}

main().catch((err) => {
  console.error('[build-syntax] Failed:', err);
  process.exit(1);
});
