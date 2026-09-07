/**
 * FANDEX 自动发版脚本
 * =============================================================================
 * 一条命令完成版本发布准备：
 *   1. 计算新版本号：传参指定（如 `4.4.0` / `4`），缺省为当前版本 patch + 1；
 *   2. 同步写入 5 处版本文件（根/app-web package.json、tauri.conf.json、
 *      app-desktop-portable/package.json、Android versionName）；
 *   3. Android versionCode 自动 +1（每次发布递增）；
 *   4. CHANGELOG.md 无对应版本段时，从「未发布」段迁移内容生成新版本段
 *      （无未发布内容则生成占位说明）；
 *   5. git commit + tag `vX.Y.Z` + push（分支与标签）——push 触发
 *      android-release.yml 自动构建并发布 GitHub Release。
 *
 * 用法：
 *   node scripts/release.mjs            # 自动 patch + 1
 *   node scripts/release.mjs 4.5.0      # 指定完整版本号
 *   node scripts/release.mjs 5          # 补全为 5.0.0
 *   node scripts/release.mjs --no-push  # 只改文件与提交，不推送
 *
 * 零 npm 依赖（仅 Node 内置模块 + git CLI）。
 * =============================================================================
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** 可执行 git 的辅助封装（继承 stdio 选项由调用方传入） */
function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', ...opts });
}

// ============================================================
// 参数解析
// ============================================================

const argv = process.argv.slice(2);
const noPush = argv.includes('--no-push');
const versionArg = argv.find((a) => !a.startsWith('--'));

/** 当前版本（以根 package.json 为唯一事实源） */
const rootPkgPath = join(ROOT, 'package.json');
const rootPkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8'));
const currentVersion = rootPkg.version;

/**
 * 归一化版本号为 x.y.z：
 *  - 缺省：patch + 1（4.3.1 -> 4.3.2）
 *  - '5'   -> 5.0.0；'4.5' -> 4.5.0；'4.5.0' -> 4.5.0
 */
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

// ============================================================
// 前置校验：工作区必须干净（版本 bump 不与内容改动混提交）
// ============================================================

const dirty = git(['status', '--porcelain']).trim();
if (dirty) {
  console.error('[error] 工作区存在未提交改动，请先提交后再发版：');
  console.error(dirty.split('\n').slice(0, 10).join('\n'));
  process.exit(1);
}

// ============================================================
// 五处版本文件 + versionCode 同步
// ============================================================

const targetFiles = [
  'package.json',
  'app-web/package.json',
  'app-desktop/src-tauri/tauri.conf.json',
  'app-desktop-portable/package.json',
];

/** 通用 JSON 版本替换（仅替换第一个 "version" 键，保留其余内容原样） */
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

/** Android versionName 替换 + versionCode 递增 */
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

console.log(`版本号五处同步完成: ${currentVersion} -> ${nextVersion}`);

// ============================================================
// CHANGELOG：迁移「未发布」段或生成占位段
// ============================================================

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
    // 收集「未发布」段内容（到下一个 ## 段为止），非空则整体迁移
    let end = unreleasedIdx + 1;
    while (end < lines.length && !lines[end].startsWith('## ')) end++;
    const body = lines.slice(unreleasedIdx + 1, end);
    const hasContent = body.some((l) => l.trim() && !l.trim().startsWith('#'));
    if (hasContent) {
      lines.splice(unreleasedIdx, 1, header); // 「未发布」标题替换为新版本标题
      // 在文件头部（约定段落之后）恢复一个空的「未发布」段
      const anchor = lines.findIndex((l) => l.startsWith('## ['));
      lines.splice(anchor, 0, '## [未发布]', '');
      writeFileSync(path, lines.join(eol), 'utf-8');
      console.log(`CHANGELOG：「未发布」内容已迁移为 ${header}`);
      return;
    }
  }
  // 无未发布内容：直接插入占位版本段
  insertLines = [header, '', `本版本以内容更新为主，无功能性代码变更。`];
  const anchor = lines.findIndex((l) => l.startsWith('## ['));
  if (anchor >= 0) lines.splice(anchor, 0, ...insertLines, '');
  else lines.push(...insertLines);
  writeFileSync(path, lines.join(eol), 'utf-8');
  console.log(`CHANGELOG：已插入 ${header} 占位段`);
}
updateChangelog();

// ============================================================
// 提交、打标签、推送
// ============================================================

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
    console.log('已推送。android-release.yml 将自动构建三端并创建 GitHub Release。');
  } catch (e) {
    console.error('[warn] 推送失败（main 可能受分支保护）。请手动执行:');
    console.error(`  git push origin HEAD && git push origin ${tag}`);
    process.exit(1);
  }
}
