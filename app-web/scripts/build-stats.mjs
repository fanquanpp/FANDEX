/**
 * 文档统计与索引预构建脚本
 * =============================================================================
 * 核心执行流程：
 *   1. 递归扫描 cnt-content/full 目录下所有 .md / .mdx 文件
 *   2. 解析每篇文档的 frontmatter，提取 module / category / title / order 字段
 *   3. 聚合统计：文档总数、模块数、分类数 —— 输出 doc-stats.json
 *   4. 构建轻量文档索引：每篇文档的 { slug, module, title, order }
 *      —— 输出 doc-index.json，供侧边栏"全部模块"面板直接消费
 *
 * 设计目的：
 *   - 避免首页 getDocStats() 与侧边栏 getAllDocs() 在 dev 模式下调用
 *     getCollection('docs') 全量加载所有文档导致 OOM（12GB 堆内存仍不足）
 *   - 预构建后运行时直接读取 JSON 缓存，零文档内容加载
 *   - dev 脚本启动前自动运行，build 脚本也已包含
 *
 * doc-index.json 字段说明：
 *   - slug   文档 slug（与 web 端 docSlug(collectionId) 等价：basename 去扩展名，
 *            并应用 content.config.ts generateId 的 # \ → - 替换规则）
 *   - module 所属模块 ID（frontmatter.module）
 *   - title  文档标题（frontmatter.title）
 *   - order  排序权重（frontmatter.order，缺省 0）
 *
 * 变更说明：
 *   - 标签索引功能已移除（详见用户需求 item 22），不再统计 totalTags
 *   - tags 字段在 frontmatter 中仍保留以供搜索索引使用，但不再聚合统计
 *   - 新增 doc-index.json 输出，用于替代侧边栏运行时全量 getCollection 调用
 *
 * 性能：扫描所有文档约 1-3 秒（文件系统读取 + gray-matter YAML 解析）
 * =============================================================================
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, relative, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
// frontmatter 解析统一走共享助手（gray-matter，完整 YAML 语义），不再使用手写正则
import { parseFrontmatter } from './lib/frontmatter.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentDir = join(__dirname, '..', '..', 'cnt-content', 'full');
const statsOutputPath = join(__dirname, '..', 'src', 'data', 'doc-stats.json');
const indexOutputPath = join(__dirname, '..', 'src', 'data', 'doc-index.json');

/**
 * 递归扫描目录，收集所有 .md / .mdx 文件路径
 * @param {string} dir - 扫描目录
 * @param {string[]} result - 累积的文件路径数组
 * @returns {string[]} 全部 Markdown 文件路径
 */
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

/**
 * 从 Markdown 文件内容中提取 frontmatter 关键字段
 * 委托共享助手 parseFrontmatter（gray-matter / js-yaml 完整解析），
 * 此处只做字段形态收窄：字符串裁剪、数值校验
 *
 * @param {string} content - 文件完整内容
 * @returns {{ module?: string, category?: string, title?: string, order?: number }}
 */
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

/**
 * 从文件绝对路径生成文档 slug
 *
 * slug 生成规则与 web 端 docSlug(collectionEntry.id) 保持一致：
 *   1. 取相对 contentDir 的路径（Astro glob loader 的 entry 等价）
 *   2. 应用 content.config.ts generateId 的 # \ → - 替换规则
 *   3. 取 basename 后去除 .md/.mdx 扩展名（docSlug 的行为）
 *
 * 注意：Astro glob loader 内部使用 posix 分隔符 `/`，Windows 下 path.relative
 * 返回 `\` 分隔，需先统一为 `/` 再应用 generateId 替换，确保跨平台 slug 一致。
 *
 * @param {string} filePath - 文件绝对路径
 * @returns {string} 文档 slug
 */
function fileToSlug(filePath) {
  const relPath = relative(contentDir, filePath).split(sep).join('/');
  // 模仿 generateId: entry.replace(/[#\\]/g, '-')
  const normalized = relPath.replace(/[#\\]/g, '-');
  // 模仿 docSlug: 取最后一段去扩展名
  const name = basename(normalized);
  return name.replace(/\.(md|mdx)$/, '');
}

/**
 * 主函数：扫描文档并生成统计 JSON 与文档索引 JSON
 */
function main() {
  console.log('[build-stats] Scanning', contentDir);
  const files = collectMarkdownFiles(contentDir);
  console.log(`[build-stats] Found ${files.length} markdown files`);

  const moduleSet = new Set();
  const categorySet = new Set();
  /** @type {Array<{ slug: string, module: string, title: string, order: number }>} */
  const docIndex = [];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const fm = parseFrontmatterFields(content);
      if (fm.module) moduleSet.add(fm.module);
      if (fm.category) categorySet.add(fm.category);

      // 构建文档索引项：module 为必填字段（schema 强制），缺失则跳过该文档
      // title 缺失时回退为 slug，保证侧边栏渲染不出现空白链接
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

  // 按模块字母序、再按 order 升序排序，与 getAllDocs() 排序规则保持一致
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

  // 确保输出目录存在
  mkdirSync(dirname(statsOutputPath), { recursive: true });
  writeFileSync(statsOutputPath, JSON.stringify(stats, null, 2) + '\n', 'utf-8');
  console.log('[build-stats] Written stats to', statsOutputPath);

  // 输出文档索引 JSON（紧凑格式减小体积，全量条目约 150-250KB）
  writeFileSync(indexOutputPath, JSON.stringify(docIndex) + '\n', 'utf-8');
  console.log('[build-stats] Written index to', indexOutputPath);
}

main();
