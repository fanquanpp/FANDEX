
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', ...opts });
}

const argv = process.argv.slice(2);
const noPush = argv.includes('--no-push');
const versionArg = argv.find((a) => !a.startsWith('--'));

const rootPkgPath = join(ROOT, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version;

function resolveNextVersion() {
  if (versionArg) {
    const parts = String(versionArg)
      .replace(/^v/, '')
      .split('.')
      .map((n) => Number.parseInt(n, 10));
    if (parts.some((n) => !Number.isInteger(n) || n < 0) || parts.length > 3 || parts.length === 0) {
      console.error(`[error] 无效版本号: ${versionArg}（示例：4.5.0 / 4.5 / 4）`);
      process.exit(1);
    }
    while (parts.length < 3) parts.push(0);
    return parts.join('.');
  }
  const [maj, min, pat] = currentVersion.split('.').map((n) => Number.parseInt(n, 10));
  return `${maj}.${min}.${pat + 1}`;
}

const nextVersion = resolveNextVersion();
if (nextVersion === currentVersion) {
  console.error(`[error] 新版本号（${nextVersion}）与当前版本相同`);
  process.exit(1);
}

const dirty = git(['status', '--porcelain']).trim();
if (dirty) {
  console.error('[error] 工作区存在未提交改动，请先提交后再发版：');
  console.error(dirty.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

const targetFiles = [
  'package.json',
  'app-web/package.json',
  'app-desktop/package.json',
  'app-desktop/src-tauri/tauri.conf.json',
  'app-desktop-portable/package.json',
];

function bumpJsonVersion(relPath) {
  const full = join(ROOT, relPath);
  const raw = readFileSync(full, 'utf-8');
  const re = /("version"\s*:\s*")([^"]+)(")/;
  if (!re.test(raw)) {
    console.error(`[error] ${relPath} 中未找到 "version" 字段`);
    process.exit(1);
  }
  writeFileSync(full, raw.replace(re, `$1${nextVersion}$3`), 'utf-8');
}

for (const f of targetFiles) bumpJsonVersion(f);

function bumpCargoVersion() {
  const tomlPath = 'app-desktop/src-tauri/Cargo.toml';
  const tomlFull = join(ROOT, tomlPath);
  const tomlRaw = readFileSync(tomlFull, 'utf-8');
  const tomlRe = /(\[package\][\s\S]*?^version\s*=\s*")([^"]+)(")/m;
  if (!tomlRe.test(tomlRaw)) {
    console.error(`[error] ${tomlPath} 中未找到 [package] version 字段`);
    process.exit(1);
  }
  writeFileSync(tomlFull, tomlRaw.replace(tomlRe, `$1${nextVersion}$3`), 'utf-8');

  const lockPath = 'app-desktop/src-tauri/Cargo.lock';
  const lockFull = join(ROOT, lockPath);
  const lockRaw = readFileSync(lockFull, 'utf-8');
  const lockRe = /(\[\[package\]\]\s*\nname = "fandex-desktop"\s*\nversion = ")[^"]+(")/;
  if (!lockRe.test(lockRaw)) {
    console.error(`[error] ${lockPath} 中未找到 fandex-desktop 包版本块`);
    process.exit(1);
  }
  writeFileSync(lockFull, lockRaw.replace(lockRe, `$1${nextVersion}$2`), 'utf-8');
  console.log('Cargo.toml 与 Cargo.lock 版本已同步');
}
bumpCargoVersion();

function bumpGradle() {
  const relPath = 'app-Android-new/app/build.gradle.kts';
  const full = join(ROOT, relPath);
  const raw = readFileSync(full, 'utf-8');
  const codeMatch = raw.match(/versionCode\s*=\s*(\d+)/);
  if (!codeMatch) {
    console.error('[error] build.gradle.kts 中未找到 versionCode');
    process.exit(1);
  }
  const nextCode = Number(codeMatch[1]) + 1;
  const next = raw
    .replace(/versionCode\s*=\s*\d+/, `versionCode = ${nextCode}`)
    .replace(/versionName\s*=\s*"[^"]+"/, `versionName = "${nextVersion}"`);
  writeFileSync(full, next, 'utf-8');
  console.log(`versionCode: ${codeMatch[1]} -> ${nextCode}`);
}
bumpGradle();

console.log(`版本号七处同步完成: ${currentVersion} -> ${nextVersion}`);

function updateChangelog() {
  const path = join(ROOT, 'CHANGELOG.md');
  const raw = readFileSync(path, 'utf-8');
  if (raw.includes(`## [v${nextVersion}]`)) {
    console.log('CHANGELOG 已存在对应版本段，跳过');
    return;
  }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const unreleasedIdx = lines.findIndex((l) => l.startsWith('## [未发布]'));
  const today = new Date().toISOString().slice(0, 10);
  const header = `## [v${nextVersion}] - ${today}`;

  let insertLines;
  if (unreleasedIdx >= 0) {
    let end = unreleasedIdx + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end++;
    const body = lines.slice(unreleasedIdx + 1, end);
    const hasContent = body.some((l) => l.trim() && !l.trim().startsWith('#'));
    if (hasContent) {
      lines.splice(unreleasedIdx, 1, header);
      const anchor = lines.findIndex((l) => l.startsWith('## ['));
      lines.splice(anchor, 0, '## [未发布]', '');
      writeFileSync(path, lines.join(eol), 'utf-8');
      console.log(`CHANGELOG：「未发布」内容已迁移为 ${header}`);
      return;
    }
  }
  insertLines = [header, '', `本版本以内容更新为主，无功能性代码变更。`];
  const anchor = lines.findIndex((l) => l.startsWith('## ['));
  if (anchor >= 0) lines.splice(anchor, 0, ...insertLines, '');
  else lines.push(...insertLines);
  writeFileSync(path, lines.join(eol), 'utf-8');
  console.log(`CHANGELOG：已插入 ${header} 占位段`);
}
updateChangelog();

const tag = `v${nextVersion}`;
git(['add', '-A']);
git(['commit', '-m', `chore(release): ${tag}`]);
git(['tag', tag]);
console.log(`已提交并打标签: ${tag}`);

if (noPush) {
  console.log('[--no-push] 未推送。确认后手动执行:');
  console.log(`  git push origin main && git push origin ${tag}`);
} else {
  try {
    git(['push', 'origin', 'HEAD']);
    git(['push', 'origin', tag]);
    console.log('已推送版本提交与标签（安装包构建工作流已退役，不再自动触发构建）。');
  } catch (e) {
    console.error('[warn] 推送失败（main 可能受分支保护）。请手动执行:');
    console.error(`  git push origin HEAD && git push origin ${tag}`);
    process.exit(1);
  }
}
