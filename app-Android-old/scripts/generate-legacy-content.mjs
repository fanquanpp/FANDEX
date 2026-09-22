
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROOT = join(__dirname, '..', '..');
const DIST_MOBILE = join(ROOT, 'app-Android-old', 'app', 'src', 'main', 'assets', 'dist-mobile');

const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
const MODULES_META = join(ROOT, 'shd-shared', 'metadata', 'modules.json');

function readDoc(filePath, moduleId, fileName) {
    const slug = fileName.replace(/\.md$/, '');
    if (slug.includes('MERGED')) return null;

    const content = readFileSync(filePath, 'utf-8');
    const fmRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const fmMatch = content.match(fmRegex);

    let body = content;
    const fm = {};
    if (fmMatch !== null) {
        body = content.slice(fmMatch[0].length);
        for (const line of fmMatch[1].split('\n')) {
            const trimmed = line.trim();
            const colonIdx = trimmed.indexOf(':');
            if (colonIdx <= 0) continue;
            const key = trimmed.substring(0, colonIdx).trim();
            const value = trimmed.substring(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            if (key === 'related' || key === 'prerequisites') continue;
            if (value !== '') fm[key] = value;
        }
    }

    body = body.replace(/^\s*\n/, '');

    return {
        slug,
        module: fm.module || moduleId,
        title: fm.title || slug,
        category: fm.category || '',
        difficulty: fm.difficulty || 'beginner',
        description: fm.description || '',
        order: parseInt(fm.order, 10) || 0,
        body
    };
}

function main() {
    console.log('=== FANDEX 旧版 App 内容生成 ===');
    console.log(`输出目录: ${DIST_MOBILE}`);
    console.log(`内容源: ${CONTENT_DIR}`);

    const meta = JSON.parse(readFileSync(MODULES_META, 'utf-8'));

    const docsDir = join(DIST_MOBILE, 'docs');
    rmSync(docsDir, { recursive: true, force: true });
    mkdirSync(docsDir, { recursive: true });

    const modules = [];
    const moduleOrders = [];
    const documents = [];
    let docCount = 0;

    for (const mod of meta.modules) {
        const moduleDir = join(CONTENT_DIR, mod.id);
        const srcDir = existsSync(moduleDir)
            ? moduleDir
            : join(CONTENT_DIR, mod.folder_order ? `${String(mod.folder_order).padStart(3, '0')}-${mod.id}` : mod.id);

        if (!existsSync(srcDir)) {
            console.log(`  [警告] 模块目录缺失，跳过: ${mod.id}`);
            continue;
        }

        const slugs = [];
        const orderBySlug = {};
        for (const fileName of readdirSync(srcDir).sort()) {
            if (!fileName.endsWith('.md')) continue;
            const doc = readDoc(join(srcDir, fileName), mod.id, fileName);
            if (!doc) continue;

            const destDir = join(docsDir, mod.id);
            if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
            writeFileSync(join(destDir, `${doc.slug}.md`), doc.body, 'utf-8');

            slugs.push(doc.slug);
            orderBySlug[doc.slug] = doc.order;
            documents.push({
                slug: doc.slug,
                title: doc.title,
                module: mod.id,
                category: doc.category,
                difficulty: doc.difficulty,
                description: doc.description
            });
            docCount++;
        }

        modules.push({
            id: mod.id,
            title: mod.title,
            category: (mod.categories && mod.categories[0]) || '',
            description: mod.description || '',
            documents: slugs
        });
        moduleOrders.push(orderBySlug);
    }

    modules.forEach((m, i) => {
        const orders = moduleOrders[i];
        m.documents.sort((a, b) => (orders[a] || 0) - (orders[b] || 0));
    });

    const usedCategories = new Set(modules.map(m => m.category));
    const index = {
        version: meta.version || '',
        generatedAt: new Date().toISOString().slice(0, 10),
        categories: meta.categoryOrder
            .filter(id => usedCategories.has(id))
            .map(id => ({
            id,
            label: meta.categoryLabels[id] || id,
            color: meta.categoryColors[id] || '#4f5bd5'
        })),
        modules,
        documents
    };

    writeFileSync(join(DIST_MOBILE, 'index.json'), JSON.stringify(index, null, 4), 'utf-8');

    console.log(`  [完成] ${modules.length} 个模块 / ${docCount} 篇文档`);
    console.log(`  [生成] ${relative(ROOT, join(DIST_MOBILE, 'index.json'))}`);
    console.log('=== 生成结束 ===');
}

main();
