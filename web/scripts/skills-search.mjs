/**
 * FANDEX Skills 检索脚本
 *
 * 功能概述：
 * 在执行任何细分任务前，先全量检索匹配场景的 Skill：
 *   1. 本地 Skills（通过 <available_skills> 列表语义匹配）
 *   2. 远程 Skills（通过 skillsmp.com API 检索并下载元数据）
 *
 * 设计原则：
 *   - 检索动作强制，不得跳过
 *   - 带本地缓存（docs/skills-cache/），避免重复请求
 *   - 限流保护（默认 5 req/s）
 *   - 错误兜底（网络失败时降级为本地检索 + 警告日志）
 *   - 偏差报备（实际执行与 Skill 指引不一致时记录至 docs/skill-deviations.log.md）
 *
 * 使用方式：
 *   node scripts/skills-search.mjs --query "calculus"
 *   node scripts/skills-search.mjs --query "C++ template" --limit 10
 *   node scripts/skills-search.mjs --list-local
 *
 * 环境变量：
 *   SKILLSMP_API_KEY  - skillsmp.com API Key（必填，从 .env.local 加载）
 *   SKILLSMP_API_BASE - skillsmp.com API 基础地址（默认 https://skillsmp.com/api/v1）
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

/** 缓存目录：用于缓存远程 Skill 元数据，避免重复请求 */
const CACHE_DIR = join(ROOT, 'docs', 'skills-cache');
/** 偏差日志：记录实际执行与 Skill 指引不一致的情况 */
const DEVIATION_LOG = join(ROOT, 'docs', 'skill-deviations.log.md');
/** 远程 Skill 检索缓存文件（按 query 哈希命名） */
const REMOTE_CACHE_PREFIX = 'remote-';

/** 默认检索结果上限 */
const DEFAULT_LIMIT = 5;
/** 远程 API 请求超时（毫秒） */
const REQUEST_TIMEOUT_MS = 8000;
/** 缓存有效期（毫秒）：默认 24 小时 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 加载 .env.local 文件中的环境变量
 * 简易实现，避免引入 dotenv 依赖
 * @returns {Promise<Record<string, string>>} 环境变量键值对（async 以兼容 fs.promises API 调用约定）
 */
async function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  const env = {};
  if (existsSync(envPath)) {
    const content = await readFile(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      env[key] = value;
    }
  }
  return env;
}

/**
 * 解析命令行参数
 * @returns {{query: string, limit: number, listLocal: boolean, help: boolean}}
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = { query: '', limit: DEFAULT_LIMIT, listLocal: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--query' || arg === '-q') {
      result.query = args[++i] ?? '';
    } else if (arg === '--limit' || arg === '-l') {
      result.limit = parseInt(args[++i] ?? String(DEFAULT_LIMIT), 10);
    } else if (arg === '--list-local') {
      result.listLocal = true;
    } else if (arg === '--help' || arg === '-h') {
      result.help = true;
    }
  }
  return result;
}

/**
 * 简单字符串哈希（用于缓存文件名）
 * @param {string} str - 输入字符串
 * @returns {string} 哈希值
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

/**
 * 读取缓存
 * @param {string} cacheFile - 缓存文件路径
 * @returns {Promise<Object|null>} 缓存数据（过期返回 null）
 */
async function readCache(cacheFile) {
  if (!existsSync(cacheFile)) return null;
  try {
    const stats = await stat(cacheFile);
    if (Date.now() - stats.mtimeMs > CACHE_TTL_MS) return null;
    const content = await readFile(cacheFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 * @param {string} cacheFile - 缓存文件路径
 * @param {Object} data - 缓存数据
 */
async function writeCache(cacheFile, data) {
  await mkdir(dirname(cacheFile), { recursive: true });
  await writeFile(cacheFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 本地 Skills 元数据（从 <available_skills> 列表中提取的子集）
 * 实际运行时由调用方维护，此处提供初始版本
 */
const LOCAL_SKILLS = [
  // 流程规范型（强遵循类）
  {
    name: 'pdf',
    category: 'document',
    type: 'strong',
    description: 'PDF 文件读取、合并、拆分、OCR',
  },
  { name: 'xlsx', category: 'document', type: 'strong', description: 'Excel 电子表格处理' },
  { name: 'docx', category: 'document', type: 'strong', description: 'Word 文档生成与编辑' },
  {
    name: 'mermaid-diagrams',
    category: 'diagram',
    type: 'strong',
    description: 'Mermaid 图表生成',
  },
  {
    name: 'mermaid-studio',
    category: 'diagram',
    type: 'strong',
    description: 'Mermaid 图表专业渲染',
  },
  { name: 'baoyu-diagram', category: 'diagram', type: 'strong', description: 'SVG 图表生成' },
  { name: 'frontend-design', category: 'frontend', type: 'strong', description: '前端设计规范' },
  {
    name: 'tailwind-css-v4',
    category: 'frontend',
    type: 'strong',
    description: 'Tailwind CSS v4 模式',
  },
  {
    name: 'tailwind-v4',
    category: 'frontend',
    type: 'strong',
    description: 'Tailwind v4 迁移指南',
  },
  {
    name: 'tailwind-4',
    category: 'frontend',
    type: 'strong',
    description: 'Tailwind 4 模式与最佳实践',
  },
  {
    name: 'tailwind-patterns',
    category: 'frontend',
    type: 'strong',
    description: 'Tailwind v4 原则',
  },
  {
    name: 'tailwind-design-system',
    category: 'frontend',
    type: 'strong',
    description: '基于 Tailwind 的设计系统',
  },
  { name: 'shadcn', category: 'frontend', type: 'strong', description: 'shadcn 组件管理' },
  { name: 'astro-framework', category: 'frontend', type: 'strong', description: 'Astro 框架专家' },
  {
    name: 'astro-developer',
    category: 'frontend',
    type: 'strong',
    description: 'Astro monorepo 开发',
  },
  { name: 'astro-pr-writer', category: 'frontend', type: 'strong', description: 'Astro PR 写作' },
  {
    name: 'astro-starlight',
    category: 'frontend',
    type: 'strong',
    description: 'Astro Starlight 文档主题',
  },
  {
    name: 'astro-static-implementation',
    category: 'frontend',
    type: 'strong',
    description: 'Astro 静态实现',
  },
  { name: 'vue', category: 'frontend', type: 'strong', description: 'Vue 3 Composition API' },
  {
    name: 'vue-best-practices',
    category: 'frontend',
    type: 'strong',
    description: 'Vue.js 最佳实践',
  },
  { name: 'vue-components', category: 'frontend', type: 'strong', description: 'Vue 3 组件构建' },
  { name: 'vue-patterns', category: 'frontend', type: 'strong', description: 'Vue.js 模式' },
  { name: 'vue-router', category: 'frontend', type: 'strong', description: 'Vue TanStack Router' },
  {
    name: 'vueuse-functions',
    category: 'frontend',
    type: 'strong',
    description: 'VueUse 组合式函数',
  },
  { name: 'typescript', category: 'language', type: 'strong', description: 'TypeScript 风格指南' },
  {
    name: 'typescript-pro',
    category: 'language',
    type: 'strong',
    description: 'TypeScript 高级类型',
  },
  {
    name: 'typescript-expert',
    category: 'language',
    type: 'strong',
    description: 'TypeScript 严格类型',
  },
  {
    name: 'typescript-advanced-types',
    category: 'language',
    type: 'strong',
    description: 'TypeScript 高级类型系统',
  },
  {
    name: 'typescript-write',
    category: 'language',
    type: 'strong',
    description: 'TypeScript 编码标准',
  },
  {
    name: 'typescript-review',
    category: 'language',
    type: 'strong',
    description: 'TypeScript 代码审查',
  },
  { name: 'java-pro', category: 'language', type: 'strong', description: 'Java 21+ 现代特性' },
  {
    name: 'java-spring-framework',
    category: 'language',
    type: 'strong',
    description: 'Spring Boot 4 架构',
  },
  { name: 'kotlin-patterns', category: 'language', type: 'strong', description: 'Kotlin 惯用模式' },
  {
    name: 'kotlin-coroutines-flows',
    category: 'language',
    type: 'strong',
    description: 'Kotlin 协程与 Flow',
  },
  { name: 'kotlin-testing', category: 'language', type: 'strong', description: 'Kotlin 测试模式' },
  {
    name: 'dignified-python',
    category: 'language',
    type: 'strong',
    description: 'Python 生产编码标准',
  },
  {
    name: 'springboot-patterns',
    category: 'language',
    type: 'strong',
    description: 'Spring Boot 架构模式',
  },

  // 技术实操型（弱遵循类，需工具验证）
  { name: 'deep-research', category: 'research', type: 'weak', description: '深度研究框架' },
  { name: 'academic-researcher', category: 'research', type: 'weak', description: '学术研究助手' },
  { name: 'academic-paper', category: 'research', type: 'weak', description: '学术论文写作流水线' },
  {
    name: 'academic-paper-polish',
    category: 'research',
    type: 'weak',
    description: '学术英文润色',
  },
  {
    name: 'academic-paper-review',
    category: 'research',
    type: 'weak',
    description: '学术论文评审',
  },
  {
    name: 'academic-poster-generator',
    category: 'research',
    type: 'weak',
    description: '学术海报生成',
  },
  { name: 'academic-pptx', category: 'research', type: 'weak', description: '学术演示文稿' },
  { name: 'academic-slides', category: 'research', type: 'weak', description: '学术幻灯片' },
  {
    name: 'academic-writing-style',
    category: 'research',
    type: 'weak',
    description: '学术写作风格',
  },
  { name: 'research-lit', category: 'research', type: 'weak', description: '文献检索与分析' },
  {
    name: 'scientific-brainstorming',
    category: 'research',
    type: 'weak',
    description: '科学研究头脑风暴',
  },
  {
    name: 'scientific-problem-selection',
    category: 'research',
    type: 'weak',
    description: '科学问题选择',
  },
  { name: 'deep-reading-analyst', category: 'research', type: 'weak', description: '深度阅读分析' },
  { name: 'summarization', category: 'research', type: 'weak', description: '内容摘要' },
  {
    name: 'market-research-reports',
    category: 'research',
    type: 'weak',
    description: '市场研究报告',
  },
  { name: 'consulting-analysis', category: 'research', type: 'weak', description: '咨询分析框架' },

  // 文档与内容创作型
  { name: 'doc-coauthoring', category: 'doc', type: 'strong', description: '文档协作流程' },
  { name: 'copy-edit', category: 'doc', type: 'strong', description: '文案编辑' },
  { name: 'copywriting', category: 'doc', type: 'strong', description: '营销文案' },
  { name: 'creative-writing', category: 'doc', type: 'strong', description: '创意写作' },
  { name: 'article-content', category: 'doc', type: 'strong', description: '文章内容生成' },
  { name: 'edit-article', category: 'doc', type: 'strong', description: '文章编辑改进' },
  {
    name: 'markdown-mermaid-writing',
    category: 'doc',
    type: 'strong',
    description: 'Markdown + Mermaid 写作',
  },
  { name: 'markdown-to-html', category: 'doc', type: 'strong', description: 'Markdown 转 HTML' },
  { name: 'markdown-toc', category: 'doc', type: 'strong', description: 'Markdown 目录提取' },
  { name: 'natural-writing', category: 'doc', type: 'strong', description: '自然写作风格' },
  { name: 'content-creation', category: 'doc', type: 'strong', description: '内容创作指南' },
  { name: 'content-creator', category: 'doc', type: 'strong', description: '品牌内容创作' },
  { name: 'content-research-writer', category: 'doc', type: 'strong', description: '内容研究写作' },
  { name: 'latex-formatter', category: 'doc', type: 'strong', description: 'LaTeX 公式格式化' },
  { name: 'mdx-sanitizer', category: 'doc', type: 'strong', description: 'MDX 内容清理' },
  { name: 'defuddle', category: 'doc', type: 'weak', description: '网页内容提取' },
  {
    name: 'document-converter-suite',
    category: 'doc',
    type: 'strong',
    description: '文档转换套件',
  },
  { name: 'kami', category: 'doc', type: 'strong', description: '文档排版' },

  // 测试与质量型
  { name: 'tdd', category: 'test', type: 'strong', description: '测试驱动开发' },
  {
    name: 'test-driven-development',
    category: 'test',
    type: 'strong',
    description: 'TDD 红-绿-重构',
  },
  { name: 'vitest', category: 'test', type: 'strong', description: 'Vitest 测试框架' },
  { name: 'kotlin-testing', category: 'test', type: 'strong', description: 'Kotlin 测试' },
  { name: 'husky', category: 'tooling', type: 'strong', description: 'Husky Git 钩子' },
  { name: 'husky-gen', category: 'tooling', type: 'strong', description: 'Git 钩子生成' },
  {
    name: 'husky-test-coverage',
    category: 'tooling',
    type: 'strong',
    description: 'Husky 测试覆盖率钩子',
  },
  {
    name: 'setup-pre-commit',
    category: 'tooling',
    type: 'strong',
    description: 'Pre-commit 钩子配置',
  },
  { name: 'eslint', category: 'tooling', type: 'strong', description: 'ESLint 配置' },
  {
    name: 'eslint-configuration',
    category: 'tooling',
    type: 'strong',
    description: 'ESLint 配置文件',
  },
  { name: 'eslint-fix', category: 'tooling', type: 'strong', description: 'ESLint 修复' },
  { name: 'eslint-rules', category: 'tooling', type: 'strong', description: 'ESLint 规则' },
  { name: 'prettier', category: 'tooling', type: 'strong', description: 'Prettier 格式化' },
  {
    name: 'prettier-configuration',
    category: 'tooling',
    type: 'strong',
    description: 'Prettier 配置',
  },
  {
    name: 'prettier-integration',
    category: 'tooling',
    type: 'strong',
    description: 'Prettier 集成',
  },
  { name: 'git-commit', category: 'tooling', type: 'strong', description: '约定式提交' },
  { name: 'gh-cli', category: 'tooling', type: 'weak', description: 'GitHub CLI' },
  {
    name: 'github-actions-creator',
    category: 'tooling',
    type: 'strong',
    description: 'GitHub Actions 创建',
  },
  {
    name: 'github-actions-hardening',
    category: 'tooling',
    type: 'strong',
    description: 'GitHub Actions 加固',
  },
  {
    name: 'github-actions-templates',
    category: 'tooling',
    type: 'strong',
    description: 'GitHub Actions 模板',
  },
  {
    name: 'github-actions-efficiency',
    category: 'tooling',
    type: 'strong',
    description: 'GitHub Actions 效率',
  },
  {
    name: 'github-actions-runtime-upgrade-conventions',
    category: 'tooling',
    type: 'strong',
    description: 'GitHub Actions 运行时升级',
  },
  { name: 'changesets', category: 'tooling', type: 'strong', description: '版本管理（隐含）' },

  // 架构与代码质量型
  { name: 'agentic-structure', category: 'arch', type: 'strong', description: '生产级开发框架' },
  { name: 'analyze-code', category: 'arch', type: 'strong', description: '代码分析' },
  { name: 'analyze-code-structure', category: 'arch', type: 'strong', description: '代码结构分析' },
  { name: 'architecture-documenter', category: 'arch', type: 'strong', description: '架构文档化' },
  { name: 'code-quality', category: 'arch', type: 'strong', description: '代码质量' },
  { name: 'code-with-codex', category: 'arch', type: 'strong', description: 'Codex 代码生成' },
  { name: 'create-plan', category: 'arch', type: 'strong', description: '需求转执行计划' },
  { name: 'create-skill', category: 'meta', type: 'strong', description: '创建 Skill' },
  { name: 'skill-creator', category: 'meta', type: 'strong', description: 'Skill 创建器' },
  { name: 'write-a-skill', category: 'meta', type: 'strong', description: '编写 Skill' },
  { name: 'design-an-interface', category: 'arch', type: 'strong', description: '接口设计' },
  { name: 'brainstorming', category: 'arch', type: 'strong', description: '需求头脑风暴' },
  { name: 'project-brainstorming', category: 'arch', type: 'strong', description: '项目头脑风暴' },
  { name: 'diagnose', category: 'arch', type: 'strong', description: '诊断循环' },
  { name: 'systematic-debugging', category: 'arch', type: 'strong', description: '系统化调试' },
  { name: 'executing-plans', category: 'arch', type: 'strong', description: '执行计划' },
  { name: 'handoff', category: 'arch', type: 'strong', description: '交接文档' },
  { name: 'grill-me', category: 'arch', type: 'strong', description: '追问计划' },
  { name: 'grill-with-docs', category: 'arch', type: 'strong', description: '对照文档追问' },
  { name: 'review', category: 'arch', type: 'strong', description: '代码审查' },
  { name: 'requesting-code-review', category: 'arch', type: 'strong', description: '请求代码审查' },
  {
    name: 'security-best-practices',
    category: 'arch',
    type: 'strong',
    description: '安全最佳实践',
  },

  // Web 开发型
  { name: 'web-design-guidelines', category: 'web', type: 'strong', description: 'Web 设计指南' },
  { name: 'web-dev', category: 'web', type: 'strong', description: 'Web 开发' },
  { name: 'frontend-aesthetics', category: 'web', type: 'strong', description: '前端美学' },
  { name: 'frontend-skill', category: 'web', type: 'strong', description: '前端技能' },
  { name: 'responsive-design', category: 'web', type: 'strong', description: '响应式设计' },
  { name: 'design-system-css', category: 'web', type: 'strong', description: '设计系统 CSS' },
  { name: 'accessibility', category: 'web', type: 'strong', description: '无障碍' },
  { name: 'pwa-builder', category: 'web', type: 'strong', description: 'PWA 构建器' },
  { name: 'pwa-development', category: 'web', type: 'strong', description: 'PWA 开发' },
  { name: 'pwa-expert', category: 'web', type: 'strong', description: 'PWA 专家' },
  { name: 'pwa-installability', category: 'web', type: 'strong', description: 'PWA 可安装性' },
  { name: 'pwa-setup', category: 'web', type: 'strong', description: 'PWA 设置' },
  { name: 'perf-astro', category: 'web', type: 'weak', description: 'Astro 性能优化' },
  { name: 'perf-web-optimization', category: 'web', type: 'weak', description: 'Web 性能优化' },
  { name: 'performance-budget', category: 'web', type: 'strong', description: '性能预算' },
  { name: 'core-web-vitals', category: 'web', type: 'weak', description: 'Core Web Vitals' },
  { name: 'image-optimization', category: 'web', type: 'strong', description: '图片优化' },
  { name: 'seo', category: 'web', type: 'strong', description: 'SEO 分析' },
  { name: 'seo-image-gen', category: 'web', type: 'strong', description: 'SEO 图片生成' },
  { name: 'seo-plan', category: 'web', type: 'strong', description: 'SEO 计划' },
  { name: 'seo-review', category: 'web', type: 'strong', description: 'SEO 审查' },
  { name: 'pagefind-search', category: 'web', type: 'strong', description: 'Pagefind 静态搜索' },
  {
    name: 'pagefind-static-low-bandwidth-search-engine',
    category: 'web',
    type: 'strong',
    description: 'Pagefind 静态搜索引擎',
  },
  { name: 'dashboard-creator', category: 'web', type: 'strong', description: '仪表盘创建' },

  // 桌面与移动型
  { name: 'tauri', category: 'desktop', type: 'strong', description: 'Tauri 命令' },
  { name: 'tauri-dev', category: 'desktop', type: 'strong', description: 'Tauri 2.0 开发' },
  {
    name: 'tauri-project-setup',
    category: 'desktop',
    type: 'strong',
    description: 'Tauri 项目初始化',
  },
  { name: 'tauri-v2', category: 'desktop', type: 'strong', description: 'Tauri v2 跨平台' },
  { name: 'electron', category: 'desktop', type: 'weak', description: 'Electron 自动化' },
  { name: 'electron-api', category: 'desktop', type: 'strong', description: 'Electron API' },
  {
    name: 'electron-development',
    category: 'desktop',
    type: 'strong',
    description: 'Electron 开发',
  },
  { name: 'electron-pro', category: 'desktop', type: 'strong', description: 'Electron 专家' },
  {
    name: 'electron-chromium-upgrade',
    category: 'desktop',
    type: 'weak',
    description: 'Chromium 升级',
  },
  { name: 'electron-node-upgrade', category: 'desktop', type: 'weak', description: 'Node.js 升级' },
  { name: 'electron-heap', category: 'desktop', type: 'weak', description: '堆快照分析' },
  { name: 'electron-profile', category: 'desktop', type: 'weak', description: '性能分析' },
  { name: 'android', category: 'mobile', type: 'strong', description: 'Android 构建' },
  {
    name: 'android-accessibility',
    category: 'mobile',
    type: 'strong',
    description: 'Android 无障碍',
  },
  {
    name: 'android-clean-architecture',
    category: 'mobile',
    type: 'strong',
    description: 'Android Clean Architecture',
  },
  {
    name: 'android-e2e-testing',
    category: 'mobile',
    type: 'weak',
    description: 'Android E2E 测试',
  },
  {
    name: 'android-native-dev',
    category: 'mobile',
    type: 'strong',
    description: 'Android 原生开发',
  },
  { name: 'android-new-module', category: 'mobile', type: 'strong', description: 'Android 新模块' },
  { name: 'android-ui-verify', category: 'mobile', type: 'weak', description: 'Android UI 验证' },
  { name: 'jetpack-compose', category: 'mobile', type: 'strong', description: 'Jetpack Compose' },
  { name: 'jetpack-compose-api', category: 'mobile', type: 'strong', description: 'Compose API' },
  {
    name: 'jetpack-compose-audit',
    category: 'mobile',
    type: 'strong',
    description: 'Compose 审计',
  },
  { name: 'jetpack-compose-dev', category: 'mobile', type: 'strong', description: 'Compose 开发' },
  {
    name: 'jetpack-compose-m3',
    category: 'mobile',
    type: 'strong',
    description: 'Wear OS Compose M3',
  },
  {
    name: 'jetpack-compose-patterns',
    category: 'mobile',
    type: 'strong',
    description: 'Compose 模式',
  },
  { name: 'linpingzhi', category: 'mobile', type: 'strong', description: 'HarmonyOS NEXT 开发' },
  { name: 'harmonyos', category: 'mobile', type: 'strong', description: 'HarmonyOS 项目（隐含）' },

  // 数据与可视化型
  { name: 'data-analysis', category: 'data', type: 'strong', description: 'Excel/CSV 数据分析' },
  { name: 'data-analyzer', category: 'data', type: 'strong', description: '数据集分析' },
  {
    name: 'analytics-data-analysis',
    category: 'data',
    type: 'strong',
    description: 'Python 数据分析',
  },
  { name: 'analytics-insights', category: 'data', type: 'strong', description: 'X/Twitter 分析' },
  { name: 'chart-image', category: 'data', type: 'weak', description: '图表图片生成' },
  { name: 'chart-visualization', category: 'data', type: 'weak', description: '图表可视化' },
  { name: 'blog-chart', category: 'data', type: 'strong', description: '博客图表 SVG' },
  { name: 'excel-analysis', category: 'data', type: 'strong', description: 'Excel 分析' },
  { name: 'finance-manager', category: 'data', type: 'strong', description: '个人财务管理' },
  { name: 'invoice-organizer', category: 'data', type: 'strong', description: '发票整理' },
  { name: 'invoice-processor', category: 'data', type: 'weak', description: '发票处理' },

  // 图像生成型
  { name: 'image', category: 'image', type: 'strong', description: '营销图像生成' },
  { name: 'image-analyzer', category: 'image', type: 'weak', description: '图像分析' },
  { name: 'image-enhancer', category: 'image', type: 'weak', description: '图像增强' },
  { name: 'image-ocr', category: 'image', type: 'weak', description: '图像 OCR' },
  { name: 'canvas-design', category: 'image', type: 'strong', description: '画布设计' },
  { name: 'algorithmic-art', category: 'image', type: 'strong', description: '算法艺术' },
  { name: 'infographics', category: 'image', type: 'strong', description: '信息图' },
  {
    name: 'notion-infographic',
    category: 'image',
    type: 'strong',
    description: 'Notion 风格信息图',
  },
  { name: 'baoyu-infographic', category: 'image', type: 'strong', description: '信息图生成' },
  { name: 'baoyu-article-illustrator', category: 'image', type: 'strong', description: '文章配图' },
  { name: 'baoyu-comic', category: 'image', type: 'strong', description: '知识漫画' },
  { name: 'baoyu-slide-deck', category: 'image', type: 'strong', description: '幻灯片图像' },
  {
    name: 'baoyu-format-markdown',
    category: 'doc',
    type: 'strong',
    description: 'Markdown 格式化',
  },
  {
    name: 'baoyu-markdown-to-html',
    category: 'doc',
    type: 'strong',
    description: 'Markdown 转 HTML',
  },
  {
    name: 'baoyu-danger-gemini-web',
    category: 'image',
    type: 'weak',
    description: 'Gemini 图像生成',
  },

  // 视频与多媒体型
  { name: 'video', category: 'media', type: 'strong', description: '视频制作' },
  { name: 'video-generation', category: 'media', type: 'weak', description: '视频生成' },
  { name: 'video-clipper', category: 'media', type: 'weak', description: '视频剪辑' },
  {
    name: 'video-subtitles-and-audio-insert-workflow',
    category: 'media',
    type: 'weak',
    description: '字幕与音频插入',
  },
  {
    name: 'video-storytelling-core-principles',
    category: 'media',
    type: 'strong',
    description: '视频叙事原则',
  },
  { name: 'hyperframes', category: 'media', type: 'strong', description: 'HTML 视频合成' },
  { name: 'hyperframes-cli', category: 'media', type: 'weak', description: 'HyperFrames CLI' },
  {
    name: 'hyperframes-media',
    category: 'media',
    type: 'weak',
    description: 'HyperFrames 媒体处理',
  },
  {
    name: 'hyperframes-registry',
    category: 'media',
    type: 'weak',
    description: 'HyperFrames 注册表',
  },
  { name: 'manim-composer', category: 'media', type: 'strong', description: 'Manim 视频规划' },
  { name: 'ppt-generation', category: 'media', type: 'strong', description: 'PPT 生成' },
  { name: 'pptx', category: 'media', type: 'strong', description: 'PowerPoint 操作' },
  { name: 'pptx-author', category: 'media', type: 'strong', description: 'PPT 作者' },
  {
    name: 'pptx-html-fidelity-audit',
    category: 'media',
    type: 'weak',
    description: 'PPT HTML 保真审计',
  },
  { name: 'wps-courseware', category: 'media', type: 'strong', description: '教学课件' },
  { name: 'graphic-slide-deck', category: 'media', type: 'strong', description: '图形幻灯片' },
  { name: 'qoderwork-ppt', category: 'media', type: 'strong', description: 'QoderWork PPT' },
  { name: 'slides', category: 'media', type: 'strong', description: '幻灯片编辑' },
  { name: 'academic-pptx', category: 'research', type: 'weak', description: '学术 PPT' },
  { name: 'academic-slides', category: 'research', type: 'weak', description: '学术幻灯片' },

  // DevOps 与部署型
  { name: 'cloudflare-deploy', category: 'deploy', type: 'weak', description: 'Cloudflare 部署' },
  { name: 'netlify-deploy', category: 'deploy', type: 'weak', description: 'Netlify 部署' },
  { name: 'vercel-deploy', category: 'deploy', type: 'weak', description: 'Vercel 部署' },
  { name: 'render-deploy', category: 'deploy', type: 'weak', description: 'Render 部署' },
  { name: 'iga-pages', category: 'deploy', type: 'weak', description: 'IGA Pages 部署' },
  {
    name: 'byted-bp-cdn-pagesdeploy',
    category: 'deploy',
    type: 'weak',
    description: 'BytePlus CDN 部署',
  },
  { name: 'redis-development', category: 'data', type: 'weak', description: 'Redis 开发' },
  { name: 'alibabacloud-cli-guidance', category: 'cloud', type: 'weak', description: '阿里云 CLI' },
  {
    name: 'alibabacloud-data-agent-skill',
    category: 'cloud',
    type: 'weak',
    description: '阿里云 Data Agent',
  },
  {
    name: 'alibabacloud-bailian-rag-knowledgebase',
    category: 'cloud',
    type: 'weak',
    description: '百炼 RAG 知识库',
  },
  {
    name: 'alibabacloud-find-skills',
    category: 'meta',
    type: 'strong',
    description: '阿里云 Skill 搜索',
  },

  // 金融与行情型
  { name: 'finance-skills', category: 'finance', type: 'weak', description: '金融技能' },
  { name: 'finance-news-analysis', category: 'finance', type: 'weak', description: '财经新闻分析' },
  { name: 'financial-analysis', category: 'finance', type: 'weak', description: '金融分析' },
  {
    name: 'lingxi-realtimemarketdata-skill',
    category: 'finance',
    type: 'weak',
    description: '灵犀实时行情',
  },
  {
    name: 'lingxi-researchreport-skill',
    category: 'finance',
    type: 'weak',
    description: '灵犀研报',
  },
  {
    name: 'lingxi-smartstockselection-skill',
    category: 'finance',
    type: 'weak',
    description: '灵犀选股',
  },
  { name: 'lingxi-watchlist-skill', category: 'finance', type: 'weak', description: '灵犀自选' },
  { name: 'watchlist-management', category: 'finance', type: 'weak', description: '自选股管理' },
  { name: 'proposal-generation', category: 'finance', type: 'weak', description: '投资建议生成' },
  {
    name: 'a-share-paper-trading-v2',
    category: 'finance',
    type: 'weak',
    description: 'A 股模拟交易',
  },

  // 教育与学习型
  { name: 'teach-me', category: 'edu', type: 'strong', description: '1对1 AI 导师' },
  { name: 'polyglot-academy', category: 'edu', type: 'strong', description: '多语言编程学习' },
  { name: 'math-help', category: 'edu', type: 'strong', description: '数学认知栈' },
  { name: 'mathguard', category: 'edu', type: 'weak', description: '数学算法升级' },
  { name: 'scaffold-exercises', category: 'edu', type: 'strong', description: '练习脚手架' },
  {
    name: 'tailored-resume-generator',
    category: 'career',
    type: 'strong',
    description: '简历生成',
  },
  { name: 'lead-research-assistant', category: 'career', type: 'weak', description: '销售研究' },

  // 浏览器自动化型
  { name: 'agent-browser', category: 'browser', type: 'weak', description: '浏览器自动化 CLI' },
  { name: 'agent-reach', category: 'browser', type: 'weak', description: '多平台交互' },
  {
    name: 'browser-max-automation',
    category: 'browser',
    type: 'weak',
    description: 'Playwright 自动化',
  },
  { name: 'webapp-testing', category: 'browser', type: 'weak', description: 'Web 应用测试' },
  { name: 'web-pentest', category: 'security', type: 'weak', description: 'Web 渗透测试' },
  { name: 'dogfood', category: 'browser', type: 'weak', description: 'Web 应用探索测试' },

  // Intel AIPC 本地型
  { name: 'local-asr', category: 'local', type: 'weak', description: '本地 ASR' },
  { name: 'local-computer-use', category: 'local', type: 'weak', description: '本地计算机使用' },
  { name: 'local-image-ocr-aipc', category: 'local', type: 'weak', description: '本地图像 OCR' },
  { name: 'local-img2img', category: 'local', type: 'weak', description: '本地图像编辑' },
  { name: 'local-mineru', category: 'local', type: 'weak', description: '本地文档解析' },
  { name: 'local-ocr-npu', category: 'local', type: 'weak', description: '本地 NPU OCR' },
  {
    name: 'local-realtime-translator',
    category: 'local',
    type: 'weak',
    description: '本地实时翻译',
  },
  { name: 'local-screenshot-qa', category: 'local', type: 'weak', description: '本地截图问答' },
  { name: 'local-tts', category: 'local', type: 'weak', description: '本地 TTS' },
  { name: 'local-txt2img', category: 'local', type: 'weak', description: '本地文生图' },
  { name: 'local-vram', category: 'local', type: 'weak', description: '本地 VRAM 调整' },

  // 知识管理与笔记型
  { name: 'obsidian-bases', category: 'km', type: 'strong', description: 'Obsidian Bases' },
  { name: 'obsidian-cli', category: 'km', type: 'weak', description: 'Obsidian CLI' },
  { name: 'obsidian-markdown', category: 'km', type: 'strong', description: 'Obsidian Markdown' },
  { name: 'obsidian-vault', category: 'km', type: 'strong', description: 'Obsidian 知识库' },
  { name: 'obsidian-automation', category: 'km', type: 'strong', description: 'Obsidian 自动化' },
  { name: 'json-canvas', category: 'km', type: 'strong', description: 'JSON Canvas' },
  { name: 'notion-cli', category: 'km', type: 'weak', description: 'Notion CLI' },
  {
    name: 'notion-knowledge-capture',
    category: 'km',
    type: 'strong',
    description: 'Notion 知识捕获',
  },
  {
    name: 'notion-meeting-intelligence',
    category: 'km',
    type: 'strong',
    description: 'Notion 会议智能',
  },
  {
    name: 'notion-research-documentation',
    category: 'km',
    type: 'strong',
    description: 'Notion 研究文档',
  },
  {
    name: 'notion-spec-to-implementation',
    category: 'km',
    type: 'strong',
    description: 'Notion 规格转实现',
  },
  { name: 'notion-infographic', category: 'km', type: 'strong', description: 'Notion 信息图' },
  { name: 'NovaForge', category: 'km', type: 'strong', description: '知识笔记模板' },
  { name: 'weekly-report-writer', category: 'km', type: 'strong', description: '周报写作' },

  // 其他工具型
  { name: 'pdf-extractor', category: 'doc', type: 'weak', description: 'PDF 提取' },
  { name: 'skill-seekers', category: 'meta', type: 'strong', description: 'Skill 转换' },
  { name: 'find-skills', category: 'meta', type: 'strong', description: 'Skill 发现' },
  {
    name: 'install-skill-dependency',
    category: 'meta',
    type: 'weak',
    description: 'Skill 依赖安装',
  },
  { name: 'caveman', category: 'meta', type: 'strong', description: '压缩通信模式' },
  { name: 'feedback', category: 'meta', type: 'strong', description: 'TRAE 反馈' },
  { name: 'qoderwork-guidance', category: 'meta', type: 'strong', description: 'QoderWork 指引' },
  { name: 'vm-error-recovery', category: 'meta', type: 'strong', description: 'VM 错误恢复' },
  {
    name: 'Getting Started with Skills',
    category: 'meta',
    type: 'strong',
    description: 'Skills 入门',
  },
  { name: 'plugin-creator', category: 'meta', type: 'strong', description: '插件创建' },
  { name: 'theme-factory', category: 'web', type: 'strong', description: '主题工厂' },
  { name: 'trend-discovery', category: 'research', type: 'weak', description: '趋势发现' },
  { name: 'business-ads', category: 'marketing', type: 'weak', description: 'X/Twitter 商业智能' },
  {
    name: 'competitive-ads-extractor',
    category: 'marketing',
    type: 'weak',
    description: '竞争对手广告提取',
  },
  {
    name: 'competitor-content-tracker',
    category: 'marketing',
    type: 'weak',
    description: '竞争对手内容追踪',
  },
  {
    name: 'social-media-strategy',
    category: 'marketing',
    type: 'strong',
    description: '社交媒体策略',
  },
  { name: 'marketing', category: 'marketing', type: 'strong', description: '营销工作流' },
  { name: 'marketing-plan', category: 'marketing', type: 'strong', description: '营销计划' },
  { name: 'blog-outline', category: 'marketing', type: 'strong', description: '博客大纲' },
  {
    name: 'pitch-deck-framework',
    category: 'marketing',
    type: 'strong',
    description: 'Pitch Deck 框架',
  },
  { name: 'internal-comms', category: 'marketing', type: 'strong', description: 'B2B 邮件写作' },
  {
    name: 'domain-name-brainstormer',
    category: 'marketing',
    type: 'strong',
    description: '域名头脑风暴',
  },
  { name: 'gaode-map-lbs', category: 'geo', type: 'weak', description: '高德地图 LBS' },
  { name: 'amap-jsapi-skill', category: 'geo', type: 'weak', description: '高德 JSAPI' },
  { name: 'personal-map', category: 'geo', type: 'weak', description: '个人专属地图' },
  { name: 'umeng-skills-index', category: 'analytics', type: 'weak', description: '友盟技能索引' },
  {
    name: 'quickbi-smartq-chat',
    category: 'analytics',
    type: 'weak',
    description: 'Quick BI 智能分析',
  },
  { name: 'alipay-payment-integration', category: 'pay', type: 'weak', description: '支付宝集成' },
  {
    name: 'douyinpay-payment-integration',
    category: 'pay',
    type: 'weak',
    description: '抖音支付集成',
  },
  {
    name: 'douyin-interact-creation',
    category: 'media',
    type: 'weak',
    description: '抖音互动创作',
  },
  {
    name: 'douyin-interactive-content-publish',
    category: 'media',
    type: 'weak',
    description: '抖音互动发布',
  },
  {
    name: 'byted-seedance-video-generate',
    category: 'media',
    type: 'weak',
    description: 'Seedance 视频生成',
  },
  {
    name: 'byted-seedream-image-generate',
    category: 'media',
    type: 'weak',
    description: 'Seedream 图像生成',
  },
  {
    name: 'byted-mediakit-shared',
    category: 'media',
    type: 'weak',
    description: 'BytePlus MediaKit',
  },
  { name: 'yescan-ocr-qoder', category: 'doc', type: 'weak', description: '夸克扫描 OCR' },
  { name: 'yescan-office-qoder', category: 'doc', type: 'weak', description: '夸克扫描 Office' },
  { name: '天眼一下', category: 'business', type: 'weak', description: '天眼查企业数据' },
  { name: 'cloud-agents-cn', category: 'cloud', type: 'weak', description: 'Qoder 云代理' },
  {
    name: 'TRAE-product-knowledge',
    category: 'meta',
    type: 'strong',
    description: 'TRAE 产品知识',
  },
  {
    name: 'Code Review Reception',
    category: 'arch',
    type: 'strong',
    description: '代码审查反馈接收',
  },
  { name: 'Dashboard Page', category: 'web', type: 'strong', description: 'ECharts 仪表盘' },
  { name: 'Doc Page', category: 'doc', type: 'strong', description: '可打印文档页' },
  { name: 'Report Page', category: 'doc', type: 'strong', description: '源引用报告页' },
  { name: 'PPT Page', category: 'media', type: 'strong', description: '单文件 HTML PPT' },
  { name: 'lev-design', category: 'arch', type: 'strong', description: 'UX 设计工作流' },
  { name: 'ui-designer', category: 'web', type: 'strong', description: 'UI 设计提取' },
  {
    name: 'ui-prototype-prompt-generator',
    category: 'web',
    type: 'strong',
    description: 'UI 原型提示生成',
  },
  { name: 'ui-ux-pro-max', category: 'web', type: 'strong', description: 'UI/UX 设计智能' },
  {
    name: 'vercel-composition-patterns',
    category: 'arch',
    type: 'strong',
    description: 'React 组合模式',
  },
  {
    name: 'vercel-react-best-practices',
    category: 'web',
    type: 'strong',
    description: 'Vercel React 最佳实践',
  },
  {
    name: 'vercel-react-native-skills',
    category: 'mobile',
    type: 'strong',
    description: 'React Native 最佳实践',
  },
  { name: 'vite-starter', category: 'web', type: 'strong', description: 'Vite 项目脚手架' },
  { name: 'report-generator', category: 'media', type: 'strong', description: '视频分析报告生成' },
  { name: 'hook-analyzer', category: 'media', type: 'strong', description: '视频钩子分析' },
  { name: 'to-issues', category: 'arch', type: 'strong', description: '计划转 Issue' },
  { name: 'to-prd', category: 'arch', type: 'strong', description: '对话转 PRD' },
  { name: 'request-refactor-plan', category: 'arch', type: 'strong', description: '重构计划' },
  { name: 'triage', category: 'arch', type: 'strong', description: 'Issue 分诊' },
  { name: 'qa', category: 'arch', type: 'strong', description: 'QA 会话' },
  { name: 'writing-plans', category: 'arch', type: 'strong', description: '写作计划' },
  { name: 'writing-beats', category: 'doc', type: 'strong', description: '节拍写作' },
  { name: 'writing-fragments', category: 'doc', type: 'strong', description: '碎片写作' },
  { name: 'writing-shape', category: 'doc', type: 'strong', description: '素材塑造' },
  { name: 'llm-prompt-optimizer', category: 'arch', type: 'strong', description: 'LLM 提示优化' },
  { name: 'prompt-enhancer', category: 'arch', type: 'strong', description: '提示增强' },
  { name: 'prototype', category: 'arch', type: 'strong', description: '原型构建' },
  {
    name: 'notebooklm-research',
    category: 'research',
    type: 'weak',
    description: 'NotebookLM 研究',
  },
  { name: 'research-to-website', category: 'web', type: 'strong', description: '研究转网站' },
  { name: 'mcp-builder', category: 'arch', type: 'strong', description: 'MCP 服务器构建' },
  { name: 'gradle-build', category: 'mobile', type: 'weak', description: 'Gradle 构建' },
  {
    name: 'gradle-build-performance',
    category: 'mobile',
    type: 'weak',
    description: 'Gradle 性能',
  },
  { name: 'material-design-3', category: 'web', type: 'strong', description: 'Material Design 3' },
];

/**
 * 在本地 Skills 中检索匹配项
 * @param {string} query - 检索查询
 * @param {number} limit - 返回上限
 * @returns {Array} 匹配结果
 */
function searchLocal(query, limit) {
  if (!query) return LOCAL_SKILLS.slice(0, limit);
  const q = query.toLowerCase();
  const scored = LOCAL_SKILLS.map((skill) => {
    let score = 0;
    if (skill.name.toLowerCase().includes(q)) score += 10;
    if (skill.description.toLowerCase().includes(q)) score += 5;
    if (skill.category.toLowerCase().includes(q)) score += 3;
    return { skill, score };
  }).filter((item) => item.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.skill);
}

/**
 * 在 skillsmp.com 远程检索 Skill
 * @param {string} query - 检索查询
 * @param {number} limit - 返回上限
 * @param {{apiKey: string, apiBase: string}} env - 环境变量
 * @returns {Promise<Array>} 远程匹配结果（失败时返回空数组并打印警告）
 */
async function searchRemote(query, limit, env) {
  if (!env.SKILLSMP_API_KEY) {
    console.warn('  [WARN] SKILLSMP_API_KEY 未配置，跳过远程 Skills 检索');
    return [];
  }
  if (!query) return [];

  const cacheFile = join(CACHE_DIR, `${REMOTE_CACHE_PREFIX}${hashString(query)}.json`);
  const cached = await readCache(cacheFile);
  if (cached) {
    console.log(`  [CACHE] 命中远程缓存: ${cacheFile}`);
    return cached.results.slice(0, limit);
  }

  const url = `${env.SKILLSMP_API_BASE}/skills/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log(`  [REMOTE] 检索: ${url}`);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.SKILLSMP_API_KEY}`,
        Accept: 'application/json',
        'User-Agent': 'FANDEX-SkillsSearch/1.0',
      },
    });
    if (!response.ok) {
      console.warn(`  [WARN] 远程检索失败: HTTP ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    const results = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.skills)
        ? data.skills
        : [];
    await writeCache(cacheFile, { query, results, fetchedAt: new Date().toISOString() });
    return results.slice(0, limit);
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`  [WARN] 远程检索超时（${REQUEST_TIMEOUT_MS}ms），降级为本地检索`);
    } else {
      console.warn(`  [WARN] 远程检索异常: ${error.message}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * 输出检索结果
 * @param {Array} local - 本地匹配结果
 * @param {Array} remote - 远程匹配结果
 */
function printResults(local, remote) {
  console.log('\n=== Skills 检索结果 ===\n');
  if (local.length > 0) {
    console.log('--- 本地 Skills ---');
    for (const skill of local) {
      console.log(`  [${skill.type === 'strong' ? '强' : '弱'}] ${skill.name} (${skill.category})`);
      console.log(`      ${skill.description}`);
    }
    console.log('');
  } else {
    console.log('--- 本地 Skills ---');
    console.log('  (无匹配)');
    console.log('');
  }
  if (remote.length > 0) {
    console.log('--- 远程 Skills (skillsmp.com) ---');
    for (const skill of remote) {
      const name = skill.name || skill.title || 'unknown';
      const desc = skill.description || skill.summary || '';
      const url = skill.url || skill.homepage || '';
      console.log(`  ${name}`);
      if (desc) console.log(`      ${desc}`);
      if (url) console.log(`      ${url}`);
    }
    console.log('');
  } else {
    console.log('--- 远程 Skills (skillsmp.com) ---');
    console.log('  (无匹配或检索失败)');
    console.log('');
  }
}

/**
 * 记录 Skill 偏差
 * @param {string} step - 步骤名
 * @param {string} originalRequirement - 原 Skill 要求
 * @param {string} actualAction - 实际方案
 * @param {string} reason - 依据原因
 */
export async function logDeviation(step, originalRequirement, actualAction, reason) {
  const entry = {
    timestamp: new Date().toISOString(),
    step,
    originalRequirement,
    actualAction,
    reason,
  };
  const header = `## ${entry.timestamp} | ${step}\n\n- **原 Skill 要求**：${originalRequirement}\n- **实际方案**：${actualAction}\n- **依据原因**：${reason}\n\n---\n\n`;
  await mkdir(dirname(DEVIATION_LOG), { recursive: true });
  const existed = existsSync(DEVIATION_LOG);
  if (!existed) {
    await writeFile(
      DEVIATION_LOG,
      `# Skill 偏差报备日志\n\n本日志记录实际执行与 Skill 指引不一致的所有情况。\n每条记录含：时间、步骤、原要求、实际方案、依据原因。\n\n---\n\n${header}`,
      'utf-8'
    );
  } else {
    const content = await readFile(DEVIATION_LOG, 'utf-8');
    await writeFile(DEVIATION_LOG, content + header, 'utf-8');
  }
  console.log(`  [LOG] 偏差已记录至 ${DEVIATION_LOG}`);
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
FANDEX Skills 检索脚本

用法:
  node scripts/skills-search.mjs --query "<关键词>" [--limit N]
  node scripts/skills-search.mjs --list-local
  node scripts/skills-search.mjs --help

参数:
  --query, -q <关键词>   检索关键词（同时检索本地与远程 skillsmp.com）
  --limit,  -l <数量>    返回结果上限（默认 ${DEFAULT_LIMIT}）
  --list-local           列出全部本地 Skills
  --help,    -h          显示帮助

环境变量（从 .env.local 自动加载）:
  SKILLSMP_API_KEY       skillsmp.com API Key（必填，用于远程检索）
  SKILLSMP_API_BASE      skillsmp.com API 基础地址（默认 https://skillsmp.com/api/v1）

缓存:
  远程检索结果缓存至 ${CACHE_DIR}
  缓存有效期 ${CACHE_TTL_MS / 3600000} 小时

偏差报备:
  当实际执行与 Skill 指引不一致时，调用 logDeviation() 记录至
  ${DEVIATION_LOG}
`);
}

/**
 * 主入口
 */
async function main() {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    return;
  }

  const env = await loadEnv();
  console.log(`  [ENV] SKILLSMP_API_KEY: ${env.SKILLSMP_API_KEY ? '已配置' : '未配置'}`);
  console.log(
    `  [ENV] SKILLSMP_API_BASE: ${env.SKILLSMP_API_BASE || 'https://skillsmp.com/api/v1 (默认)'}`
  );

  if (args.listLocal) {
    console.log(`\n=== 全部本地 Skills（${LOCAL_SKILLS.length} 个）===\n`);
    const grouped = {};
    for (const skill of LOCAL_SKILLS) {
      if (!grouped[skill.category]) grouped[skill.category] = [];
      grouped[skill.category].push(skill);
    }
    for (const [category, skills] of Object.entries(grouped).sort()) {
      console.log(`## ${category} (${skills.length})`);
      for (const skill of skills) {
        console.log(
          `  [${skill.type === 'strong' ? '强' : '弱'}] ${skill.name} — ${skill.description}`
        );
      }
      console.log('');
    }
    return;
  }

  if (!args.query) {
    showHelp();
    process.exit(1);
  }

  console.log(`\n检索关键词: "${args.query}"  上限: ${args.limit}\n`);

  const local = searchLocal(args.query, args.limit);
  const remote = await searchRemote(args.query, args.limit, env);
  printResults(local, remote);

  if (local.length === 0 && remote.length === 0) {
    console.log('【Skill 校验】已完成全量 Skills 检索，当前步骤未匹配到对应场景技能');
  }
}

// 仅在直接执行时运行 main（被 import 时不自动执行）
const isMain = import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`;
if (isMain) {
  main().catch((err) => {
    console.error('Skills 检索失败:', err);
    process.exit(1);
  });
}

export { searchLocal, searchRemote, logDeviation, LOCAL_SKILLS };
