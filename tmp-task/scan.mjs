/**
 * 一次性深度扫描脚本（任务临时产物，交付前删除）
 *
 * 对 cnt-content/full 全库做结构化审计：
 * 1. frontmatter 字段集合/顺序/白名单/取值合法性
 * 2. order 编号：重复、步长、与文件名学习顺序的对齐情况
 * 3. related/prerequisites 引用：格式与死链检测
 * 4. 围栏代码块异常：未闭合、嵌套断裂、正文疑似被包裹为代码块
 * 5. 模块结构：学习总结缺失、长文档缺前置说明、正文内可修复站内链接
 *
 * 输出：tmp-task/report.json（机器可读）+ 控制台摘要
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = join(ROOT, 'cnt-content', 'full');
const SCOPE = new Set(['java', 'kotlin', 'csharp', 'go', 'python', 'rust', 'c', 'cpp',
  'javascript', 'typescript', 'vue3', 'react', 'nextjs', 'astro', 'nestjs', 'vite',
  'deno', 'bun', 'svelte', 'angular', 'tailwind']);

// AGENTS.md 规定的 10 字段标准顺序
const FIELD_ORDER = ['order', 'title', 'module', 'category', 'difficulty',
  'description', 'author', 'updated', 'related', 'prerequisites'];
const CATEGORY_BY_MODULE = {
  'getting-started': '工具链', markdown: '工具链', git: '工具链', github: '工具链',
  'shell': '工具链', 'pnpm-monorepo': '工具链',
  html5: '前端技术', css: '前端技术', javascript: '前端技术', typescript: '前端技术',
  vue3: '前端技术', react: '前端技术', svg: '前端技术', astro: '前端技术',
  vite: '前端技术', tailwind: '前端技术', nextjs: '前端技术', svelte: '前端技术',
  angular: '前端技术',
  java: '后端技术', kotlin: '后端技术', csharp: '后端技术', go: '后端技术',
  python: '后端技术', rust: '后端技术', nestjs: '后端技术',
  deno: '后端技术', bun: '后端技术',
  sql: '数据库', mysql: '数据库', postgresql: '数据库', redis: '数据库', mongodb: '数据库',
  algorithm: '计算机科学', 'cs-fundamentals': '计算机科学', c: '计算机科学', cpp: '计算机科学',
  devops: '云与基础设施', networking: '云与基础设施', cybersecurity: '云与基础设施',
  'cloud-computing': '云与基础设施', 'software-testing': '云与基础设施',
  'software-engineering': '云与基础设施', 'software-architecture': '云与基础设施',
  'engineering-practices': '云与基础设施', 'message-queue': '云与基础设施',
};

const issues = [];
function add(type, file, detail) { issues.push({ type, file, detail }); }

// ---------- 索引：moduleId -> { folder, docs: [{file, name, seq, fm, body}] } ----------
const modules = [];
for (const entry of readdirSync(DOCS, { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^\d+-/.test(entry.name)) continue;
  const folder = entry.name;
  const moduleId = folder.replace(/^\d+-/, '');
  const docs = [];
  for (const f of readdirSync(join(DOCS, folder))) {
    if (!f.endsWith('.md')) continue;
    const seq = parseInt(f.match(/^(\d+)-/)?.[1] ?? '999999', 10);
    docs.push({ file: `${folder}/${f}`, name: f, seq, isMerged: f.startsWith('000-') });
  }
  docs.sort((a, b) => a.seq - b.seq);
  modules.push({ folder, moduleId, docs });
}
modules.sort((a, b) => parseInt(a.folder, 10) - parseInt(b.folder, 10));

// 全库真实文档索引（module/文件名 -> true），用于死链判断
const realDocs = new Set();
for (const m of modules) for (const d of m.docs) realDocs.add(`${m.moduleId}/${d.name.replace(/\.md$/, '')}`);

// ---------- frontmatter 简易解析（行级，够用于规范审计） ----------
function parseFm(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: null, body: raw, fields: [] };
  const fmText = m[1];
  const fields = [];
  let current = null;
  for (const line of fmText.split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):(.*)$/);
    if (kv) { current = { key: kv[1], raw: [line] }; fields.push(current); }
    else if (current) current.raw.push(line);
  }
  const get = (k) => fields.find((f) => f.key === k);
  const scalar = (k) => { const f = get(k); return f ? f.raw[0].replace(/^[^:]*:\s*/, '').trim().replace(/^['"]|['"]$/g, '') : undefined; };
  const list = (k) => {
    const f = get(k); if (!f) return undefined;
    const inline = f.raw[0].replace(/^[^:]*:\s*/, '').trim();
    if (inline) return inline === '[]' ? [] : [inline];
    return f.raw.slice(1).map((l) => l.replace(/^\s*-\s*/, '').trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
  };
  return { fm: fmText, body: raw.slice(m[0].length), fields, get, scalar, list };
}

// ---------- 围栏分析 ----------
function analyzeFences(body) {
  const lines = body.split(/\r?\n/);
  const out = { unclosed: false, candidates: [], langStats: {}, nested: [] };
  let open = null; // { lang, start, lines: [] }
  const closeFence = (i) => { open = null; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fm = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^`\s].*)?$/);
    if (!open) {
      if (fm) {
        const lang = (fm[2] || '').trim().split(/\s+/)[0] || '';
        open = { lang, start: i, fence: fm[1][0], len: fm[1].length, lines: [] };
        out.langStats[open.lang] = (out.langStats[open.lang] || 0) + 1;
      }
    } else {
      const isClose = fm && fm[1][0] === open.fence && fm[1].length >= open.len && !(fm[2] || '').trim();
      if (isClose) { closeFence(i); continue; }
      if (fm) out.nested.push({ line: i + 1, fence: fm[1] });
      open.lines.push(line);
    }
  }
  if (open) out.unclosed = true;
  return out;
}

/** 判断围栏块是否疑似"正文被包裹" */
function proseScore(lines) {
  let headings = 0, tableRows = 0, listItems = 0, cjkLines = 0, empty = 0;
  for (const l of lines) {
    if (/^#{1,6}\s/.test(l)) headings++;
    else if (/^\s*\|.+\|\s*$/.test(l)) tableRows++;
    else if (/^\s*([-*+]|\d+[.)])\s+/.test(l)) listItems++;
    else if (/[\u4e00-\u9fff]/.test(l)) cjkLines++;
    else if (!l.trim()) empty++;
  }
  const n = lines.length || 1;
  const score = headings * 3 + (tableRows >= 2 ? 3 : 0) + listItems + cjkLines * 0.6;
  const codePunct = lines.reduce((s, l) => s + (/[;{}()=<>]/.test(l) ? 1 : 0), 0) / n;
  return { headings, tableRows, listItems, cjkLines, empty, score, codePunct, n };
}

// ---------- 主循环 ----------
const summary = { modules: [], totals: {} };
for (const mod of modules) {
  const ms = { id: mod.moduleId, docs: mod.docs.length, merged: mod.docs.filter((d) => d.isMerged).length, problems: {} };
  const realDocsInModule = mod.docs.filter((d) => !d.isMerged);
  let hasSummary = false;
  const seenOrders = new Map();
  let prevSeq = -1, prevOrder = -1;
  for (const doc of realDocsInModule) {
    const raw = readFileSync(join(DOCS, doc.file.replace('/', '/')), 'utf-8');
    const p = parseFm(raw);
    const fname = doc.name.replace(/\.md$/, '');
    if (/总结|Summary|summary/.test(fname)) hasSummary = true;
    if (!p.fm) { add('FM_MISSING', doc.file, ''); continue; }

    // 字段集合与顺序
    const keys = p.fields.map((f) => f.key);
    const extras = keys.filter((k) => !FIELD_ORDER.includes(k));
    if (extras.length) add('FM_EXTRA_FIELD', doc.file, extras.join(','));
    const missing = FIELD_ORDER.filter((k) => !keys.includes(k));
    if (missing.length) add('FM_MISSING_FIELD', doc.file, missing.join(','));
    const present = FIELD_ORDER.filter((k) => keys.includes(k));
    const orderOk = present.every((k, idx) => keys.indexOf(k) === idx)
      && keys.filter((k) => FIELD_ORDER.includes(k)).every((k, i, arr) => i === 0 || FIELD_ORDER.indexOf(arr[i - 1]) < FIELD_ORDER.indexOf(k));
    if (!orderOk) add('FM_FIELD_ORDER', doc.file, keys.join(','));

    // 取值合法性
    const cat = p.scalar('category');
    if (cat !== CATEGORY_BY_MODULE[mod.moduleId]) add('FM_BAD_CATEGORY', doc.file, `got=${cat} want=${CATEGORY_BY_MODULE[mod.moduleId]}`);
    const diff = p.scalar('difficulty');
    if (!['beginner', 'intermediate', 'advanced'].includes(diff)) add('FM_BAD_DIFFICULTY', doc.file, diff);
    const upd = p.scalar('updated');
    if (upd && !/^\d{4}-\d{2}-\d{2}$/.test(upd)) add('FM_BAD_UPDATED', doc.file, upd);
    const author = p.scalar('author');
    if (author && author !== 'fanquanpp') add('FM_BAD_AUTHOR', doc.file, author);

    // order 序列
    const orderVal = parseInt(p.scalar('order') ?? 'NaN', 10);
    if (Number.isNaN(orderVal)) add('ORDER_MISSING', doc.file, '');
    else {
      if (seenOrders.has(orderVal)) add('ORDER_DUP', doc.file, `dup with ${seenOrders.get(orderVal)}`);
      seenOrders.set(orderVal, doc.file);
      if (prevSeq >= 0 && doc.seq > prevSeq && orderVal <= prevOrder) add('ORDER_MISALIGNED', doc.file, `seq ${prevSeq}->${doc.seq} but order ${prevOrder}->${orderVal}`);
      prevSeq = doc.seq; prevOrder = orderVal;
    }

    // 引用死链
    for (const key of ['related', 'prerequisites']) {
      for (const ref of (p.list(key) ?? [])) {
        if (!/^[a-z0-9-]+\/[A-Za-z0-9_-]+$/.test(ref)) { add('REF_BAD_FORMAT', doc.file, `${key}: ${ref}`); continue; }
        if (!realDocs.has(ref)) add('REF_DEAD', doc.file, `${key}: ${ref}`);
      }
    }

    // 围栏与结构
    const fz = analyzeFences(p.body);
    if (fz.unclosed) add('FENCE_UNCLOSED', doc.file, '');
    if (fz.nested.length) add('FENCE_NESTED', doc.file, `${fz.nested.length} 处（行 ${fz.nested.slice(0, 3).map((x) => x.line).join(',')}）`);
    // 疑似正文包裹：重新逐块评估
    const lines = p.body.split(/\r?\n/);
    let open = null;
    for (let i = 0; i < lines.length; i++) {
      const fm = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*([^`\s].*)?$/);
      if (!open) {
        if (fm) open = { lang: (fm[2] || '').trim() || '', start: i, fence: fm[1][0], len: fm[1].length, lines: [] };
      } else {
        const isClose = fm && fm[1][0] === open.fence && fm[1].length >= open.len && !(fm[2] || '').trim();
        if (isClose) {
          if (['', 'text', 'txt', 'markdown', 'md'].includes(open.lang)) {
            const ps = proseScore(open.lines);
            if ((ps.headings >= 1 || ps.tableRows >= 2 || ps.score >= 6) && ps.n >= 3) {
              add('FENCE_PROSE', doc.file, `行${open.start + 1} lang=${open.lang || '无'} headings=${ps.headings} table=${ps.tableRows} cjk=${ps.cjkLines} codePunct=${ps.codePunct.toFixed(2)}`);
            }
          }
          open = null;
        } else open.lines.push(lines[i]);
      }
    }

    if (p.body.length > 10000 && !p.body.includes('## 前置知识') && !p.body.includes('## 学习目标') && SCOPE.has(mod.moduleId)) {
      add('DOC_NO_PREAMBLE', doc.file, `${p.body.length} 字符`);
    }
  }
  if (SCOPE.has(mod.moduleId) && !hasSummary) add('MODULE_NO_SUMMARY', mod.folder, '缺少学习总结文档');
  summary.modules.push(ms);
}

// 正文内可修复站内链接（module/name 且目标真实存在，但缺前导斜杠）
for (const mod of modules) {
  for (const doc of mod.docs) {
    if (doc.isMerged) continue;
    const raw = readFileSync(join(DOCS, doc.file.replace('/', '/')), 'utf-8');
    const p = parseFm(raw);
    const bodyNoCode = p.body.replace(/```[\s\S]*?```/g, '').replace(/~~~[\s\S]*?~~~/g, '');
    const re = /\]\((getting-started|markdown|git|github|html5|css|javascript|typescript|vue3|react|svg|java|kotlin|csharp|go|sql|mysql|postgresql|redis|algorithm|cs-fundamentals|c|cpp|devops|networking|cybersecurity|cloud-computing|software-testing|software-engineering|software-architecture|engineering-practices|python|rust|shell|astro|vite|pnpm-monorepo|tailwind|mongodb|nextjs|nestjs|deno|bun|svelte|angular|message-queue)\/[A-Za-z0-9_-]+\)/g;
    let m, count = 0;
    while ((m = re.exec(bodyNoCode)) !== null) {
      const target = m[1].length ? m[0].slice(2, -1) : '';
      if (realDocs.has(target)) count++;
    }
    if (count) add('BODY_LINK_FIXABLE', doc.file, `${count} 处`);
  }
}

// ---------- 汇总输出 ----------
const totals = {};
for (const i of issues) totals[i.type] = (totals[i.type] || 0) + 1;
summary.totals = totals;
summary.issues = issues;
writeFileSync(join(ROOT, 'tmp-task', 'report.json'), JSON.stringify(summary, null, 1));
console.log('=== 问题类型统计 ===');
for (const [t, n] of Object.entries(totals).sort((a, b) => b[1] - a[1])) console.log(`${n}\t${t}`);
console.log('\n=== 范围内模块概览 ===');
for (const m of summary.modules) {
  const mine = issues.filter((i) => SCOPE.has(m.id) && i.file.includes(`/${m.id}/`)).length;
  if (SCOPE.has(m.id)) console.log(`${m.id}\t${m.docs}篇(含合集${m.merged})\t问题${mine}`);
}
