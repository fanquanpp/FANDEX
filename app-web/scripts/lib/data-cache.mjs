
// 数据产物缓存基座（第 2 期 S1）。
//
// 目录约定（见 .workflow-tmp/pipeline-spec.md 第 2/3/4 节）：
//   仓库根/node_modules/.cache/fandex-data/<product>/v<schemaVersion>/
//     payload.json   产物 envelope（含 payload，可据此重建发布通道）
//     manifest.json  { product, schemaVersion, inputsHash, writtenAt }
//
// 纪律：
// - 缓存键一律由输入内容派生（文件文本/元数据哈希），禁止 mtime/时间戳派生；
// - 时间戳类不稳定字段不得进入产物 payload（doc-stats 的 generatedAt 已移除）；
// - PRODUCER_VERSION 约定：各生产者脚本顶部自定义常量并纳入缓存键。键只覆盖
//   「输入内容」，不覆盖「生产逻辑」——提取规则、清洗正则、上游解析器
//   （remark-parse/shiki）变更时必须人工 bump，否则旧逻辑产物被新键命中的旧值覆盖；
// - 发布通道写入一律走 writeIfChanged：字节相同跳写，保证连跑零写盘、
//   Vite 缓存不被无谓失效、git status 干净；
// - 失效兜底：manifest 缺失/损坏/schemaVersion 不匹配 → 视为不新鲜，走全量重建；
//   清空缓存目录（node_modules/.cache/fandex-data）= 回到无缓存全量行为。

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);

/**
 * 从 startDir（默认 cwd）上溯查找 pnpm-workspace.yaml 定位仓库根。
 *
 * 与 src/plugins/rehype-mermaid-dual.ts 的 resolveCacheDir（约 39-51 行）为镜像实现：
 * 两份实现必须同步维护，改动任一方需检查另一方。不合并为一份是刻意取舍：
 * 插件运行在 Vite/打包环境内，取值方式受限（见该文件注释）。
 * 差异说明：插件的兜底落点是 app-web 级缓存目录（既有行为），本函数的兜底
 * 必须落在仓库根（scripts/lib 上三级），否则各生产者会分裂出两套缓存区。
 */
export function resolveCacheRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // 兜底：找不到工作区标记时按本文件位置（app-web/scripts/lib）上推到仓库根
  return resolve(dirname(__filename), '..', '..', '..');
}

export function cacheRoot() {
  return join(resolveCacheRoot(), 'node_modules', '.cache', 'fandex-data');
}

export function productDir(product, schemaVersion) {
  return join(cacheRoot(), product, `v${schemaVersion}`);
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

export function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * 读取产物 manifest；文件缺失/损坏/schemaVersion 不匹配一律返回 null。
 */
export function loadManifest(product, schemaVersion) {
  const manifest = readJsonIfExists(join(productDir(product, schemaVersion), 'manifest.json'));
  if (!manifest || typeof manifest !== 'object') return null;
  if (manifest.schemaVersion !== schemaVersion) return null;
  if (typeof manifest.inputsHash !== 'string' || manifest.inputsHash === '') return null;
  return manifest;
}

/**
 * 新鲜 = manifest 存在且 inputsHash 一致，且全部发布通道文件存在。
 * 发布通道文件被删（如本地模拟 CI 缺产物）→ 不新鲜 → 生产者全量重建。
 */
export function isFresh(product, schemaVersion, inputsHash, publishPaths = []) {
  const manifest = loadManifest(product, schemaVersion);
  if (!manifest || manifest.inputsHash !== inputsHash) return false;
  for (const path of publishPaths) {
    if (!existsSync(path)) return false;
  }
  return true;
}

/**
 * 内容相同跳写。返回 true 表示本次实际写盘。
 */
export function writeIfChanged(filePath, content) {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  try {
    const prev = readFileSync(filePath);
    if (prev.equals(buf)) return false;
  } catch {
    // 文件不存在 → 写
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buf);
  return true;
}

/**
 * 写一个产物：缓存 payload + 各发布通道（writeIfChanged）+ manifest + 旧版本清理。
 * manifest 只在有效字段（product/schemaVersion/inputsHash）变化时重写，
 * writtenAt 因此记录的是输入最近一次实际变化的时间。
 */
export function writeProduct(product, schemaVersion, { inputsHash, envelope, publish = [] }) {
  const dir = productDir(product, schemaVersion);
  mkdirSync(dir, { recursive: true });
  const payloadWritten = writeIfChanged(join(dir, 'payload.json'), JSON.stringify(envelope) + '\n');
  const publishWrites = publish.map((item) => ({
    path: item.path,
    written: writeIfChanged(item.path, item.content),
  }));
  const manifestPath = join(dir, 'manifest.json');
  const prev = readJsonIfExists(manifestPath);
  if (!prev || prev.product !== product || prev.schemaVersion !== schemaVersion || prev.inputsHash !== inputsHash) {
    writeFileSync(
      manifestPath,
      JSON.stringify({ product, schemaVersion, inputsHash, writtenAt: new Date().toISOString() }, null, 2) + '\n',
      'utf-8',
    );
  }
  sweepCache(product, schemaVersion);
  return { payloadWritten, publishWrites };
}

/**
 * 清理同 product 下除 keepVersion 外的旧版本目录。
 */
export function sweepCache(product, keepVersion) {
  const base = join(cacheRoot(), product);
  if (!existsSync(base)) return;
  const keep = `v${keepVersion}`;
  for (const entry of readdirSync(base, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === keep) continue;
    if (/^v\d+$/.test(entry.name)) rmSync(join(base, entry.name), { recursive: true, force: true });
  }
}

/**
 * 生产者 CLI 约定（spec 第 4 节）：
 * --check   只报告待算项，零写入（存在待算项时生产者自行 exit 1）
 * --rebuild 无视缓存全量重建
 */
export function parseProducerArgs(argv = process.argv.slice(2)) {
  return { check: argv.includes('--check'), rebuild: argv.includes('--rebuild') };
}
