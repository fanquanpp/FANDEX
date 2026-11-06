
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname, extname, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './lib/frontmatter.mjs';
import { isFresh, parseProducerArgs, sha256, writeProduct } from './lib/data-cache.mjs';

// 生产逻辑（扫描/解析/排序规则）变更时人工 bump；键只覆盖输入内容
const PRODUCER_VERSION = 1;
// 产物 schema 版本：v2 = doc-stats 三字段（generatedAt 已移除，评审裁定为内容稳定产物前提）
const SCHEMA_VERSION = 2;

const { check: CHECK_MODE, rebuild: REBUILD_MODE } = parseProducerArgs();

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', '..', 'cnt-content', 'full');
const srcDataDir = join(__dirname, '..', 'src', 'data');
const statsPublishPath = join(srcDataDir, 'doc-stats.json');
const indexPublishPath = join(srcDataDir, 'doc-index.json');
const chunksPublishDir = join(__dirname, '..', 'public', 'data', 'doc-index');

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

// 每模块一个运行时分块（public/data/doc-index/{module}.json），供岛屿按需 fetch（spec 7.2/7.3）
function chunkByModule(records) {
  const byModule = new Map();
  for (const rec of records) {
    let docs = byModule.get(rec.module);
    if (!docs) {
      docs = [];
      byModule.set(rec.module, docs);
    }
    docs.push({ slug: rec.slug, title: rec.title, order: rec.order });
  }
  return byModule;
}

function main() {
  const t0 = Date.now();
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

  const totals = {
    totalDocs: files.length,
    totalModules: moduleSet.size,
    totalCategories: categorySet.size,
  };

  // 共享缓存键（评审 MF5）：totals 与记录数组必须同键——
  // totalDocs = 全部 .md/.mdx 文件数（含无 module 文件与下划线前缀目录）、
  // totalCategories 来自独立 categorySet（category 不在记录数组内）；
  // 仅按记录数组哈希会漏失效（无 module 文件增删 / category 变更）。
  const inputsHash = sha256(JSON.stringify({ producer: PRODUCER_VERSION, totals, sortedRecords: docIndex }));

  const chunks = chunkByModule(docIndex);
  const chunkPaths = [...chunks.keys()].map((module) => join(chunksPublishDir, `${module}.json`));

  const fresh = !REBUILD_MODE
    && isFresh('doc-index', SCHEMA_VERSION, inputsHash, [indexPublishPath, ...chunkPaths])
    && isFresh('doc-stats', SCHEMA_VERSION, inputsHash, [statsPublishPath]);

  if (CHECK_MODE) {
    if (fresh) {
      console.log('[build-stats] --check: 0 待算（doc-index / doc-stats / 分块全部新鲜）');
      return;
    }
    console.log('[build-stats] --check: 产物待重建（inputsHash 变化或发布通道文件缺失），请先运行数据前置链');
    process.exit(1);
  }

  if (fresh) {
    console.log('[build-stats] 缓存新鲜，跳过写盘（发布通道字节未变）');
    console.log(`[build-stats] Stats: ${JSON.stringify(totals)}`);
    console.log(`[build-stats] Doc index entries: ${docIndex.length}`);
    return;
  }

  console.log('[build-stats] Stats:', JSON.stringify(totals, null, 2));
  console.log(`[build-stats] Doc index entries: ${docIndex.length}`);

  // 发布通道 payload 形状保持既有契约：
  // doc-index = 裸数组（qa-check.mjs 模块一致性对账依赖）；doc-stats = 三字段
  //（generatedAt 移除：唯一消费者 doc-service.ts 只读三个计数器）
  const statsContent = `${JSON.stringify({
    totalDocs: totals.totalDocs,
    totalModules: totals.totalModules,
    totalCategories: totals.totalCategories,
  }, null, 2)}\n`;
  const indexContent = `${JSON.stringify(docIndex)}\n`;

  writeProduct('doc-index', SCHEMA_VERSION, {
    inputsHash,
    envelope: {
      schemaVersion: SCHEMA_VERSION,
      inputsHash,
      producerVersion: PRODUCER_VERSION,
      payload: { totals, index: docIndex },
    },
    publish: [
      { path: indexPublishPath, content: indexContent },
      ...[...chunks.entries()].map(([module, docs]) => ({
        path: join(chunksPublishDir, `${module}.json`),
        content: `${JSON.stringify({ module, docs })}\n`,
      })),
    ],
  });

  writeProduct('doc-stats', SCHEMA_VERSION, {
    inputsHash,
    envelope: {
      schemaVersion: SCHEMA_VERSION,
      inputsHash,
      producerVersion: PRODUCER_VERSION,
      payload: totals,
    },
    publish: [{ path: statsPublishPath, content: statsContent }],
  });

  console.log('[build-stats] Written stats to', statsPublishPath);
  console.log('[build-stats] Written index to', indexPublishPath);
  console.log(`[build-stats] Written ${chunks.size} module chunks to`, chunksPublishDir);
  console.log(`[build-stats] Done in ${Date.now() - t0}ms`);
}

main();
