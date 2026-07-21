/**
 * FANDEX 知识图谱生成脚本（Phase 11）
 *
 * 功能概述：
 * 从 metadata/modules.json 与 content 目录下所有 .md 文档的 frontmatter 中提取节点与边数据，
 * 生成知识图谱 JSON 文件，包含模块/文档节点、前置依赖/关联边，
 * 并按分类生成 Mermaid 子图字符串，便于在 roadmap 页面或可视化组件中使用。
 *
 * 数据源：
 *   - metadata/modules.json（模块定义与模块间依赖）
 *   - content 目录下所有 .md 文档的 frontmatter prerequisites 与 related 字段
 *
 * 输出：./public/data/knowledge-graph.json
 *
 * 输出格式：
 * {
 *   "generatedAt": "...",
 *   "nodes": [
 *     { "id": "frontend/javascript", "type": "module", "label": "JavaScript", "category": "frontend" },
 *     { "id": "frontend/javascript/概述", "type": "doc", "label": "概述", "module": "frontend/javascript" }
 *   ],
 *   "edges": [
 *     { "from": "frontend/html", "to": "frontend/javascript", "type": "prerequisite" }
 *   ],
 *   "mermaidGraphs": {
 *     "frontend": "graph TD\n  A[HTML] --> B[JavaScript]"
 *   }
 * }
 *
 * 节点 ID 规范：
 *   - 模块节点 ID：`category/moduleId`（如 "frontend/javascript"）
 *   - 文档节点 ID：`category/moduleId/docSlug`（如 "frontend/javascript/概述"）
 *   边字段统一为 `from` / `to`（与任务规格一致）
 */

import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 文档源目录 */
const DOCS_DIR = join(PROJECT_ROOT, '..', 'content', 'full');
/** 模块定义文件 */
const MODULES_FILE = join(PROJECT_ROOT, 'metadata', 'modules.json');
/** 输出目录 */
const OUTPUT_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 输出文件 */
const OUTPUT_FILE = join(OUTPUT_DIR, 'knowledge-graph.json');

/**
 * 递归遍历目录
 * @param {string} dir - 目录路径
 * @param {string[]} exts - 扩展名数组
 * @param {Function} fn - 异步回调
 */
async function walkDir(dir, exts, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, exts, fn);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      await fn(full);
    }
  }
}

/**
 * 解析 Markdown frontmatter
 * @param {string} content - 文件内容
 * @returns {Object} frontmatter 对象
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const raw = match[1];
  const data = {};
  let key = null;
  let inArray = false;
  let arrayVals = [];

  for (const line of raw.split(/\r?\n/)) {
    if (inArray) {
      const itemMatch = line.match(/^\s+-\s+['"]?(.+?)['"]?\s*$/);
      if (itemMatch) {
        arrayVals.push(itemMatch[1]);
        continue;
      }
      if (key) data[key] = arrayVals;
      inArray = false;
      key = null;
      arrayVals = [];
    }
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const k = kvMatch[1];
      const v = kvMatch[2].trim();
      if (v === '' || v === '[]') {
        key = k;
        inArray = true;
        arrayVals = [];
      } else {
        data[k] = v.replace(/^['"]|['"]$/g, '');
      }
    }
  }
  if (inArray && key) data[key] = arrayVals;
  return data;
}

/**
 * 从文件路径提取文档 slug
 * @param {string} filePath - 文件绝对路径
 * @param {string} docsDir - 文档根目录
 * @returns {string} slug
 */
function slugFromPath(filePath, docsDir) {
  const relative = filePath.replace(docsDir, '').replace(/[/\\]/g, '/');
  return relative
    .replace(/^\//, '')
    .replace(/\.mdx?$/, '')
    .replace(/#/g, '-');
}

/**
 * 构建模块节点 ID（category/moduleId）
 * @param {Object} mod - 模块定义对象
 * @returns {string} 节点 ID
 */
function moduleNodeId(mod) {
  const category =
    Array.isArray(mod.categories) && mod.categories.length > 0
      ? mod.categories[0]
      : 'uncategorized';
  return `${category}/${mod.id}`;
}

/**
 * 将字符串转义为 Mermaid 安全的标签文本
 * @param {string} text - 原始文本
 * @returns {string} Mermaid 安全文本
 */
function mermaidEscape(text) {
  return String(text)
    .replace(/[[\]"]/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}

/**
 * 主函数：生成知识图谱
 */
async function main() {
  console.log('[generate-knowledge-graph] 开始生成知识图谱...');

  /** 节点去重集合 */
  const nodeIds = new Set();
  /** 边去重集合 */
  const edgeKeys = new Set();
  /** @type {Array<Object>} */
  const nodes = [];
  /** @type {Array<Object>} */
  const edges = [];

  /**
   * 添加节点（去重）
   * @param {Object} node - 节点对象
   */
  function addNode(node) {
    if (nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(node);
  }

  /**
   * 添加边（去重，跳过自环）
   * @param {string} from - 源节点 ID
   * @param {string} to - 目标节点 ID
   * @param {string} type - 边类型
   */
  function addEdge(from, to, type) {
    if (from === to) return;
    const key = `${from}|${to}|${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to, type });
  }

  // ========== 第一步：读取模块定义 ==========
  console.log('[generate-knowledge-graph]   读取模块定义...');
  const modulesRaw = await readFile(MODULES_FILE, 'utf-8');
  const modulesData = JSON.parse(modulesRaw);
  const modules = modulesData.modules || [];
  const modulePrerequisites = modulesData.modulePrerequisites || {};

  /** 模块 ID 到模块对象的映射（用于查找 category） */
  const moduleById = new Map();
  for (const mod of modules) {
    moduleById.set(mod.id, mod);
    const nodeId = moduleNodeId(mod);
    const category =
      Array.isArray(mod.categories) && mod.categories.length > 0
        ? mod.categories[0]
        : 'uncategorized';
    addNode({
      id: nodeId,
      type: 'module',
      label: mod.title || mod.id,
      category,
      description: mod.description || '',
    });
  }

  // 模块间前置依赖边
  for (const [moduleId, prereqs] of Object.entries(modulePrerequisites)) {
    if (!Array.isArray(prereqs)) continue;
    const targetMod = moduleById.get(moduleId);
    if (!targetMod) continue;
    const targetId = moduleNodeId(targetMod);
    for (const prereqId of prereqs) {
      const prereqMod = moduleById.get(prereqId);
      if (!prereqMod) continue;
      const sourceId = moduleNodeId(prereqMod);
      addEdge(sourceId, targetId, 'prerequisite');
    }
  }

  // ========== 第二步：扫描文档 ==========
  console.log('[generate-knowledge-graph]   扫描文档 frontmatter...');
  /** @type {Array<{slug: string, title: string, moduleId: string, moduleIdPath: string, prerequisites: string[], related: string[]}>} */
  const documents = [];

  await walkDir(DOCS_DIR, ['.md', '.mdx'], async (filePath) => {
    const content = await readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    if (!fm.title || !fm.module) return;

    const moduleId = fm.module;
    const mod = moduleById.get(moduleId);
    if (!mod) return;

    const moduleIdPath = moduleNodeId(mod);
    const slug = slugFromPath(filePath, DOCS_DIR);

    documents.push({
      slug,
      title: fm.title,
      moduleId,
      moduleIdPath,
      prerequisites: Array.isArray(fm.prerequisites) ? fm.prerequisites : [],
      related: Array.isArray(fm.related) ? fm.related : [],
    });
  });

  console.log(`[generate-knowledge-graph]   找到 ${documents.length} 篇文档`);

  // 文档节点 + 模块→文档包含边 + 文档间依赖边
  for (const doc of documents) {
    const docNodeId = `${doc.moduleIdPath}/${doc.slug.split('/').pop()}`;
    addNode({
      id: docNodeId,
      type: 'doc',
      label: doc.title,
      module: doc.moduleIdPath,
    });
    addEdge(doc.moduleIdPath, docNodeId, 'contains');

    for (const prereq of doc.prerequisites) {
      // prereq 可能是 "moduleId/docName" 格式，尝试解析
      const prereqParts = prereq.split('/');
      if (prereqParts.length >= 2) {
        const prereqModuleId = prereqParts[0];
        const prereqMod = moduleById.get(prereqModuleId);
        if (prereqMod) {
          const prereqDocId = `${moduleNodeId(prereqMod)}/${prereqParts.slice(1).join('/')}`;
          addEdge(prereqDocId, docNodeId, 'prerequisite');
        }
      }
    }

    for (const related of doc.related) {
      const relatedParts = related.split('/');
      if (relatedParts.length >= 2) {
        const relatedModuleId = relatedParts[0];
        const relatedMod = moduleById.get(relatedModuleId);
        if (relatedMod) {
          const relatedDocId = `${moduleNodeId(relatedMod)}/${relatedParts.slice(1).join('/')}`;
          addEdge(docNodeId, relatedDocId, 'related');
        }
      }
    }
  }

  // ========== 第三步：生成 Mermaid 子图 ==========
  console.log('[generate-knowledge-graph]   生成 Mermaid 子图...');

  /** @type {Object<string, Array<{id: string, label: string}>>} 按分类分组的模块 */
  const modulesByCategory = {};
  for (const mod of modules) {
    const category =
      Array.isArray(mod.categories) && mod.categories.length > 0
        ? mod.categories[0]
        : 'uncategorized';
    if (!modulesByCategory[category]) {
      modulesByCategory[category] = [];
    }
    modulesByCategory[category].push(mod);
  }

  /** @type {Object<string, string>} 分类 → Mermaid 图字符串 */
  const mermaidGraphs = {};

  for (const [category, mods] of Object.entries(modulesByCategory)) {
    const lines = ['graph TD'];
    // 节点定义
    for (const mod of mods) {
      const _nodeId = moduleNodeId(mod);
      // 使用模块 id 作为 Mermaid 节点标识（去除特殊字符）
      const mermaidId = mod.id.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`  ${mermaidId}["${mermaidEscape(mod.title)}"]`);
    }
    // 边定义（仅本分类内的模块间依赖）
    for (const [moduleId, prereqs] of Object.entries(modulePrerequisites)) {
      if (!Array.isArray(prereqs)) continue;
      const targetMod = moduleById.get(moduleId);
      if (!targetMod) continue;
      const targetCat = targetMod.categories?.[0] || 'uncategorized';
      if (targetCat !== category) continue;
      const targetMermaidId = moduleId.replace(/[^a-zA-Z0-9_]/g, '_');
      for (const prereqId of prereqs) {
        const prereqMod = moduleById.get(prereqId);
        if (!prereqMod) continue;
        const prereqCat = prereqMod.categories?.[0] || 'uncategorized';
        if (prereqCat !== category) continue;
        const prereqMermaidId = prereqId.replace(/[^a-zA-Z0-9_]/g, '_');
        lines.push(`  ${prereqMermaidId} --> ${targetMermaidId}`);
      }
    }
    mermaidGraphs[category] = lines.join('\n');
  }

  // ========== 第四步：构建输出 ==========
  const output = {
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    mermaidGraphs,
  };

  await mkdir(OUTPUT_DIR, { recursive: true });
  const json = JSON.stringify(output, null, 2);
  await writeFile(OUTPUT_FILE, json, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[generate-knowledge-graph] 知识图谱生成完成。');
  console.log(`[generate-knowledge-graph]   节点数: ${nodes.length}`);
  console.log(`[generate-knowledge-graph]   边数: ${edges.length}`);
  console.log(`[generate-knowledge-graph]   Mermaid 子图数: ${Object.keys(mermaidGraphs).length}`);
  console.log(`[generate-knowledge-graph]   文件大小: ${sizeKB} KB`);
  console.log(`[generate-knowledge-graph]   输出路径: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error('[generate-knowledge-graph] 生成失败:', err);
  process.exit(1);
});
