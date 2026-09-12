/**
 * FANDEX 内容自动同步脚本（单一自动化入口）
 * =============================================================================
 * 设计目标：作者只维护 Markdown 文档本身，一切派生元数据由本脚本自动补全。
 *
 * 作者需要做的事（也只有这些）：
 *   1. 新建模块：在 cnt-content/full/ 下建 `<NNN->模块id>/` 文件夹（编号可省，
 *      自动分配），并可选写入 module.json 声明模块信息；
 *   2. 写文档：模块文件夹内放 `NNN-Name.md`（frontmatter 可全部省略，
 *      文件名编号即学习顺序）。
 *
 * 本脚本自动完成（幂等，可重复执行）：
 *   A. 模块注册：扫描模块文件夹 → 合并各模块 module.json → 重建
 *      shd-shared/metadata/modules.json 的 modules[] 与 modulePrerequisites；
 *      folder_order 恒等于文件夹编号数值（单一事实源）；
 *   B. 模块信息反拆：模块缺 module.json 时，从现有 modules.json 反拆生成
 *      （首次迁移用），新模块则生成最小骨架；
 *   C. 学习路径同步：learning-path/index.json 追加缺失模块；新模块自动生成
 *      骨架地图文件（已有地图不覆盖）；
 *   D. 文档 frontmatter 补全（行级最小 diff，不动无关内容）：
 *        - order       := 按文件名编号排序派生（10 起步长 10），手写无效
 *        - module      := 所在文件夹 id
 *        - category    := 模块主分类的中文名（查 categoryLabels）
 *        - difficulty  := 非法/缺失时补 beginner
 *        - author      := 缺失时补 fanquanpp
 *        - updated     := max(手写值, git 最后提交日期)，均无则今天
 *        - title       := 缺失时取正文首个 H1，否则文件名英文名
 *        - related / prerequisites := 死链项自动删除（含历史别名归一）
 *        - 禁用字段（tags/created/quiz 等历史字段）自动删除
 *        - 无 frontmatter 的文件自动生成完整信息块
 *
 * 用法：
 *   node scripts/content-sync.mjs            # fix 模式：补全并落盘（CI 与本地一致）
 *   node scripts/content-sync.mjs --check    # 只报告将发生的改动，不写盘
 *
 * 零 npm 依赖（仅 Node 内置模块 + git CLI），可直接嵌入任何工作流：
 *   web/desktop 走 app-web build 脚本链；Android 构建工作流直接 node 调用。
 * =============================================================================
 */

import { readFileSync, writeFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { join, dirname, basename, extname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** 单仓库根目录 */
const ROOT = join(__dirname, '..', '..');
/** 文档根目录 */
const CONTENT_DIR = join(ROOT, 'cnt-content', 'full');
/** 模块元数据文件（modules[] 与 modulePrerequisites 由本脚本重建） */
const MODULES_JSON = join(ROOT, 'shd-shared', 'metadata', 'modules.json');
/** 学习路径目录 */
const LEARNING_PATH_DIR = join(ROOT, 'shd-shared', 'metadata', 'learning-path');

/** 是否 check 模式（只报告不写盘） */
const CHECK_MODE = process.argv.includes('--check');

// ============================================================
// 常量与约定
// ============================================================

/** 模块文件夹名：NNN-模块id（编号与模块 id 均为顺序/身份事实） */
const FOLDER_RE = /^(\d{1,3})-([a-z][a-z0-9-]*)$/;
/** 纯 id 文件夹（无编号，sync 自动分配编号并重命名） */
const BARE_FOLDER_RE = /^([a-z][a-z0-9-]*)$/;
/** 文档文件名编号前缀：NNN- */
const DOC_PREFIX_RE = /^(\d{1,3})-/;

/** frontmatter 标准字段与书写顺序（与 AGENTS.md 规范一致） */
const STANDARD_FIELDS = [
  'order', 'title', 'module', 'category', 'difficulty',
  'description', 'author', 'updated', 'related', 'prerequisites',
];

/** 禁止字段（AGENTS.md 白名单之外的历史字段），sync 直接删除 */
const BANNED_FIELDS = [
  'tags', 'created', 'quiz', 'references', 'etymology',
  'estimatedReadingTime', 'lastReviewed', 'reviewer', 'readingTime', 'keywords',
  'slug', 'lang', 'layout', 'date',
];

/** 关联引用合法值格式：模块id/文件名（文件名不含扩展名） */
const REF_RE = /^[a-z0-9-]+\/[A-Za-z0-9_-]+$/;

/** 历史模块名 → 现行模块 id（related/prerequisites 归一化用） */
const MODULE_ALIASES = {
  network: 'networking',
  math: 'cs-fundamentals',
  'getting-started': 'cs-fundamentals',
};

/** 分类中文名回退（categoryLabels 缺失时兜底，正常从 modules.json 读取） */
const DEFAULT_CATEGORY_LABELS = {
  tools: '工具链', frontend: '前端技术', backend: '后端技术', database: '数据库',
  cs: '计算机科学', math: '数学', cloud: '云与基础设施',
};

/** 同步动作统计（输出报告用） */
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

/** 记一次字段变更（报告用） */
function noteChange(field) {
  report.fieldChanges[field] = (report.fieldChanges[field] || 0) + 1;
}

// ============================================================
// 基础工具
// ============================================================

/** 检测文本行尾（保持写入时与原文件一致，避免整文件 diff） */
function detectEol(text) {
  return text.includes('\r\n') ? '\r\n' : '\n';
}

/** 今天的本地日期 YYYY-MM-DD */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 简单标量 YAML 值解析（去掉包裹引号；本仓库 frontmatter 均为扁平标量/字符串列表） */
function parseScalar(v) {
  const t = String(v ?? '').trim();
  if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
    return t.slice(1, -1);
  }
  return t;
}

/** YAML 标量序列化：含特殊字符时加单引号，风格与存量文档一致 */
function dumpScalar(v) {
  const t = String(v);
  if (t === '' || /[:#[]{}&*!|>'"%@`,]/.test(t)) return `'${t.replace(/'/g, "''")}'`;
  return t;
}

/**
 * 一次性获取全部文档的 git 最后提交日期（YYYY-MM-DD）
 * 单次 git log 遍历全量历史，替代逐文件查询（1700+ 文件性能友好）
 * @returns {Map<string, string>} 相对路径（posix） -> 日期
 */
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
      // log 按时间新→旧排列，仅记录首次出现的（即最新）日期
      if (currentDate && !map.has(t)) map.set(t, currentDate);
    }
  } catch {
    // 非 git 环境（如 CI 浅克隆异常）时降级为空表，updated 将取文件手写值或今天
  }
  return map;
}

// ============================================================
// frontmatter 行级读写（最小 diff 策略）
// ============================================================

/**
 * 将 frontmatter 解析为有序键条目
 * @param {string[]} lines - frontmatter 内部行（不含 --- 围栏）
 * @returns {{ entries: Array<{key: string, lineIdx: number, endIdx: number}>, keyLines: Map<string, number[]> }}
 *   entries：每个顶层键覆盖的行区间 [lineIdx, endIdx)（含其列表项）
 */
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

/**
 * 从 frontmatter 行中提取某键的标量值（仅标量；列表返回 undefined）
 * @returns {string | undefined} 原始值文本（未去引号）；键不存在返回 undefined
 */
function getScalarLine(lines, entries, key) {
  const e = entries.find((x) => x.key === key);
  if (!e) return undefined;
  const m = lines[e.lineIdx].match(/^[A-Za-z][A-Za-z0-9_]*:(.*)$/);
  const v = m ? m[1].trim() : '';
  return v === '' ? undefined : v; // `key:` 后为空 = 列表或空值
}

/** 提取某键的字符串列表项（`- 'x'` 行）
 *  @returns {string[] | undefined | null}
 *    - string[]：解析出的列表项
 *    - undefined：键不存在
 *    - null：行内写法无法安全解析（JSON 数组解析失败或行内非数组标量）。
 *      返回 null 而非空数组是数据保护：无法确认原始条目时禁止改写，
 *      否则下游死链过滤会把作者手写的引用静默清空 */
function getListItems(lines, entries, key) {
  const e = entries.find((x) => x.key === key);
  if (!e) return undefined;
  const inline = lines[e.lineIdx].match(/^[A-Za-z][A-Za-z0-9_]*:(.*)$/);
  if (inline && inline[1].trim()) {
    // 行内数组写法 related: ['a', 'b']
    const inner = inline[1].trim();
    if (inner.startsWith('[')) {
      try { return JSON.parse(inner.replace(/'/g, '"')); } catch { return null; }
    }
    // 行内非数组标量（如 `related: devops`）同样无法安全归一
    return null;
  }
  const items = [];
  for (let i = e.lineIdx + 1; i < e.endIdx; i++) {
    const m = lines[i].match(/^\s*-\s*(.+)$/);
    if (m) items.push(parseScalar(m[1]));
  }
  return items;
}

/**
 * 对文档执行 frontmatter 补全（行级最小 diff）
 * @param {string} raw - 文件原始内容
 * @param {Object} patch - 目标值 { order, module, category, difficulty, author, updated, title, related, prerequisites }
 * @param {string} relPath - 相对仓库根的文档路径（仅用于报告定位解析失败的列表）
 * @returns {{ text: string, changed: boolean }}
 */
function applyFrontmatter(raw, patch, relPath = '') {
  const eol = detectEol(raw);
  const hasFm = /^\uFEFF?---\r?\n/.test(raw);
  let head;            // frontmatter 内部行数组
  let before;          // frontmatter 起始 ---（含 BOM 前缀，仅 hasFm 分支赋值）
  let body;            // frontmatter 之后的内容（含结束 --- 之后全部）
  if (hasFm) {
    const bom = raw.startsWith('\uFEFF') ? '\uFEFF' : '';
    const afterBom = bom ? raw.slice(1) : raw;
    const endMatch = afterBom.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!endMatch) {
      // frontmatter 未闭合：按损坏处理，整体重建
      return { text: buildFreshFrontmatter(patch, raw, eol), changed: true };
    }
    before = bom + '---' + eol;
    // 统一按 \r?\n 拆分（容忍历史混合行尾文件），写回时归一为主行尾
    head = endMatch[1].split(/\r?\n/);
    body = afterBom.slice(endMatch[0].length);
    if (!body.startsWith(eol) && body.length > 0) body = eol + body;
  } else {
    return { text: buildFreshFrontmatter(patch, raw, eol), changed: true };
  }

  // ==========================================================
  // 阶段 A：结构清理循环（禁用字段 + 重复键），直至 head 干净
  // （用循环而非递归：每次修改直接作用于 head，避免重复解析原始文本）
  // ==========================================================
  let entries = parseFmEntries(head);
  let entryKeys = entries.map((x) => x.key);
  let changed = false;

  for (;;) {
    // 禁用字段删除
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
    // 重复键去重（历史迁移脏数据：整块头部被重复追加）。
    // 策略：最后一个条目的值视为作者最新意图，覆盖第一个条目后删除冗余条目
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

  /** 替换标量键的值（键存在时）；forceQuote 为 true 时强制单引号包裹（如日期） */
  const setScalar = (key, value, forceQuote = false) => {
    const e = entries.find((x) => x.key === key);
    if (!e) return;
    const lineRe = new RegExp(`^(${key}:)(.*)$`);
    const old = head[e.lineIdx];
    const next = old.replace(lineRe, `$1 ${forceQuote ? `'${value}'` : dumpScalar(value)}`);
    if (old !== next) { head[e.lineIdx] = next; changed = true; noteChange(key); }
  };

  // --- 标量字段补全/校正 ---
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
  // updated：手写值 > 派生值时保留手写（不回退作者指定的日期）
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
  // order：托管字段，直接与派生值对齐
  const ordLine = getScalarLine(head, entries, 'order');
  const ordValue = ordLine === undefined ? null : Number.parseInt(parseScalar(ordLine), 10);
  if (ordValue !== patch.order) {
    if (hasKey('order')) setScalar('order', String(patch.order));
    else { insertKey(head, entries, 'order', String(patch.order)); changed = true; }
    report.orderReshuffled++;
  }

  // --- 列表字段：死链过滤 ---
  for (const key of ['related', 'prerequisites']) {
    const items = getListItems(head, entries, key);
    if (items === null) {
      // 行内写法解析失败：保留原行跳过改写并报备，待作者改为标准写法后自动恢复过滤
      report.unparseableLists.push(`${relPath}#${key}`);
      continue;
    }
    if (items === undefined) {
      // 缺失：写空列表（规范要求字段存在，schema 有 default，但显式化便于人工阅读）
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

/** 按标准字段顺序在合适位置插入缺失键（保持 frontmatter 字段趋向标准排序） */
function insertKey(head, entries, key, valueText) {
  const stdIdx = STANDARD_FIELDS.indexOf(key);
  // 找到标准序中应排在其后的第一个已存在键，插到它前面
  let insertAt = head.length;
  for (let s = stdIdx + 1; s < STANDARD_FIELDS.length; s++) {
    const e = entries.find((x) => x.key === STANDARD_FIELDS[s]);
    if (e) { insertAt = e.lineIdx; break; }
  }
  head.splice(insertAt, 0, `${key}: ${valueText}`);
  // 重解析（简单可靠，条目区间已失效）
  entries.length = 0;
  entries.push(...parseFmEntries(head));
}

/** 重写某键的列表（过滤死链后） */
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

/** 无 frontmatter / frontmatter 损坏时，构建完整信息块并接回正文 */
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

// ============================================================
// 模块扫描与注册
// ============================================================

/** 读取 JSON 文件（不存在返回 null） */
function readJson(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * 阶段 0：规范模块文件夹名（纯 id 文件夹自动补编号并重命名）
 * @returns {Array<{num: number, id: string, dir: string}>}
 */
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
      // 无编号文件夹：分配下一个可用编号并重命名
      let n = nextNum++;
      while (usedNums.has(n)) n = nextNum++;
      usedNums.add(n);
      const newName = `${String(n).padStart(3, '0')}-${m[1]}`;
      if (!CHECK_MODE) renameSync(join(CONTENT_DIR, name), join(CONTENT_DIR, newName));
      report.foldersRenamed.push(`${name} -> ${newName}`);
      // check 模式不落盘，继续以旧路径扫描
      folders.push({ num: n, id: m[1], dir: join(CONTENT_DIR, CHECK_MODE ? name : newName) });
      continue;
    }
    console.warn(`[warn] 无法识别的文件夹命名（已跳过）: ${name}`);
  }
  folders.sort((a, b) => a.num - b.num);
  return folders;
}

/**
 * 阶段 1：汇总各模块声明（module.json），缺失时从旧 modules.json 反拆
 */
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
        // 反拆迁移：从 modules.json 派生该模块的便捷信息文件
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
        // 全新模块且作者未提供 module.json：生成最小骨架
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
        // 内部标记不落盘
        const { _generated, ...persist } = decl;
        writeFileSync(infoPath, JSON.stringify(persist, null, 2) + '\n', 'utf-8');
      }
    }
    // 校验与归一
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

/**
 * 阶段 2：重建 modules.json（modules[] 与 modulePrerequisites 为派生数据）
 */
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
      // folder_order 恒等于文件夹编号（调用方保证 decls 已按编号排序）
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
  // 记录注册/移除（对比新旧 id 集）
  const oldIds = new Set((current.modules ?? []).map((m) => m.id));
  for (const m of modules) if (!oldIds.has(m.id)) report.modulesRegistered.push(m.id);
  for (const id of oldIds) if (!modules.some((m) => m.id === id)) report.modulesRemoved.push(id);
  if (changed && !CHECK_MODE) writeFileSync(MODULES_JSON, newText, 'utf-8');
  return { changed, data: next };
}

/** JSON 文本比较前归一（键序已由生成端固定，直接比较文本即可，仅统一行尾） */
function normalizeJsonForCompare(text) {
  return text.replace(/\r\n/g, '\n');
}

/**
 * 阶段 3：学习路径同步（index.json 追加缺失模块 + 新模块骨架地图）
 */
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
  // 保留 order 中仍有效的模块（已删除模块自然移除）
  const validIds = new Set(modulesData.modules.map((m) => m.id));
  const nextOrder = order.filter((id) => validIds.has(id));
  if (nextOrder.join() !== order.join() || JSON.stringify(index.order) !== JSON.stringify(nextOrder)) {
    index.order = nextOrder;
    if (!CHECK_MODE) writeFileSync(indexPath, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  }

  // 新模块骨架地图（已有地图不覆盖）
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

// ============================================================
// 文档扫描与 frontmatter 补全
// ============================================================

/** 模块索引：id -> 该模块全部文档名集合（不含扩展名），死链校验用 */
const moduleIndex = new Map();

/** 登记模块文档索引（在文档扫描前构建） */
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

/** 校验模块id/文件名 引用是否指向真实文档 */
function refExists(ref) {
  const slash = ref.indexOf('/');
  if (slash <= 0) return false;
  const mod = ref.slice(0, slash);
  const doc = ref.slice(slash + 1);
  return moduleIndex.get(mod)?.has(doc) ?? false;
}

/**
 * 阶段 4：遍历模块内文档，按文件名编号派生 order 并补全 frontmatter
 */
function syncDocuments(folders, modulesData, gitDates) {
  const labels = modulesData.categoryLabels;
  const modById = new Map(modulesData.modules.map((m) => [m.id, m]));

  for (const folder of folders) {
    const mod = modById.get(folder.id);
    const category = labels[mod.categories[0]] ?? DEFAULT_CATEGORY_LABELS[mod.categories[0]] ?? mod.categories[0];

    // 收集文档并按文件名编号排序（无编号排尾，按文件名字母序）
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

      // title 缺省：正文首个 H1，否则文件名英文名
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

// ============================================================
// 主流程
// ============================================================

function main() {
  const t0 = Date.now();
  const oldModules = readJson(MODULES_JSON);

  // 阶段 0：文件夹规范（重命名无编号模块文件夹）
  const folders = normalizeFolders();

  // 阶段 1：模块声明收集（含 module.json 反拆迁移）
  const decls = collectModuleDecls(folders, oldModules);
  // folder_order = 文件夹编号
  for (let i = 0; i < folders.length; i++) decls[i]._num = folders[i].num;

  // 阶段 2：重建 modules.json（changed 标记用于 check 模式判定派生漂移）
  const { changed: modulesChanged, data: modulesData } = rebuildModulesJson(decls);

  // 阶段 3：学习路径同步
  syncLearningPath(modulesData);

  // 阶段 4：文档 frontmatter 补全（先构建模块文档索引用于死链校验）
  indexModuleDocs(folders);
  const gitDates = loadGitDates();
  syncDocuments(folders, modulesData, gitDates);

  // 报告
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
