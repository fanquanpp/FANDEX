import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', '..', 'cnt-content', 'full');
const statsOutputPath = join(__dirname, '..', 'src', 'data', 'doc-stats.json');
const indexOutputPath = join(__dirname, '..', 'src', 'data', 'doc-index.json');

function collectMarkdownFiles(dir, result = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectMarkdownFiles(fullPath, result);
    } else {
      const ext = extname(entry.name);
      if (ext === '.md' || ext === '.mdx') {
        result.push(fullPath);
      }
    }
  }
  return result;
}

function parseFrontmatterFields(content) {
  const { data } = parseFrontmatter(content);
  const asString = (v) => (typeof v === 'string' ? v.trim() || undefined : undefined);
  const order = typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : undefined;
  return {
    module: asString(data.module),
    category: asString(data.category),
    title: asString(data.title),
    order,
  };
}

function fileToSlug(filePath) {
  const relPath = relative(contentDir, filePath).split(sep).join('/');
  const normalized = relPath.replace(/[#\\]/g, '-');
  const name = basename(normalized);
  return name.replace(/\.(md|mdx)$/, '');
}

function main() {
  console.log('[build-stats] Scanning', contentDir);
  const files = collectMarkdownFiles(contentDir);
  console.log(`[build-stats] Found ${files.length} markdown files`);

  const moduleSet = new Set();
  const categorySet = new Set();
  const docIndex = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatterFields(content);
      if (fm.module) moduleSet.add(fm.module);
      if (fm.category) categorySet.add(fm.category);

      if (fm.module) {
        const slug = fileToSlug(filePath);
        docIndex.push({
          slug,
          module: fm.module,
          title: fm.title || slug,
          order: typeof fm.order === 'number' ? fm.order : 0,
        });
      }
    } catch {
      // 读取失败时静默跳过
    }
  }

  docIndex.sort((a, b) => {
    if (a.module !== b.module) {
      return a.module.localeCompare(b.module);
    }
    return a.order - b.order;
  });

  const stats = {
    totalDocs: files.length,
    totalModules: moduleSet.size,
    totalCategories: categorySet.size,
    generatedAt: new Date().toISOString(),
  };

  console.log('[build-stats] Stats:', JSON.stringify(stats, null, 2));
  console.log(`[build-stats] Doc index entries: ${docIndex.length}`);

  mkdirSync(dirname(statsOutputPath), { recursive: true });
  writeFileSync(statsOutputPath, JSON.stringify(stats, null, 2) + '\n', 'utf-8');
  console.log('[build-stats] Written stats to', statsOutputPath);

  writeFileSync(indexOutputPath, JSON.stringify(docIndex) + '\n', 'utf-8');
  console.log('[build-stats] Written index to', indexOutputPath);
}

main();
