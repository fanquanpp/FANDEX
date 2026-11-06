
// 学习路径解析产物生产者（第 2 期 S1，spec 3.4）。
//
// 产物 learning-path-resolved.json = { index: string[], maps: Record<techId, ResolvedMap> }：
// - meta（title/icon/color/officialDocs/summary）在构建期从 modules.json 与地图源派生；
// - docTitle join 在构建期完成（依赖 doc-index，已入键）；
// - href 不烘进产物（评审 MF2，base 中立）：含 doc 引用的节点存
//   docRef: { module, slug, docTitle }，href = `${base}${module}/${slug}/` 拼接留在 SSR 侧
//   （src/lib/learning-path.ts，S2 接线）。web（/FANDEX/）与桌面（/）双构建天然共享同一缓存。
//
// 服务面契约：与旧实现（shd-shared/utl-utils/learning-path.ts 的 technologyMaps 白名单 +
// getModule）完全一致——白名单外的 tech（spring-boot/mybatis/spring-cloud）旧实现返回
// undefined，消费端跳过或 404，产物必须保持同一服务面，不得因产物化而扩面。

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isFresh,
  loadManifest,
  parseProducerArgs,
  sha256,
  writeProduct,
} from './lib/data-cache.mjs';

// 派生逻辑（meta 派生/docTitle join/统计口径）变更时人工 bump；键只覆盖输入内容
const PRODUCER_VERSION = 1;
const SCHEMA_VERSION = 1;

const { check: CHECK_MODE, rebuild: REBUILD_MODE } = parseProducerArgs();

const __dirname = dirname(fileURLToPath(import.meta.url));
const LP_DIR = join(__dirname, '..', '..', 'shd-shared', 'metadata', 'learning-path');
const MODULES_JSON_PATH = join(__dirname, '..', '..', 'shd-shared', 'metadata', 'modules.json');
const docIndexPublishPath = join(__dirname, '..', 'src', 'data', 'doc-index.json');
const publishPath = join(__dirname, '..', 'src', 'data', 'learning-path-resolved.json');

// 与 shd-shared/utl-utils/learning-path.ts 的 technologyMaps 白名单逐项一致
//（S1 等价校验 48/48 的基准：index.json 48 项中 45 项有地图实现）。
// 新增技术地图时需同步两处：utl-utils/learning-path.ts 导出 + 本表。
const TECHNOLOGY_MAP_WHITELIST = [
  'javascript', 'typescript', 'git', 'html5', 'css', 'react', 'vue3', 'python',
  'java', 'go', 'c', 'cpp', 'sql', 'mysql', 'redis', 'shell', 'algorithm',
  'cs-fundamentals', 'devops', 'markdown', 'github', 'svg', 'astro', 'vite',
  'tailwind', 'kotlin', 'csharp', 'rust', 'postgresql', 'networking',
  'cybersecurity', 'cloud-computing', 'software-testing', 'nextjs', 'nestjs',
  'start', 'roadmap', 'mongodb', 'godot', 'gdscript', 'renpy', 'gode', 'konado',
  'ai-llm', 'bigdata',
];

function loadDocIndexInputsHash() {
  // 优先取 build-stats 写入的 manifest.inputsHash（= sha256({totals, sortedRecords})，
  // 评审 MF5：title/order/module/category 与文件计数变化都会改变它）
  const manifest = loadManifest('doc-index', 2);
  if (manifest && typeof manifest.inputsHash === 'string') {
    return { source: 'doc-index manifest', value: manifest.inputsHash };
  }
  // 兜底：manifest 缺失时按 doc-index 发布文件字节哈希（同为内容派生，不漏失效）
  try {
    return { source: 'doc-index publish bytes', value: sha256(readFileSync(docIndexPublishPath, 'utf-8')) };
  } catch {
    throw new Error('[build-learning-path] doc-index 产物不可得（manifest 与发布文件均缺失），请先运行 build-stats（数据前置链或 pnpm dev）');
  }
}

function computeInputsHash(docIndexInputsHash) {
  const lpFiles = readdirSync(LP_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, text: readFileSync(join(LP_DIR, name), 'utf-8') }));
  const modulesText = readFileSync(MODULES_JSON_PATH, 'utf-8');
  return sha256(JSON.stringify({
    producer: PRODUCER_VERSION,
    lpFiles,
    modulesText,
    docIndexInputsHash,
  }));
}

function resolveArtifact() {
  const modulesText = readFileSync(MODULES_JSON_PATH, 'utf-8');
  const modulesData = JSON.parse(modulesText);
  const byId = new Map((modulesData.modules || []).map((m) => [m.id, m]));
  const categoryColors = modulesData.categoryColors || {};

  const indexData = existsSync(join(LP_DIR, 'index.json'))
    ? JSON.parse(readFileSync(join(LP_DIR, 'index.json'), 'utf-8'))
    : { order: [] };
  const order = Array.isArray(indexData.order) ? indexData.order : [];

  // docTitle join（与 src/lib/learning-path.ts 旧 docTitleMap 同口径）
  const docTitleMap = new Map();
  const docIndex = existsSync(docIndexPublishPath)
    ? JSON.parse(readFileSync(docIndexPublishPath, 'utf-8'))
    : null;
  if (Array.isArray(docIndex)) {
    for (const doc of docIndex) {
      docTitleMap.set(`${doc.module}/${doc.slug}`, doc.title);
    }
  }

  const maps = {};
  let served = 0;
  for (const tech of order) {
    if (!TECHNOLOGY_MAP_WHITELIST.includes(tech)) continue; // 白名单外：旧实现 undefined，保持
    const mapPath = join(LP_DIR, `${tech}.json`);
    if (!existsSync(mapPath)) continue;
    const map = JSON.parse(readFileSync(mapPath, 'utf-8'));
    const meta = byId.get(tech);
    if (!meta) continue; // 旧实现 getModule 失败时同样返回 undefined

    const color = categoryColors[(meta.categories || [])[0] ?? ''] || '#666666';
    const stages = (map.stages || []).map((stage) => ({
      id: stage.id,
      title: stage.title,
      ...(stage.subtitle ? { subtitle: stage.subtitle } : {}),
      nodes: (stage.nodes || []).map((node) => {
        const vm = { id: node.id, title: node.title, stageId: stage.id, stageTitle: stage.title };
        if (node.desc) vm.desc = node.desc;
        if (node.difficulty) vm.difficulty = node.difficulty;
        if (node.official) vm.official = node.official;
        if (node.doc) {
          vm.docRef = {
            module: tech,
            slug: node.doc,
            docTitle: docTitleMap.get(`${tech}/${node.doc}`) || node.title,
          };
        }
        return vm;
      }),
    }));
    let nodes = 0;
    let docs = 0;
    for (const stage of stages) {
      nodes += stage.nodes.length;
      docs += stage.nodes.filter((n) => n.docRef).length;
    }
    maps[tech] = {
      module: map.module,
      title: meta.title,
      icon: meta.icon,
      summary: map.summary,
      color,
      officialDocs: meta.officialDocs ?? [],
      stages,
      stats: { stages: stages.length, nodes, docs, gaps: nodes - docs },
    };
    served += 1;
  }
  return { index: order, maps, served };
}

function main() {
  const t0 = Date.now();
  const docIndexHash = loadDocIndexInputsHash();
  const inputsHash = computeInputsHash(docIndexHash.value);
  const fresh = !REBUILD_MODE && isFresh('learning-path', SCHEMA_VERSION, inputsHash, [publishPath]);

  console.log(`[build-learning-path] inputsHash 来源: ${docIndexHash.source}`);

  if (CHECK_MODE) {
    if (fresh) {
      console.log('[build-learning-path] --check: 0 待算（产物新鲜）');
      return;
    }
    console.log('[build-learning-path] --check: 产物待重建（输入变化或发布文件缺失），请先运行数据前置链');
    process.exit(1);
  }

  if (fresh) {
    console.log('[build-learning-path] 缓存新鲜，跳过写盘');
    return;
  }

  const { index, maps, served } = resolveArtifact();
  const artifact = { index, maps };
  writeProduct('learning-path', SCHEMA_VERSION, {
    inputsHash,
    envelope: {
      schemaVersion: SCHEMA_VERSION,
      inputsHash,
      producerVersion: PRODUCER_VERSION,
      payload: artifact,
    },
    publish: [{ path: publishPath, content: `${JSON.stringify(artifact)}\n` }],
  });
  console.log(`[build-learning-path] Written ${publishPath}（index ${index.length} 项 / maps ${served} 张）`);
  console.log(`[build-learning-path] Done in ${Date.now() - t0}ms`);
}

main();
