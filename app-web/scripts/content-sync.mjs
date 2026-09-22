
import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
const MODULES_JSON = join(ROOT, 'shd-shared', 'metadata', 'modules.json');
const LEARNING_PATH_DIR = join(ROOT, 'shd-shared', 'metadata', 'learning-path');

const CHECK_MODE = process.argv.includes('--check');

const FOLDER_RE = /^(\d{1,3})-([a-z][a-z0-9-]*)$/;
const BARE_FOLDER_RE = /^([a-z][a-z0-9-]*)$/;
const DOC_PREFIX_RE = /^(\d{1,3})-/;

const STANDARD_FIELDS = [
  'order', 'title', 'module', 'category', 'difficulty',
  'description', 'author', 'updated', 'related', 'prerequisites',
];

const BANNED_FIELDS = [
  'tags', 'created', 'quiz', 'references', 'etymology',
  'estimatedReadingTime', 'lastReviewed', 'reviewer', 'readingTime', 'keywords',
  'slug', 'lang', 'layout', 'date',
];

const REF_RE = /^[a-z0-9-]+\/[A-Za-z0-9_-]+$/;

const MODULE_ALIASES = {
  network: 'networking',
  math: 'cs-fundamentals',
  'getting-started': 'cs-fundamentals',
};

const DEFAULT_CATEGORY_LABELS = {
  tools: '工具链', frontend: '前端技术', backend: '后端技术', database: '数据库',
  cs: '计算机科学', math: '数学', cloud: '云与基础设施',
};

const report = {
  foldersRenamed: [],
  modulesRegistered: [],
  modulesRemoved: [],
  moduleInfoGenerated: [],
  learningPathAdded: [],
  docsTouched: 0,
  fieldChanges: {},   // 字段名 -> 变更文档数
  deadRefsRemoved: 0,
  bannedRemoved: 0,
  orderReshuffled: 0,
  unparseableLists: [], // 解析失败的行内列表（file#key），已跳过改写待人工处理
};

function noteChange(field) {
  report.fieldChanges[field] = (report.fieldChanges[field] || 0) + 1;
}

function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseScalar(v) {
  const t = String(v ?? '').trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

function dumpScalar(v) {
  const t = String(v);
  if (t === '' || /[:#[]{}&*!|>'"%@`,]/.test(t)) return `'${t.replace(/'/g, "''")}'`;
  return t;
}

function loadGitDates() {
  const map = new Map();
  try {
    const out = execFileSync('git', ['log', '--pretty=format:@%cs', '--name-only'], {
      cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024,
    });
    let currentDate = null;
    for (const line of out.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('@')) { currentDate = t.slice(1); continue; }
      if (currentDate && !map.has(t)) map.set(t, currentDate);
    }
  } catch {
    // 非 git 环境（如 CI 浅克隆异常）时降级为空表，updated 将取文件手写值或今天
  }
  return map;
}

function parseFmEntries(lines) {
  const entries = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const keyMatch = line.match(/^([A-Za-z][A-Za-z0-9_]*):(.*)$/);
    if (keyMatch && !/^\s/.test(line)) {
      if (current) current.endIdx = i;
      current = { key: keyMatch[1], lineIdx: i, endIdx: lines.length };
      entries.push(current);
    }
    // 列表项 / 续行都归属当前键
  }
  return entries;
}

function getScalarLine(lines, entries, key) {
  const e = entries.find((x) => x.key === key);
  if (!e) return undefined;
  const m = lines[e.lineIdx].match(/^[A-Za-z][A-Za-z0-9_]*:(.*)$/);
  const v = m ? m[1].trim() : '';
  return v === '' ? undefined : v;
}

function getListItems(lines, entries, key) {
  const e = entries.find((x) => x.key === key);
  if (!e) return undefined;
  const inline = lines[e.lineIdx].match(/^[A-Za-z][A-Za-z0-9_]*:(.*)$/);
  if (inline && inline[1].trim()) {
    const inner = inline[1].trim();
    if (inner.startsWith('[')) {
      try { return JSON.parse(inner.replace(/'/g, '"')); } catch { return null; }
    }
    return null;
  }
  const items = [];
  for (let i = e.lineIdx + 1; i < e.endIdx; i++) {
    const m = lines[i].match(/^\s*-\s*(.+)$/);
    if (m) items.push(parseScalar(m[1]));
  }
  return items;
}

function applyFrontmatter(raw, patch, relPath = '') {
  const eol = detectEol(raw);
  const hasFm = /^\uFEFF?---\r?\n/.test(raw);
  let head;
  let before;
  let body;
  if (hasFm) {
    const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
    const afterBom = bom ? raw.slice(1) : raw;
    const endMatch = afterBom.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!endMatch) {
      return { text: buildFreshFrontmatter(patch, raw, eol), changed: true };
    }
    before = bom + '---' + eol;
    head = endMatch[1].split(/\r?\n/);
    body = afterBom.slice(endMatch[0].length);
    if (!body.startsWith(eol) && body.length > 0) body = eol + body;
  } else {
    return { text: buildFreshFrontmatter(patch, raw, eol), changed: true };
  }

  let entries = parseFmEntries(head);
  let entryKeys = entries.map((x) => x.key);
  let changed = false;

  for (;;) {
    const banned = entryKeys.find((k) => BANNED_FIELDS.includes(k));
    if (banned) {
      const e = entries.find((x) => x.key === banned);
      head.splice(e.lineIdx, e.endIdx - e.lineIdx);
      changed = true;
      report.bannedRemoved++;
      entries = parseFmEntries(head);
      entryKeys = entries.map((x) => x.key);
      continue;
    }
    const seen = new Map();
    let dup = null;
    for (const e of entries) {
      if (seen.has(e.key)) { dup = e; break; }
      seen.set(e.key, e);
    }
    if (dup) {
      const first = seen.get(dup.key);
      head[first.lineIdx] = head[dup.lineIdx];
      head.splice(dup.lineIdx, dup.endIdx - dup.lineIdx);
      changed = true;
      noteChange('dedupe:' + dup.key);
      entries = parseFmEntries(head);
      entryKeys = entries.map((x) => x.key);
      continue;
    }
    break;
  }

  const hasKey = (k) => entryKeys.includes(k);

  const setScalar = (key, value, forceQuote = false) => {
    const e = entries.find((x) => x.key === key);
    if (!e) return;
    const lineRe = new RegExp(`^(${key}:)(.*)$`);
    const old = head[e.lineIdx];
    const next = old.replace(lineRe, `$1 ${forceQuote ? `'${value}'` : dumpScalar(value)}`);
    if (old !== next) { head[e.lineIdx] = next; changed = true; noteChange(key); }
  };

  const moduleLine = getScalarLine(head, entries, 'module');
  if (moduleLine === undefined || parseScalar(moduleLine) !== patch.module) {
    if (hasKey('module')) setScalar('module', `'${patch.module}'`);
    else { insertKey(head, entries, 'module', `'${patch.module}'`); changed = true; noteChange('module'); }
  }
  const catLine = getScalarLine(head, entries, 'category');
  if (catLine === undefined || parseScalar(catLine) !== patch.category) {
    if (hasKey('category')) setScalar('category', patch.category);
    else { insertKey(head, entries, 'category', dumpScalar(patch.category)); changed = true; noteChange('category'); }
  }
  const diffLine = getScalarLine(head, entries, 'difficulty');
  if (diffLine === undefined || !['beginner', 'intermediate', 'advanced'].includes(parseScalar(diffLine))) {
    if (hasKey('difficulty')) setScalar('difficulty', patch.difficulty);
    else { insertKey(head, entries, 'difficulty', dumpScalar(patch.difficulty)); changed = true; noteChange('difficulty'); }
  }
  const authorLine = getScalarLine(head, entries, 'author');
  if (authorLine === undefined || parseScalar(authorLine) === '') {
    if (hasKey('author')) setScalar('author', patch.author);
    else { insertKey(head, entries, 'author', dumpScalar(patch.author)); changed = true; noteChange('author'); }
  }
  const updLine = getScalarLine(head, entries, 'updated');
  const handValue = updLine === undefined ? '' : parseScalar(updLine);
  if (/^\d{4}-\d{2}-\d{2}$/.test(handValue) && handValue > patch.updated) {
    if (handValue !== patch.updated) { /* 保留手写未来/更正日期，静默 */ }
  } else {
    if (hasKey('updated')) setScalar('updated', patch.updated, true);
    else { insertKey(head, entries, 'updated', `'${patch.updated}'`); changed = true; noteChange('updated'); }
  }
  const titleLine = getScalarLine(head, entries, 'title');
  if (titleLine === undefined || parseScalar(titleLine) === '') {
    if (hasKey('title')) setScalar('title', patch.title);
    else { insertKey(head, entries, 'title', dumpScalar(patch.title)); changed = true; noteChange('title'); }
  }
  const ordLine = getScalarLine(head, entries, 'order');
  const ordValue = ordLine === undefined ? null : Number.parseInt(parseScalar(ordLine), 10);
  if (ordValue !== patch.order) {
    if (hasKey('order')) setScalar('order', String(patch.order));
    else { insertKey(head, entries, 'order', String(patch.order)); changed = true; }
    report.orderReshuffled++;
  }

  for (const key of ['related', 'prerequisites']) {
    const items = getListItems(head, entries, key);
    if (items === null) {
      report.unparseableLists.push(`${relPath}#${key}`);
      continue;
    }
    if (items === undefined) {
      insertKey(head, entries, key, '[]');
      changed = true;
      continue;
    }
    const cleaned = items
      .map((s) => {
        const t = String(s).trim();
        const modPart = t.split('/')[0];
        return MODULE_ALIASES[modPart] ? t.replace(/^[^/]+/, MODULE_ALIASES[modPart]) : t;
      })
      .filter((t) => {
        if (!REF_RE.test(t)) { if (t) { report.deadRefsRemoved++; } return false; }
        if (!refExists(t)) { report.deadRefsRemoved++; return false; }
        return true;
      });
    const before_ = JSON.stringify(items);
    const after_ = JSON.stringify(cleaned);
    if (before_ !== after_) {
      rewriteList(head, entries, key, cleaned);
      changed = true;
    }
  }

  if (!changed) return { text: raw, changed: false };
  const text = before + head.join(eol) + eol + '---' + eol + body;
  return { text, changed: true };
}

function insertKey(head, entries, key, valueText) {
  const stdIdx = STANDARD_FIELDS.indexOf(key);
  let insertAt = head.length;
  for (let s = stdIdx + 1; s < STANDARD_FIELDS.length; s++) {
    const e = entries.find((x) => x.key === STANDARD_FIELDS[s]);
    if (e) { insertAt = e.lineIdx; break; }
  }
  head.splice(insertAt, 0, `${key}: ${valueText}`);
  entries.length = 0;
  entries.push(...parseFmEntries(head));
}

function rewriteList(head, entries, key, items) {
  const e = entries.find((x) => x.key === key);
  const sliceCount = e.endIdx - e.lineIdx;
  let replacement;
  if (items.length === 0) {
    replacement = [`${key}: []`];
  } else {
    replacement = [`${key}:`];
    for (const it of items) replacement.push(`  - '${String(it).replace(/'/g, "''")}'`);
  }
  head.splice(e.lineIdx, sliceCount, ...replacement);
  entries.length = 0;
  entries.push(...parseFmEntries(head));
}

function buildFreshFrontmatter(patch, raw, eol) {
  const body = /^\uFEFF?---[\s\S]*?---\r?\n?/.test(raw)
    ? raw.replace(/^\uFEFF?---[\s\S]*?---\r?\n?/, '')
    : raw;
  const lines = [
    '---',
    `order: ${patch.order}`,
    `title: ${dumpScalar(patch.title)}`,
    `module: '${patch.module}'`,
    `category: ${dumpScalar(patch.category)}`,
    `difficulty: ${patch.difficulty}`,
    `author: ${patch.author}`,
    `updated: '${patch.updated}'`,
    `related: []`,
    `prerequisites: []`,
    '---',
    '',
  ];
  noteChange('frontmatter');
  return lines.join(eol) + body;
}

function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function normalizeFolders() {
  const names = readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
    .map((d) => d.name);

  const usedNums = new Set();
  for (const name of names) {
    const m = name.match(FOLDER_RE);
    if (m) usedNums.add(Number(m[1]));
  }
  let nextNum = usedNums.size ? Math.max(...usedNums) + 1 : 1;

  const folders = [];
  for (const name of names) {
    let m = name.match(FOLDER_RE);
    if (m) {
      folders.push({ num: Number(m[1]), id: m[2], dir: join(CONTENT_DIR, name) });
      continue;
    }
    m = name.match(BARE_FOLDER_RE);
    if (m) {
      let n = nextNum++;
      while (usedNums.has(n)) n = nextNum++;
      usedNums.add(n);
      const newName = `${String(n).padStart(3, '0')}-${m[1]}`;
      if (!CHECK_MODE) renameSync(join(CONTENT_DIR, name), join(CONTENT_DIR, newName));
      report.foldersRenamed.push(`${name} -> ${newName}`);
      folders.push({ num: n, id: m[1], dir: join(CONTENT_DIR, CHECK_MODE ? name : newName) });
      continue;
    }
    console.warn(`[warn] 无法识别的文件夹命名（已跳过）: ${name}`);
  }
  folders.sort((a, b) => a.num - b.num);
  return folders;
}

function collectModuleDecls(folders, oldModules) {
  const decls = [];
  const oldById = new Map((oldModules?.modules ?? []).map((m) => [m.id, m]));
  const oldPrereq = oldModules?.modulePrerequisites ?? {};

  for (const folder of folders) {
    const infoPath = join(folder.dir, 'module.json');
    let decl = readJson(infoPath);
    if (decl) {
      decl._generated = false;
    } else {
      const old = oldById.get(folder.id);
      if (old) {
        decl = {
          title: old.title,
          icon: old.icon,
          description: old.description,
          categories: old.categories,
          prerequisites: oldPrereq[folder.id] ?? [],
        };
        if (old.officialDocs?.length) decl.officialDocs = old.officialDocs;
        if (old.updatePriority) decl.updatePriority = true;
        if (old.updateNote) decl.updateNote = old.updateNote;
        decl._generated = true;
        report.moduleInfoGenerated.push(folder.id);
      } else {
        decl = {
          title: folder.id,
          icon: folder.id.slice(0, 2).toUpperCase(),
          description: folder.id,
          categories: ['tools'],
          prerequisites: [],
          _generated: true,
        };
        report.moduleInfoGenerated.push(`${folder.id}（新模块骨架，请补写 module.json）`);
      }
      if (!CHECK_MODE) {
        const { _generated, ...persist } = decl;
        writeFileSync(infoPath, JSON.stringify(persist, null, 2) + '\n', 'utf-8');
      }
    }
    if (decl.id && decl.id !== folder.id) {
      throw new Error(`module.json 的 id（${decl.id}）与文件夹 id（${folder.id}）不一致: ${folder.dir}`);
    }
    decl.id = folder.id;
    if (!Array.isArray(decl.categories) || decl.categories.length === 0) decl.categories = ['tools'];
    if (!Array.isArray(decl.prerequisites)) decl.prerequisites = [];
    decls.push(decl);
  }
  return decls;
}

function rebuildModulesJson(decls) {
  const current = readJson(MODULES_JSON) ?? {};
  const labels = current.categoryLabels ?? DEFAULT_CATEGORY_LABELS;

  const modules = decls.map((d) => {
    const mod = {
      id: d.id,
      title: d.title ?? d.id,
      icon: d.icon ?? d.id.slice(0, 2).toUpperCase(),
      description: d.description ?? d.title ?? d.id,
      categories: d.categories,
      folder_order: d._num,
    };
    if (d.officialDocs?.length) mod.officialDocs = d.officialDocs;
    if (d.updatePriority) mod.updatePriority = true;
    if (d.updateNote) mod.updateNote = d.updateNote;
    return mod;
  });

  const modulePrerequisites = {};
  for (const d of decls) {
    if (d.prerequisites.length) modulePrerequisites[d.id] = d.prerequisites;
  }

  const next = {
    version: current.version ?? '4.3.0',
    categoryLabels: labels,
    categoryColors: current.categoryColors ?? {},
    categoryOrder: current.categoryOrder ?? Object.keys(labels),
    modules,
    modulePrerequisites,
  };

  const oldText = existsSync(MODULES_JSON) ? readFileSync(MODULES_JSON, 'utf-8') : '';
  const newText = JSON.stringify(next, null, 2) + '\n';
  const changed = normalizeJsonForCompare(oldText) !== normalizeJsonForCompare(newText);
  const oldIds = new Set((current.modules ?? []).map((m) => m.id));
  for (const m of modules) if (!oldIds.has(m.id)) report.modulesRegistered.push(m.id);
  for (const id of oldIds) if (!modules.some((m) => m.id === id)) report.modulesRemoved.push(id);
  if (changed && !CHECK_MODE) writeFileSync(MODULES_JSON, newText, 'utf-8');
  return { changed, data: next };
}

function normalizeJsonForCompare(text) {
  return text.replace(/\r\n/g, '\n');
}

function syncLearningPath(modulesData) {
  const indexPath = join(LEARNING_PATH_DIR, 'index.json');
  const index = readJson(indexPath) ?? { version: '1.1.0', order: [] };
  const order = Array.isArray(index.order) ? [...index.order] : [];
  const known = new Set(order);
  for (const mod of modulesData.modules) {
    if (!known.has(mod.id)) {
      order.push(mod.id);
      known.add(mod.id);
      report.learningPathAdded.push(mod.id);
    }
  }
  const validIds = new Set(modulesData.modules.map((m) => m.id));
  const nextOrder = order.filter((id) => validIds.has(id));
  if (nextOrder.join() !== order.join() || JSON.stringify(index.order) !== JSON.stringify(nextOrder)) {
    index.order = nextOrder;
    if (!CHECK_MODE) writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  }

  for (const mod of modulesData.modules) {
    const mapPath = join(LEARNING_PATH_DIR, `${mod.id}.json`);
    if (existsSync(mapPath)) continue;
    const skeleton = {
      version: '1.0.0',
      module: mod.id,
      summary: mod.description,
      stages: [],
    };
    if (!CHECK_MODE) writeFileSync(mapPath, JSON.stringify(skeleton, null, 2) + '\n', 'utf-8');
    report.learningPathAdded.push(`${mod.id}.json（骨架）`);
  }
}

const moduleIndex = new Map();

function indexModuleDocs(folders) {
  for (const folder of folders) {
    const docs = new Set();
    for (const d of readdirSync(folder.dir, { withFileTypes: true })) {
      if (!d.isFile() || d.name.startsWith('_')) continue;
      const ext = extname(d.name);
      if (ext === '.md' || ext === '.mdx') docs.add(basename(d.name, ext));
    }
    moduleIndex.set(folder.id, docs);
  }
}

function refExists(ref) {
  const slash = ref.indexOf('/');
  if (slash <= 0) return false;
  const mod = ref.slice(0, slash);
  const doc = ref.slice(slash + 1);
  return moduleIndex.get(mod)?.has(doc) ?? false;
}

function syncDocuments(folders, modulesData, gitDates) {
  const labels = modulesData.categoryLabels;
  const modById = new Map(modulesData.modules.map((m) => [m.id, m]));

  for (const folder of folders) {
    const mod = modById.get(folder.id);
    const category = labels[mod.categories[0]] ?? DEFAULT_CATEGORY_LABELS[mod.categories[0]] ?? mod.categories[0];

    const docs = readdirSync(folder.dir, { withFileTypes: true })
      .filter((d) => d.isFile() && [".md", ".mdx"].includes(extname(d.name)) && !d.name.startsWith('_'))
      .map((d) => d.name)
      .sort((a, b) => {
        const pa = a.match(DOC_PREFIX_RE), pb = b.match(DOC_PREFIX_RE);
        const na = pa ? Number(pa[1]) : Number.MAX_SAFE_INTEGER;
        const nb = pb ? Number(pb[1]) : Number.MAX_SAFE_INTEGER;
        if (na !== nb) return na - nb;
        return a.localeCompare(b);
      });

    docs.forEach((name, idx) => {
      const order = (idx + 1) * 10;
      const full = join(folder.dir, name);
      const relPath = full.slice(ROOT.length + 1).replace(/\\/g, '/');
      const raw = readFileSync(full, 'utf-8');

      let titleFromH1 = null;
      const h1 = raw.match(/^#\s+(.+)$/m);
      if (h1) titleFromH1 = h1[1].trim();
      const fallbackTitle = name.replace(DOC_PREFIX_RE, '').replace(/\.(md|mdx)$/, '');

      const gitDate = gitDates.get(relPath);
      const updated = gitDate ?? today();

      const patch = {
        order,
        module: folder.id,
        category,
        difficulty: 'beginner',
        author: 'fanquanpp',
        updated,
        title: titleFromH1 ?? fallbackTitle,
      };

      const { text, changed } = applyFrontmatter(raw, patch, relPath);
      if (changed) {
        report.docsTouched++;
        if (!CHECK_MODE) writeFileSync(full, text, 'utf-8');
      }
    });
  }
}

function main() {
  const t0 = Date.now();
  const oldModules = readJson(MODULES_JSON);

  const folders = normalizeFolders();

  const decls = collectModuleDecls(folders, oldModules);
  for (let i = 0; i < folders.length; i++) decls[i]._num = folders[i].num;

  const { changed: modulesChanged, data: modulesData } = rebuildModulesJson(decls);

  syncLearningPath(modulesData);

  indexModuleDocs(folders);
  const gitDates = loadGitDates();
  syncDocuments(folders, modulesData, gitDates);

  const mode = CHECK_MODE ? 'CHECK' : 'FIX';
  console.log(`\n=== FANDEX content-sync [${mode}] ===`);
  console.log(`模块: ${folders.length} | 文档: ${report.docsTouched} 处补全 | 耗时 ${Date.now() - t0}ms`);
  if (report.foldersRenamed.length) console.log(`文件夹重命名: ${report.foldersRenamed.join(', ')}`);
  if (report.modulesRegistered.length) console.log(`新注册模块: ${report.modulesRegistered.join(', ')}`);
  if (report.modulesRemoved.length) console.log(`已移除模块: ${report.modulesRemoved.join(', ')}`);
  if (report.moduleInfoGenerated.length) console.log(`生成 module.json: ${report.moduleInfoGenerated.join(', ')}`);
  if (report.learningPathAdded.length) console.log(`学习路径补充: ${report.learningPathAdded.join(', ')}`);
  if (report.unparseableLists.length) {
    console.log(`[warn] 行内列表解析失败（已保留原值，请改为块状列表写法）:`);
    for (const item of report.unparseableLists) console.log(`  - ${item}`);
  }
  for (const [k, v] of Object.entries(report.fieldChanges)) console.log(`字段 ${k}: ${v} 篇`);
  if (report.orderReshuffled) console.log(`order 重排: ${report.orderReshuffled} 篇`);
  if (report.deadRefsRemoved) console.log(`死链引用删除: ${report.deadRefsRemoved} 项`);
  if (report.bannedRemoved) console.log(`禁用字段删除: ${report.bannedRemoved} 项`);

  if (CHECK_MODE && (report.docsTouched || report.foldersRenamed.length || report.modulesRegistered.length ||
      report.modulesRemoved.length || report.moduleInfoGenerated.length || report.learningPathAdded.length ||
      modulesChanged || report.unparseableLists.length)) {
    console.log('\n[CHECK] 存在待同步内容，请运行 content-sync（或以 fix 模式执行）。');
    process.exit(1);
  }
  console.log('[done]');
}

main();
