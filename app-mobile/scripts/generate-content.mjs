import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync, existsSync, rmSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname, '..', '..');
const ASSETS = join(__dirname, '..', 'assets');

const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
const METADATA_DIR = join(ROOT, 'shd-shared', 'metadata');
const SYNTAX_DIR = join(ROOT, 'app-web', 'public', 'syntax-data');
const SYNTAX_INDEX_SRC = join(ROOT, 'app-web', 'src', 'data', 'syntax-index.json');
const MERMAID_RUNTIME = join(ASSETS, 'mermaid', 'mermaid.min.js');
const ROOT_PKG = join(ROOT, 'package.json');

function ensureDir(dir) {
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

function copyFile(src, dest) {
    ensureDir(dirname(dest));
    copyFileSync(src, dest);
    console.log(`  [copy] ${relative(ROOT, dest)}`);
}

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

function generateVersionJson() {
    console.log('\n[1/7] 生成 version.json...');
    let version = '0.0.0';
    try {
        const pkg = JSON.parse(readFileSync(ROOT_PKG, 'utf-8'));
        version = pkg.version || version;
    } catch {
        console.log('  [warn] 根 package.json 缺失，使用默认版本');
    }
    const dest = join(ASSETS, 'version.json');
    writeFileSync(dest, JSON.stringify({ version, generatedAt: new Date().toISOString() }), 'utf-8');
    console.log(`  [gen] version.json (${version})`);
}

function generateDocIndex() {
    console.log('\n[3/7] 生成 doc-index.json...');
    const docs = [];
    const mdFiles = walkDir(CONTENT_DIR, '.md');

    for (const filePath of mdFiles) {
        const content = readFileSync(filePath, 'utf-8');
        const fm = parseFrontmatter(content);
        if (!fm) continue;

        const relPath = relative(CONTENT_DIR, filePath);
        const pathParts = relPath.split(/[/\\]/);

        const moduleDir = pathParts[0];
        const moduleId = moduleDir.replace(/^\d+-/, '');

        const fileName = pathParts[pathParts.length - 1];
        const docSlug = fileName.replace(/\.md$/, '');

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

    docs.sort((a, b) => {
        if (a.module !== b.module) return a.module.localeCompare(b.module);
        return a.order - b.order;
    });

    const destPath = join(ASSETS, 'metadata', 'doc-index.json');
    ensureDir(dirname(destPath));
    writeFileSync(destPath, JSON.stringify(docs), 'utf-8');
    console.log(`  [gen] doc-index.json (${docs.length} docs)`);
}

function verifyMermaidRuntime() {
    console.log('\n[6/7] 校验 mermaid 离线运行时...');
    if (!existsSync(MERMAID_RUNTIME)) {
        console.error('  [error] assets/mermaid/mermaid.min.js 缺失（随仓库提交的 vendored 文件），mermaid 图将无法渲染');
        process.exit(1);
    }
    console.log('  [ok] assets/mermaid/mermaid.min.js 存在');
}

function copyDocs() {
    console.log('\n[7/7] 复制文档内容...');
    const mdFiles = walkDir(CONTENT_DIR, '.md');
    const validIds = new Set(
        readdirSync(CONTENT_DIR)
            .filter(e => statSync(join(CONTENT_DIR, e)).isDirectory())
            .map(e => e.replace(/^\d+-/, ''))
    );
    const docsRoot = join(ASSETS, 'docs');
    if (existsSync(docsRoot)) {
        for (const entry of readdirSync(docsRoot)) {
            if (!validIds.has(entry)) {
                rmSync(join(docsRoot, entry), { recursive: true });
                console.log('  [clean] docs/' + entry);
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

        if (fileName.includes('MERGED')) continue;

        const dest = join(docsRoot, moduleId, fileName);
        const normalized = readFileSync(filePath, 'utf-8')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        ensureDir(dirname(dest));
        writeFileSync(dest, normalized, 'utf-8');
        count++;
    }

    console.log(`  [done] ${count} docs`);
    rewritePubspecAssetBlock([...validIds].sort());
}

// Flutter 目录资产只展开一层：docs 顶层全是模块子目录，必须逐目录显式登记。
// pubspec 中以 BEGIN/END content-assets 标记块维护，由本脚本自动重写。
function rewritePubspecAssetBlock(moduleIds) {
    const pubspecPath = join(__dirname, '..', 'pubspec.yaml');
    const raw = readFileSync(pubspecPath, 'utf-8');
    const begin = raw.indexOf('    # BEGIN content-assets');
    const end = raw.indexOf('    # END content-assets');
    if (begin < 0 || end < 0) {
        console.log('  [warn] pubspec.yaml 缺少 content-assets 标记块，跳过资产登记');
        return;
    }
    const lines = moduleIds.map(id => `    - assets/docs/${id}/`);
    const next = raw.slice(0, begin) + '    # BEGIN content-assets (generate-content.mjs 维护，勿手改)\n' +
        (lines.length ? lines.join('\n') + '\n' : '') +
        raw.slice(end);
    writeFileSync(pubspecPath, next, 'utf-8');
    console.log(`  [gen] pubspec content-assets 登记 ${moduleIds.length} 个模块目录`);
}

function main() {
    console.log('=== FANDEX Mobile (Flutter) 内容生成 ===');
    console.log(`assets 目录: ${ASSETS}`);

    ensureDir(ASSETS);
    ensureDir(join(ASSETS, 'metadata'));
    ensureDir(join(ASSETS, 'metadata', 'learning-path'));
    ensureDir(join(ASSETS, 'syntax-data'));
    ensureDir(join(ASSETS, 'docs'));

    generateVersionJson();

    console.log('\n[2/7] 复制 modules.json...');
    copyFile(join(METADATA_DIR, 'modules.json'), join(ASSETS, 'metadata', 'modules.json'));

    generateDocIndex();

    console.log('\n[4/7] 复制学习路径数据...');
    const lpDir = join(METADATA_DIR, 'learning-path');
    if (existsSync(lpDir)) {
        const files = readdirSync(lpDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            copyFile(join(lpDir, file), join(ASSETS, 'metadata', 'learning-path', file));
        }
    } else {
        console.log('  [skip] learning-path 目录不存在');
    }

    console.log('\n[5/7] 复制语法速查数据...');
    if (existsSync(SYNTAX_INDEX_SRC)) {
        copyFile(SYNTAX_INDEX_SRC, join(ASSETS, 'metadata', 'syntax-index.json'));
    }
    if (existsSync(SYNTAX_DIR)) {
        const files = readdirSync(SYNTAX_DIR).filter(f => f.endsWith('.json'));
        for (const file of files) {
            copyFile(join(SYNTAX_DIR, file), join(ASSETS, 'syntax-data', file));
        }
    }

    verifyMermaidRuntime();
    copyDocs();

    console.log('\n=== 内容生成完成 ===');
}

main();
