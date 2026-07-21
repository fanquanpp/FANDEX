/**
 * FANDEX QA 检查脚本（Phase 11）
 *
 * 功能概述：
 * 对项目结构、内容完整性、构建产物、配置文件、Vue 残留等进行多维质量检查。
 * 可在构建前（pre-build）或构建后（post-build）运行，每项检查输出 PASS/FAIL/WARN。
 * 存在 FAIL 项时以非零退出码退出，阻断流水线。
 *
 * 检查项：
 *   1. 内容完整性：content/ 下文档数 > 1900
 *   2. 术语表完整性：glossary/ 下 27 个 glossary.md 文件
 *   3. 速查表完整性：cheatsheets/ 下 9 个 JSON 文件
 *   4. 模块定义：metadata/modules.json 含 51 个模块
 *   5. 索引文件存在：glossary-index.json、module-docs-index.json、tag-index.json、knowledge-graph.json
 *   6. 构建产物：./dist/ 目录存在且含 index.html（仅 post-build 检查）
 *   7. 无 Vue 残留：grep "from 'vue'" 或 ".vue" 在 src/ 下返回 0 结果
 *   8. Tauri 配置：src-tauri/tauri.conf.json 存在
 *   9. PWA 资源：manifest.json、sw.js、icons/ 存在
 */

import { access, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 当前脚本所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const PROJECT_ROOT = resolve(__dirname, '..');
/** 文档源目录 */
const CONTENT_DIR = join(PROJECT_ROOT, '..', 'content', 'full');
/** 术语表目录 */
const GLOSSARY_DIR = join(PROJECT_ROOT, 'src', 'content', 'glossary');
/** 速查表目录 */
const CHEATSHEETS_DIR = join(PROJECT_ROOT, 'src', 'data', 'cheatsheets');
/** 模块定义文件 */
const MODULES_FILE = join(PROJECT_ROOT, 'metadata', 'modules.json');
/** 索引输出目录 */
const DATA_DIR = join(PROJECT_ROOT, 'public', 'data');
/** 构建产物目录 */
const DIST_DIR = join(PROJECT_ROOT, 'dist');
/** 源代码目录 */
const SRC_DIR = join(PROJECT_ROOT, 'src');
/** Tauri 配置目录 */
const TAURI_DIR = join(PROJECT_ROOT, 'src-tauri');
/** PWA 资源目录 */
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');

/** 失败计数器 */
let errors = 0;
/** 警告计数器 */
let warnings = 0;

/**
 * 记录通过项
 * @param {string} msg - 通过信息
 */
function pass(msg) {
  console.log(`  [PASS] ${msg}`);
}

/**
 * 记录失败项并递增错误计数
 * @param {string} msg - 失败信息
 */
function fail(msg) {
  errors += 1;
  console.error(`  [FAIL] ${msg}`);
}

/**
 * 记录警告项并递增警告计数
 * @param {string} msg - 警告信息
 */
function warn(msg) {
  warnings += 1;
  console.warn(`  [WARN] ${msg}`);
}

/**
 * 检查路径是否存在
 * @param {string} path - 文件/目录路径
 * @returns {Promise<boolean>}
 */
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 递归遍历目录，对匹配扩展名的文件执行回调
 * @param {string} dir - 目录路径
 * @param {string[]} exts - 扩展名数组
 * @param {Function} fn - 异步回调
 */
async function walkDir(dir, exts, fn) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDir(full, exts, fn);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      await fn(full);
    }
  }
}

/**
 * 统计目录下指定扩展名文件数
 * @param {string} dir - 目录路径
 * @param {string[]} exts - 扩展名数组
 * @returns {Promise<number>}
 */
async function countFiles(dir, exts) {
  let count = 0;
  await walkDir(dir, exts, () => {
    count += 1;
  });
  return count;
}

/**
 * 检查 1：内容完整性（content/ 下文档数 > 1900）
 */
async function checkContentCompleteness() {
  console.log('[Dimension 1: Content Completeness]');
  try {
    if (!(await fileExists(CONTENT_DIR))) {
      fail(`content/ 目录不存在: ${CONTENT_DIR}`);
      return;
    }
    const docCount = await countFiles(CONTENT_DIR, ['.md', '.mdx']);
    if (docCount > 1900) {
      pass(`content/ 下文档数: ${docCount}（> 1900）`);
    } else {
      warn(`content/ 下文档数: ${docCount}（预期 > 1900，可能正在扩充中）`);
    }
  } catch (err) {
    fail(`扫描 content/ 失败: ${err.message}`);
  }
}

/**
 * 检查 2：术语表完整性（glossary/ 下 27 个 glossary.md）
 */
async function checkGlossaryCompleteness() {
  console.log('[Dimension 2: Glossary Completeness]');
  try {
    if (!(await fileExists(GLOSSARY_DIR))) {
      fail(`glossary/ 目录不存在: ${GLOSSARY_DIR}`);
      return;
    }
    const entries = await readdir(GLOSSARY_DIR, { withFileTypes: true });
    const moduleDirs = entries.filter((e) => e.isDirectory());
    // 检查每个模块目录下是否有 glossary.md
    let validCount = 0;
    for (const dir of moduleDirs) {
      const glossaryFile = join(GLOSSARY_DIR, dir.name, 'glossary.md');
      if (await fileExists(glossaryFile)) {
        validCount += 1;
      }
    }
    if (validCount === 27) {
      pass(`glossary/ 下 ${validCount}/27 个 glossary.md 文件`);
    } else if (validCount >= 25) {
      warn(`glossary/ 下 ${validCount}/27 个 glossary.md 文件（部分缺失）`);
    } else {
      fail(`glossary/ 下仅 ${validCount}/27 个 glossary.md 文件（严重缺失）`);
    }
  } catch (err) {
    fail(`扫描 glossary/ 失败: ${err.message}`);
  }
}

/**
 * 检查 3：速查表完整性（cheatsheets/ 下 9 个 JSON）
 */
async function checkCheatsheetsCompleteness() {
  console.log('[Dimension 3: Cheatsheets Completeness]');
  try {
    if (!(await fileExists(CHEATSHEETS_DIR))) {
      fail(`cheatsheets/ 目录不存在: ${CHEATSHEETS_DIR}`);
      return;
    }
    const files = await readdir(CHEATSHEETS_DIR);
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    if (jsonFiles.length === 9) {
      pass(`cheatsheets/ 下 ${jsonFiles.length}/9 个 JSON 文件`);
    } else if (jsonFiles.length >= 8) {
      warn(`cheatsheets/ 下 ${jsonFiles.length}/9 个 JSON 文件（部分缺失）`);
    } else {
      fail(`cheatsheets/ 下仅 ${jsonFiles.length}/9 个 JSON 文件（严重缺失）`);
    }
  } catch (err) {
    fail(`扫描 cheatsheets/ 失败: ${err.message}`);
  }
}

/**
 * 检查 4：模块定义（modules.json 含 51 个模块）
 */
async function checkModulesDefinition() {
  console.log('[Dimension 4: Modules Definition]');
  try {
    if (!(await fileExists(MODULES_FILE))) {
      fail(`modules.json 不存在: ${MODULES_FILE}`);
      return;
    }
    const raw = await readFile(MODULES_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const moduleCount = Array.isArray(data.modules) ? data.modules.length : 0;
    if (moduleCount === 51) {
      pass(`modules.json 含 ${moduleCount}/51 个模块`);
    } else if (moduleCount >= 48) {
      warn(`modules.json 含 ${moduleCount}/51 个模块（部分缺失）`);
    } else {
      fail(`modules.json 仅含 ${moduleCount}/51 个模块（严重缺失）`);
    }
  } catch (err) {
    fail(`读取 modules.json 失败: ${err.message}`);
  }
}

/**
 * 检查 5：索引文件存在
 */
async function checkIndexFiles() {
  console.log('[Dimension 5: Index Files]');
  const expectedIndexes = [
    'glossary-index.json',
    'module-docs-index.json',
    'tag-index.json',
    'knowledge-graph.json',
  ];
  for (const name of expectedIndexes) {
    const filePath = join(DATA_DIR, name);
    if (await fileExists(filePath)) {
      pass(`索引存在: ${name}`);
    } else {
      warn(`索引缺失: ${name}（请先运行对应的构建脚本）`);
    }
  }
}

/**
 * 检查 6：构建产物（dist/ 存在且含 index.html）
 * 仅在 dist/ 存在时检查，缺失时仅警告不失败
 */
async function checkBuildArtifacts() {
  console.log('[Dimension 6: Build Artifacts]');
  if (!(await fileExists(DIST_DIR))) {
    warn(`dist/ 目录不存在（astro build 可能尚未执行）`);
    return;
  }
  const indexHtml = join(DIST_DIR, 'index.html');
  if (await fileExists(indexHtml)) {
    pass(`dist/index.html 存在`);
  } else {
    fail(`dist/index.html 缺失（构建可能失败）`);
  }
}

/**
 * 检查 7：无 Vue 残留（src/ 下不应包含 .vue 文件或 from 'vue' 导入）
 */
async function checkNoVueResidue() {
  console.log('[Dimension 7: No Vue Residue]');
  try {
    if (!(await fileExists(SRC_DIR))) {
      warn(`src/ 目录不存在: ${SRC_DIR}`);
      return;
    }
    /** @type {Array<{file: string, line: number, content: string}>} */
    const vueFiles = [];
    const vueImports = [];

    await walkDir(
      SRC_DIR,
      ['.vue', '.ts', '.tsx', '.js', '.jsx', '.astro', '.mjs'],
      async (full) => {
        const content = await readFile(full, 'utf-8');
        const lines = content.split('\n');

        if (full.endsWith('.vue')) {
          vueFiles.push({ file: full, line: 0, content: '.vue 文件' });
        }

        lines.forEach((line, i) => {
          // 检测 from 'vue' 或 from "vue" 导入
          if (/from\s+['"]vue['"]/.test(line)) {
            vueImports.push({ file: full, line: i + 1, content: line.trim() });
          }
          // 检测 .vue 文件导入
          if (/from\s+['"][^'"]*\.vue['"]/.test(line)) {
            vueImports.push({ file: full, line: i + 1, content: line.trim() });
          }
        });
      },
    );

    if (vueFiles.length === 0 && vueImports.length === 0) {
      pass(`src/ 下无 Vue 残留（无 .vue 文件、无 from 'vue' 导入）`);
    } else {
      if (vueFiles.length > 0) {
        fail(`发现 ${vueFiles.length} 个 .vue 文件（应全部移除）`);
        for (const v of vueFiles.slice(0, 5)) {
          console.error(`    ${v.file}`);
        }
      }
      if (vueImports.length > 0) {
        fail(`发现 ${vueImports.length} 处 Vue 导入（应全部替换为 React）`);
        for (const v of vueImports.slice(0, 5)) {
          console.error(`    ${v.file}:${v.line}: ${v.content}`);
        }
      }
    }
  } catch (err) {
    fail(`Vue 残留检查失败: ${err.message}`);
  }
}

/**
 * 检查 8：Tauri 配置
 */
async function checkTauriConfig() {
  console.log('[Dimension 8: Tauri Config]');
  const tauriConf = join(TAURI_DIR, 'tauri.conf.json');
  if (await fileExists(tauriConf)) {
    pass(`src-tauri/tauri.conf.json 存在`);
    // 验证 JSON 可解析
    try {
      const raw = await readFile(tauriConf, 'utf-8');
      JSON.parse(raw);
      pass(`tauri.conf.json 为合法 JSON`);
    } catch (err) {
      fail(`tauri.conf.json 解析失败: ${err.message}`);
    }
  } else {
    fail(`src-tauri/tauri.conf.json 不存在: ${tauriConf}`);
  }
}

/**
 * 检查 9：PWA 资源（manifest.json、sw.js、icons/）
 */
async function checkPwaAssets() {
  console.log('[Dimension 9: PWA Assets]');
  const manifestFile = join(PUBLIC_DIR, 'manifest.json');
  const swFile = join(PUBLIC_DIR, 'sw.js');
  const iconsDir = join(PUBLIC_DIR, 'icons');

  if (await fileExists(manifestFile)) {
    pass(`manifest.json 存在`);
  } else {
    fail(`manifest.json 不存在`);
  }

  if (await fileExists(swFile)) {
    pass(`sw.js 存在`);
  } else {
    warn(`sw.js 不存在（开发模式可忽略）`);
  }

  if (await fileExists(iconsDir)) {
    const icons = await readdir(iconsDir);
    const hasIcon192 = icons.some((f) => f.includes('192'));
    const hasIcon512 = icons.some((f) => f.includes('512'));
    if (hasIcon192 && hasIcon512) {
      pass(`icons/ 含 192 与 512 尺寸图标（共 ${icons.length} 个文件）`);
    } else {
      warn(`icons/ 缺少 192 或 512 尺寸图标（共 ${icons.length} 个文件）`);
    }
  } else {
    fail(`icons/ 目录不存在`);
  }
}

/**
 * 主函数：执行全部 QA 检查
 */
async function main() {
  console.log('\n+------------------------------------------+');
  console.log('|        FANDEX QA CHECK (Phase 11)        |');
  console.log('+------------------------------------------+\n');

  await checkContentCompleteness();
  await checkGlossaryCompleteness();
  await checkCheatsheetsCompleteness();
  await checkModulesDefinition();
  await checkIndexFiles();
  await checkBuildArtifacts();
  await checkNoVueResidue();
  await checkTauriConfig();
  await checkPwaAssets();

  console.log('\n+------------------------------------------+');
  console.log(`|  Results: ${errors} errors, ${warnings} warnings`);
  console.log('+------------------------------------------+\n');

  process.exit(errors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[qa-check] 未捕获异常:', err);
  process.exit(1);
});
