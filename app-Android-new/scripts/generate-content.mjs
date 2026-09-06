/**
 * FANDEX Android 内容生成脚本
 *
 * 从 cnt-content/full 与 shd-shared/metadata 生成 Android assets 资源
 *
 * 用法: node scripts/generate-content.mjs
 *
 * 生成内容:
 * 1. assets/metadata/modules.json (从 shd-shared/metadata 复制)
 * 2. assets/metadata/doc-index.json (从 cnt-content/full 解析 frontmatter)
 * 3. assets/metadata/learning-path/*.json (从 shd-shared/metadata 复制)
 * 4. assets/metadata/syntax-index.json (从 app-web/src/data 复制，语言元数据与统计)
 * 5. assets/syntax-data/*.json (从 app-web/public/syntax-data 复制)
 * 6. assets/docs/{moduleId}/{docSlug}.md (从 cnt-content/full 复制)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync, rmSync } from 'fs';
import { join, basename, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 项目根目录（从 app-Android-new/scripts 上两级到 FANDEX 根目录）
const ROOT = join(__dirname, '..', '..');
const ANDROID_ASSETS = join(ROOT, 'app-Android-new', 'app', 'src', 'main', 'assets');

// 内容源
const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
const METADATA_DIR = join(ROOT, 'shd-shared', 'metadata');
const SYNTAX_DIR = join(ROOT, 'app-web', 'public', 'syntax-data');
// web 端预构建的语法语言索引（语言元数据、卡片数统计）
const SYNTAX_INDEX_SRC = join(ROOT, 'app-web', 'src', 'data', 'syntax-index.json');

/**
 * 确保目录存在
 */
function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
    console.log(`  [复制] ${relative(ROOT, dest)}`);
}

/**
 * 递归获取目录下所有文件
 */
function walkDir(dir, ext = '.md') {
    const results = [];
    if (!existsSync(dir)) return results;

    const entries = readdirSync(dir);
    for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
            results.push(...walkDir(fullPath, ext));
        } else if (entry.endsWith(ext)) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * 解析 Markdown frontmatter
 */
function parseFrontmatter(content) {
    const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(fmRegex);
    if (!match) return null;

    const yaml = match[1];
    const lines = yaml.split('\n');
    const fm = {};

    let currentList = null;
    let currentListKey = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (currentList && trimmed.startsWith('- ')) {
            const value = trimmed.replace(/^- /, '').trim().replace(/^['"]|['"]$/g, '');
            fm[currentListKey].push(value);
            continue;
        }

        currentList = null;

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx <= 0) continue;

        const key = trimmed.substring(0, colonIdx).trim();
        const value = trimmed.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');

        if (value === '' && (key === 'related' || key === 'prerequisites')) {
            fm[key] = [];
            currentList = fm[key];
            currentListKey = key;
        } else {
            fm[key] = value;
        }
    }

    return fm;
}

/**
 * 步骤 2: 生成 doc-index.json
 */
function generateDocIndex() {
    console.log('\n[2/6] 生成 doc-index.json...');
    const docs = [];
    const mdFiles = walkDir(CONTENT_DIR, '.md');

    for (const filePath of mdFiles) {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm) continue;

        // 获取相对于 content 目录的路径
        const relPath = relative(CONTENT_DIR, filePath);
        const pathParts = relPath.split(/[/\\]/);

        // 模块 ID 来自目录名（去掉前缀编号）
        const moduleDir = pathParts[0];
        const moduleId = moduleDir.replace(/^\d+-/, '');

        // 文档 slug 来自文件名（去掉 .md 后缀）
        const fileName = pathParts[pathParts.length - 1];
        const docSlug = fileName.replace(/\.md$/, '');

        // 跳过 MERGED 文件
        if (docSlug.includes('MERGED')) continue;

        docs.push({
            slug: docSlug,
            title: fm.title || docSlug,
            module: fm.module || moduleId,
            category: fm.category || '',
            difficulty: fm.difficulty || 'beginner',
            description: fm.description || '',
            order: parseInt(fm.order) || 0,
            updated: fm.updated || ''
        });
    }

    // 排序
    docs.sort((a, b) => {
        if (a.module !== b.module) return a.module.localeCompare(b.module);
        return a.order - b.order;
    });

    const destPath = join(ANDROID_ASSETS, 'metadata', 'doc-index.json');
    ensureDir(dirname(destPath));
    writeFileSync(destPath, JSON.stringify(docs, null, 0), 'utf-8');
    console.log(`  [生成] doc-index.json (${docs.length} 篇文档)`);
}

/**
 * 步骤 3: 复制学习路径数据
 */
function copyLearningPaths() {
    const srcDir = join(METADATA_DIR, 'learning-path');
    if (!existsSync(srcDir)) {
        console.log('  [跳过] learning-path 目录不存在');
        return;
    }

    const files = readdirSync(srcDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const src = join(srcDir, file);
        const dest = join(ANDROID_ASSETS, 'metadata', 'learning-path', file);
        copyFile(src, dest);
    }
}

/**
 * 步骤 4: 复制语法速查数据
 */
function copySyntaxData() {
    console.log('\n[4/6] 复制语法语言索引...');
    if (existsSync(SYNTAX_INDEX_SRC)) {
        copyFile(SYNTAX_INDEX_SRC, join(ANDROID_ASSETS, 'metadata', 'syntax-index.json'));
    } else {
        console.log('  [跳过] syntax-index.json 不存在');
    }

    console.log('[5/6] 复制语法速查数据...');
    if (!existsSync(SYNTAX_DIR)) {
        console.log('  [跳过] syntax-data 目录不存在');
        return;
    }

    const files = readdirSync(SYNTAX_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const src = join(SYNTAX_DIR, file);
        const dest = join(ANDROID_ASSETS, 'syntax-data', file);
        copyFile(src, dest);
    }
}

/**
 * 步骤 6: 复制文档内容
 */
function copyDocs() {
    console.log('\n[6/6] 复制文档内容...');
    const mdFiles = walkDir(CONTENT_DIR, '.md');
    // 清理 assets/docs 下已不在内容源中的残留模块目录，保证生成幂等
    const validIds = new Set(
        readdirSync(CONTENT_DIR)
            .filter(e => statSync(join(CONTENT_DIR, e)).isDirectory())
            .map(e => e.replace(/^d+-/, ''))
    );
    const docsRoot = join(ANDROID_ASSETS, 'docs');
    if (existsSync(docsRoot)) {
        for (const entry of readdirSync(docsRoot)) {
            if (!validIds.has(entry)) {
                rmSync(join(docsRoot, entry), { recursive: true });
                console.log('  [清理] docs/' + entry);
            }
        }
    }
    let count = 0;

    for (const filePath of mdFiles) {
        const relPath = relative(CONTENT_DIR, filePath);
        const pathParts = relPath.split(/[/\\]/);

        const moduleDir = pathParts[0];
        const moduleId = moduleDir.replace(/^\d+-/, '');
        const fileName = pathParts[pathParts.length - 1];

        // 跳过 MERGED 文件
        if (fileName.includes('MERGED')) continue;

        const dest = join(ANDROID_ASSETS, 'docs', moduleId, fileName);
        // 行尾归一化为 LF：内容源在 Windows 编辑器间流转会产生 CRLF，
        // Android 端 frontmatter 围栏正则对 CRLF 敏感（ICU 引擎对
        // "\s*\n" 与 JVM 行为不一致），统一输出 LF 保证三端解析一致
        const normalized = readFileSync(filePath, 'utf-8')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        ensureDir(dirname(dest));
        writeFileSync(dest, normalized, 'utf-8');
        count++;
    }

    console.log(`  [完成] 复制 ${count} 篇文档`);
}

/**
 * 主流程
 */
function main() {
    console.log('=== FANDEX Android 内容生成 ===');
    console.log(`Android assets 目录: ${ANDROID_ASSETS}`);
    console.log(`内容源目录: ${CONTENT_DIR}`);

    ensureDir(ANDROID_ASSETS);
    ensureDir(join(ANDROID_ASSETS, 'metadata'));
    ensureDir(join(ANDROID_ASSETS, 'metadata', 'learning-path'));
    ensureDir(join(ANDROID_ASSETS, 'syntax-data'));
    ensureDir(join(ANDROID_ASSETS, 'docs'));

    console.log('\n[1/6] 复制 modules.json...');
    copyFile(join(METADATA_DIR, 'modules.json'), join(ANDROID_ASSETS, 'metadata', 'modules.json'));
    generateDocIndex();
    console.log('\n[3/6] 复制学习路径数据...');
    copyLearningPaths();
    copySyntaxData();
    copyDocs();

    console.log('\n=== 内容生成完成 ===');
}

main();
