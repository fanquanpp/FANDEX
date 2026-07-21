/**
 * 为 FANDEX 文档建立 Obsidian 关联
 * 在 frontmatter 中填充 related 和 prerequisites 字段
 *
 * 功能概述：
 * 扫描 src/content/docs 下所有 .md/.mdx 文件，根据模块依赖关系和文档排列顺序，
 * 自动为每篇文档计算 related（相关文档）和 prerequisites（前置文档）关联，
 * 并将结果写入 frontmatter。已有字段不会被覆盖，仅追加不重复的条目。
 *
 * 关联规则：
 * 1. 模块内关联：前后各 2 篇文档作为 related
 * 2. 模块前置：order > 30 的文档，prerequisites 包含同模块首篇文档
 * 3. 跨模块关联：每个模块首篇文档，related 包含前置模块的首篇文档
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

/** 文档根目录 */
const DOCS_DIR = join(import.meta.dirname, '..', 'src', 'content', 'docs');

/**
 * 模块依赖关系映射
 * 键为模块名，值为该模块依赖的前置模块列表
 */
const moduleDeps = {
  cpp: ['c'],
  vue3: ['javascript', 'css'],
  react: ['javascript'],
  typescript: ['javascript'],
  kotlin: ['java'],
  javascript: ['html5', 'css'],
  agent: ['python', 'llm'],
  llm: ['python', 'algorithm'],
  devops: ['linux', 'git', 'docker'],
  redis: ['database'],
  postgresql: ['database'],
  mysql: ['database'],
  go: ['algorithm'],
  'ai-engineering': ['python', 'algorithm'],
  'computer-vision': ['python', 'algorithm'],
  nlp: ['python', 'algorithm'],
  'generative-ai': ['llm', 'python'],
  'multimodal-ai': ['computer-vision', 'nlp'],
  'ai-ethics': ['ai-engineering'],
  csharp: ['algorithm'],
  iot: ['c', 'network'],
  harmonyos: ['javascript'],
};

/**
 * 递归获取目录下所有 .md 和 .mdx 文件
 * @param {string} dir - 要扫描的目录路径
 * @returns {string[]} 所有匹配文件的完整路径列表
 */
function getAllFiles(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath)); // 递归扫描子目录
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * 解析 Markdown 文件的 frontmatter
 * 使用简易 YAML 解析器，仅处理本项目用到的格式（键值对 + 数组）
 *
 * @param {string} content - Markdown 文件完整内容
 * @returns {Object|null} 解析结果，包含 frontmatter 对象、原始 YAML 文本和偏移量；
 *                         无 frontmatter 时返回 null
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const yaml = match[1];
  const fm = {};

  // 简易 YAML 解析（仅处理本项目用到的格式）
  const lines = yaml.split(/\r?\n/);
  let currentKey = null; // 当前正在解析的键名
  let inArray = false; // 是否正在解析数组值

  for (const line of lines) {
    // 数组项: "  - value" 或 "- value"
    const arrayItemMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (arrayItemMatch && currentKey && inArray) {
      const value = arrayItemMatch[2].trim().replace(/^['"]|['"]$/g, ''); // 去除引号
      fm[currentKey].push(value);
      continue;
    }

    // 键值对: "key: value" 或 "key:" (空值或数组开始)
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const value = kvMatch[2].trim();

      if (value === '' || value === '[]') {
        // 空值或空数组，标记为数组模式
        fm[key] = [];
        inArray = true;
        currentKey = key;
      } else {
        // 有值，尝试类型推断
        const cleanValue = value.replace(/^['"]|['"]$/g, '');
        const num = Number(cleanValue);
        if (cleanValue !== '' && !isNaN(num) && String(num) === cleanValue) {
          fm[key] = num; // 数字类型
        } else if (cleanValue === 'true') {
          fm[key] = true; // 布尔 true
        } else if (cleanValue === 'false') {
          fm[key] = false; // 布尔 false
        } else {
          fm[key] = cleanValue; // 字符串类型
        }
        inArray = false;
        currentKey = null;
      }
    }
  }

  return { frontmatter: fm, yamlRaw: yaml, endOffset: match[0].length };
}

/**
 * 将 frontmatter 值序列化为 YAML 行
 * 处理数组、数字、布尔、字符串类型，对包含特殊字符的字符串自动加引号
 *
 * @param {string} key - YAML 键名
 * @param {*} value - 要序列化的值
 * @returns {string} 序列化后的 YAML 文本
 */
function serializeValue(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${key}: []`; // 空数组简写
    }
    const lines = [`${key}:`];
    for (const item of value) {
      // 检查是否包含 YAML 特殊字符，需要引号包裹
      if (
        typeof item === 'string' &&
        (item.includes(':') ||
          item.includes('#') ||
          item.includes("'") ||
          item.includes('"') ||
          item.includes('{') ||
          item.includes('}') ||
          item.includes('[') ||
          item.includes(']') ||
          item.includes(',') ||
          item.includes('&') ||
          item.includes('*') ||
          item.includes('?') ||
          item.includes('|') ||
          item.includes('-') ||
          item.includes('<') ||
          item.includes('>') ||
          item.includes('=') ||
          item.includes('!') ||
          item.includes('%') ||
          item.includes('@') ||
          item.includes('`') ||
          item.includes(' ') ||
          item.includes('\t'))
      ) {
        const escaped = item.replace(/'/g, "''"); // YAML 单引号转义
        lines.push(`  - '${escaped}'`);
      } else {
        lines.push(`  - ${item}`);
      }
    }
    return lines.join('\n');
  }
  if (typeof value === 'number') {
    return `${key}: ${value}`;
  }
  if (typeof value === 'boolean') {
    return `${key}: ${value}`;
  }
  if (typeof value === 'string') {
    // 字符串值同样检查特殊字符
    if (
      value.includes(':') ||
      value.includes('#') ||
      value.includes("'") ||
      value.includes('"') ||
      value.includes('{') ||
      value.includes('}') ||
      value.includes('[') ||
      value.includes(']') ||
      value.includes(',') ||
      value.includes('&') ||
      value.includes('*') ||
      value.includes('?') ||
      value.includes('|') ||
      value.includes('-') ||
      value.includes('<') ||
      value.includes('>') ||
      value.includes('=') ||
      value.includes('!') ||
      value.includes('%') ||
      value.includes('@') ||
      value.includes('`') ||
      value.includes(' ') ||
      value.includes('\t')
    ) {
      const escaped = value.replace(/'/g, "''");
      return `${key}: '${escaped}'`;
    }
    return `${key}: ${value}`;
  }
  return `${key}: ${value}`;
}

/**
 * 重建整个 frontmatter YAML
 * 按原始键顺序遍历 frontmatter 对象，逐个序列化
 *
 * @param {Object} frontmatter - frontmatter 键值对对象
 * @returns {string} 重建后的 YAML 文本
 */
function rebuildYaml(frontmatter) {
  const keys = Object.keys(frontmatter);
  const lines = [];
  for (const key of keys) {
    lines.push(serializeValue(key, frontmatter[key]));
  }
  return lines.join('\n');
}

/**
 * 主逻辑：扫描文档、计算关联、写入文件
 */
function main() {
  const files = getAllFiles(DOCS_DIR);
  console.log(`找到 ${files.length} 个文档文件`);

  // 第一步：收集所有文档信息
  const docInfos = [];
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const parsed = parseFrontmatter(content);
    if (!parsed) {
      console.log(`  跳过（无 frontmatter）: ${relative(DOCS_DIR, filePath)}`);
      continue;
    }

    const relPath = relative(DOCS_DIR, filePath).replace(/\\/g, '/');
    // 去掉文件扩展名作为文档标识
    const pathWithoutExt = relPath.replace(/\.(md|mdx)$/, '');

    docInfos.push({
      filePath,
      relPath: pathWithoutExt,
      module: parsed.frontmatter.module || '',
      order: typeof parsed.frontmatter.order === 'number' ? parsed.frontmatter.order : null,
      frontmatter: parsed.frontmatter,
      yamlRaw: parsed.yamlRaw,
      endOffset: parsed.endOffset,
      content,
    });
  }

  // 第二步：按模块分组
  const moduleGroups = {};
  for (const doc of docInfos) {
    if (!doc.module) continue;
    if (!moduleGroups[doc.module]) {
      moduleGroups[doc.module] = [];
    }
    moduleGroups[doc.module].push(doc);
  }

  // 每个模块内按 order 排序（无 order 的排最后，按文件名排序）
  for (const mod of Object.keys(moduleGroups)) {
    moduleGroups[mod].sort((a, b) => {
      if (a.order !== null && b.order !== null) return a.order - b.order;
      if (a.order !== null) return -1; // 有 order 的排前面
      if (b.order !== null) return 1;
      return a.relPath.localeCompare(b.relPath); // 都无 order 时按路径排序
    });
  }

  // 第三步：计算关联关系
  let totalRelatedAdded = 0;
  let totalPrereqsAdded = 0;
  let filesModified = 0;

  for (const doc of docInfos) {
    if (!doc.module) continue;

    const modDocs = moduleGroups[doc.module];
    if (!modDocs) continue;

    const idx = modDocs.indexOf(doc);
    const newRelated = [];
    const newPrerequisites = [];

    // 规则1：模块内关联（related）- 前后各 1-2 篇
    const neighborRange = 2;
    for (let offset = -neighborRange; offset <= neighborRange; offset++) {
      if (offset === 0) continue; // 跳过自身
      const neighborIdx = idx + offset;
      if (neighborIdx >= 0 && neighborIdx < modDocs.length) {
        newRelated.push(modDocs[neighborIdx].relPath);
      }
    }

    // 规则2：模块前置（prerequisites）
    if (doc.order === null || doc.order > 30) {
      // order > 30 的文档，prerequisites 包含同模块 order 最小的文档
      const firstDoc = modDocs[0];
      if (firstDoc && firstDoc !== doc) {
        newPrerequisites.push(firstDoc.relPath);
      }
    }
    // order <= 30 的入门文档，prerequisites 为空

    // 规则3：跨模块关联 - 为每个模块的第一篇文档添加前置模块的 related
    if (idx === 0) {
      const deps = moduleDeps[doc.module] || [];
      for (const dep of deps) {
        const depDocs = moduleGroups[dep];
        if (depDocs && depDocs.length > 0) {
          // 添加前置模块的第一篇文档作为 related
          newRelated.push(depDocs[0].relPath);
        }
      }
    }

    // 合并到 frontmatter（不覆盖已有内容，只追加不重复的）
    const existingRelated = Array.isArray(doc.frontmatter.related) ? doc.frontmatter.related : [];
    const existingPrereqs = Array.isArray(doc.frontmatter.prerequisites)
      ? doc.frontmatter.prerequisites
      : [];

    const mergedRelated = [...existingRelated];
    for (const r of newRelated) {
      if (!mergedRelated.includes(r)) {
        mergedRelated.push(r); // 去重追加
      }
    }

    const mergedPrereqs = [...existingPrereqs];
    for (const p of newPrerequisites) {
      if (!mergedPrereqs.includes(p)) {
        mergedPrereqs.push(p); // 去重追加
      }
    }

    const relatedAddedCount = mergedRelated.length - existingRelated.length;
    const prereqsAddedCount = mergedPrereqs.length - existingPrereqs.length;

    if (relatedAddedCount > 0 || prereqsAddedCount > 0) {
      // 更新 frontmatter
      doc.frontmatter.related = mergedRelated;
      doc.frontmatter.prerequisites = mergedPrereqs;

      // 重建文件内容：保留 frontmatter 之后的原始内容
      const newFm = rebuildYaml(doc.frontmatter);
      const bodyContent = doc.content.slice(doc.endOffset);
      const newContent = `---\n${newFm}\n---${bodyContent}`;

      writeFileSync(doc.filePath, newContent, 'utf-8');

      totalRelatedAdded += relatedAddedCount;
      totalPrereqsAdded += prereqsAddedCount;
      filesModified++;

      if (relatedAddedCount > 0 || prereqsAddedCount > 0) {
        console.log(
          `  ${doc.relPath}: +${relatedAddedCount} related, +${prereqsAddedCount} prerequisites`
        );
      }
    }
  }

  console.log('\n========== 统计 ==========');
  console.log(`总文件数: ${docInfos.length}`);
  console.log(`修改文件数: ${filesModified}`);
  console.log(`添加 related 关联: ${totalRelatedAdded}`);
  console.log(`添加 prerequisites 关联: ${totalPrereqsAdded}`);
  console.log(`总关联数: ${totalRelatedAdded + totalPrereqsAdded}`);
}

main();
