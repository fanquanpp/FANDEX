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

function parseSyntaxPoints(filePath, moduleId, parser) {
  const fileName = filePath.split(/[\\/]/).pop() || '';
  const text = readFileSync(filePath, 'utf-8');
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
  console.log('[build-syntax] Scanning', syntaxContentDir);
  const { byId, categoryColors } = loadModuleMetadata();
  const parser = unified().use(remarkParse);
  const highlighter = await createSyntaxHighlighter();
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
    languages: languageList,
  };

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
