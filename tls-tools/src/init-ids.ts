/**
 * init-ids CLI 入口（一次性初始化脚本）
 *
 * 功能概述：
 * 一次性完成 manifest 初始化所需的全部前置工作：
 * 1. 生成 Ed25519 密钥对（私钥保存到 ~/.fandex/keys/，公钥副本保存到 tls-tools/keys/）
 * 2. 创建空 id-registry.json（位于 cnt-content/full/_id-registry.json）
 * 3. 扫描 cnt-content/full/ 与 cnt-content/mobile/
 * 4. 批量分配所有模块 ID（english_short 来自目录名，name 来自 shd-shared/metadata/modules.json）
 * 5. 批量分配所有文档 ID 并写入 cnt-content/full/_doc-id-map.json
 *
 * 设计目的：
 * - 避免数百次 allocate-id CLI 调用（52 模块 + 数百文档）
 * - 直接调用 lib 函数，单次写入 registry 与 doc-id-map
 * - 幂等性保护：若 id-registry.json 已存在则中止
 *
 * 使用方式：
 *   pnpm tsx src/init-ids.ts
 *   pnpm tsx src/init-ids.ts --force          # 覆盖已存在的 id-registry.json
 *   pnpm tsx src/init-ids.ts --skip-keys       # 跳过密钥生成
 *
 * 退出码：
 * - 0：成功
 * - 1：参数错误、文件已存在（未 --force）、扫描或分配失败
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  saveIdRegistry,
  allocateModuleId,
  allocateDocId,
  getDefaultRegistryPath,
} from './lib/id-registry';
import {
  loadDocIdMap,
  saveDocIdMap,
  addMapping,
  getDefaultMapPathForType,
} from './lib/doc-id-map';
import { scanContentDir } from './lib/content-scanner';
import { generateKeyPair } from './lib/ed25519';
import { saveKeyPair, keyPairExists, getDefaultKeysDir } from './lib/key-manager';
import type { IdRegistry, ManifestType } from './lib/types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** FANDEX 仓库根目录（tls-tools/src/ → tls-tools/ → FANDEX/） */
const FANDEX_ROOT = resolve(__dirname, '..', '..');

/** 默认模块元数据文件路径（shd-shared/metadata/modules.json，三端共享元数据源） */
const DEFAULT_MODULES_META = join(FANDEX_ROOT, 'shd-shared', 'metadata', 'modules.json');

/** 仓库内公钥副本路径（tls-tools/keys/public-key.hex，可入库） */
const REPO_PUBLIC_KEY_PATH = resolve(__dirname, '..', 'keys', 'public-key.hex');

/** 模块元数据条目（仅取所需字段） */
interface ModuleMetaEntry {
  /** 模块英文简称（小写，对应目录名） */
  id: string;
  /** 模块中文显示名 */
  title: string;
}

/** CLI 选项类型 */
interface CliOptions {
  force: boolean;
  skipKeys: boolean;
  modulesMeta: string;
}

/**
 * 程序入口
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('init-ids')
    .description('一次性初始化密钥、id-registry、doc-id-map（批量分配所有 ID）')
    .option('--force', '覆盖已存在的 id-registry.json 与 doc-id-map', false)
    .option('--skip-keys', '跳过密钥生成步骤', false)
    .option(
      '--modules-meta <path>',
      '模块元数据文件路径（JSON，含 modules[].id 与 modules[].title）',
      DEFAULT_MODULES_META,
    )
    .action(async (options) => {
      await runInit(options);
    });

  await program.parseAsync(process.argv);
}

/**
 * 执行初始化流程
 *
 * 流程：
 * 1. 检查 id-registry.json 是否已存在（幂等性保护）
 * 2. 生成 Ed25519 密钥对（除非 --skip-keys 或密钥已存在）
 * 3. 加载模块元数据
 * 4. 创建空 registry
 * 5. 扫描 content/full/ 与 content/mobile/
 * 6. 批量分配模块与文档 ID
 * 7. 保存 registry 与 doc-id-map
 *
 * @param options - CLI 选项
 */
async function runInit(options: CliOptions): Promise<void> {
  console.log('[init-ids] 开始一次性初始化');
  console.log(`[init-ids]   仓库根: ${FANDEX_ROOT}`);
  console.log(`[init-ids]   模块元数据: ${options.modulesMeta}`);

  /* 步骤1：幂等性检查 */
  const registryPath = getDefaultRegistryPath();
  if (existsSync(registryPath) && !options.force) {
    console.error(`[init-ids] 错误：id-registry.json 已存在: ${registryPath}`);
    console.error('[init-ids] 如需重新初始化，请先备份后使用 --force 选项');
    process.exit(1);
  }

  const fullMapPath = getDefaultMapPathForType('full');
  const mobileMapPath = getDefaultMapPathForType('mobile');
  if ((existsSync(fullMapPath) || existsSync(mobileMapPath)) && !options.force) {
    console.error('[init-ids] 错误：doc-id-map 已存在，请先备份后使用 --force 选项');
    process.exit(1);
  }

  /* 步骤2：生成 Ed25519 密钥对 */
  if (options.skipKeys) {
    console.log('[init-ids] 跳过密钥生成（--skip-keys）');
  } else {
    await ensureKeyPair();
  }

  /* 步骤3：加载模块元数据 */
  const moduleNameMap = loadModuleNameMap(options.modulesMeta);
  console.log(`[init-ids] 已加载模块元数据（${moduleNameMap.size} 条）`);

  /* 步骤4：创建空 registry */
  let registry: IdRegistry = {
    registry_version: '1.0.0',
    updated_at: new Date().toISOString(),
    next_module_sequence: 0,
    modules: [],
    docs: [],
  };

  /* 步骤5+6：扫描并分配 full + mobile */
  registry = await processManifestType('full', registry, moduleNameMap);
  registry = await processManifestType('mobile', registry, moduleNameMap);

  /* 步骤7：保存 registry */
  saveIdRegistry(registry, registryPath);
  console.log('[init-ids] id-registry.json 已保存');
  console.log(`[init-ids]   模块数: ${registry.modules.length}`);
  console.log(`[init-ids]   文档数: ${registry.docs.length}`);

  console.log('[init-ids] 初始化完成');
  console.log('[init-ids] 下一步：运行 generate-manifest 生成未签名 manifest');
}

/**
 * 确保密钥对存在
 *
 * 流程：
 * 1. 若本地密钥已存在，跳过生成
 * 2. 否则生成新密钥对
 * 3. 保存到 ~/.fandex/keys/（私钥+公钥）
 * 4. 复制公钥到 tools/keys/public-key.hex（可入库）
 */
async function ensureKeyPair(): Promise<void> {
  const keysDir = getDefaultKeysDir();
  if (keyPairExists(keysDir)) {
    console.log(`[init-ids] 密钥对已存在，跳过生成: ${keysDir}`);
    /* 确保仓库内公钥副本存在 */
    ensureRepoPublicKeyCopy(keysDir);
    return;
  }

  console.log('[init-ids] 生成新的 Ed25519 密钥对...');
  const keyPair = await generateKeyPair();
  saveKeyPair(keyPair, keysDir);
  console.log(`[init-ids]   私钥已保存: ${join(keysDir, 'private-key.hex')}（权限 600）`);
  console.log(`[init-ids]   公钥已保存: ${join(keysDir, 'public-key.hex')}（权限 644）`);

  /* 复制公钥到仓库内（可入库） */
  ensureRepoPublicKeyCopy(keysDir, keyPair.publicKey);

  console.log('[init-ids] 密钥对生成完成');
  console.log('[init-ids]   公钥指纹: ' + computeFingerprintBrief(keyPair.publicKey));
}

/**
 * 确保仓库内公钥副本存在
 *
 * 若 tools/keys/public-key.hex 不存在，从本地密钥目录复制；若提供了 publicKeyHex，直接写入。
 *
 * @param keysDir - 本地密钥目录
 * @param publicKeyHex - 公钥（hex，可选）
 */
function ensureRepoPublicKeyCopy(keysDir: string, publicKeyHex?: string): void {
  if (!existsSync(REPO_PUBLIC_KEY_PATH)) {
    const dir = dirname(REPO_PUBLIC_KEY_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (publicKeyHex) {
      writeFileSync(REPO_PUBLIC_KEY_PATH, `${publicKeyHex.toLowerCase()}\n`, 'utf-8');
    } else {
      const src = join(keysDir, 'public-key.hex');
      if (existsSync(src)) {
        copyFileSync(src, REPO_PUBLIC_KEY_PATH);
      }
    }
    console.log(`[init-ids]   公钥副本已写入仓库: ${REPO_PUBLIC_KEY_PATH}（可入库）`);
  }
}

/**
 * 计算公钥指纹简写（前 16 字符）
 *
 * 复用 ed25519 模块的指纹逻辑（避免循环依赖，此处直接计算）
 *
 * @param publicKeyHex - 公钥（hex 编码）
 * @returns 公钥指纹前 16 字符
 */
function computeFingerprintBrief(publicKeyHex: string): string {
  return createHash('sha256').update(publicKeyHex, 'hex').digest('hex').slice(0, 16);
}

/**
 * 加载模块元数据，构建 english_short → 中文名 映射
 *
 * @param metaPath - 模块元数据文件路径
 * @returns Map<english_short, title>
 */
function loadModuleNameMap(metaPath: string): Map<string, string> {
  if (!existsSync(metaPath)) {
    console.warn(`[init-ids] 模块元数据文件不存在: ${metaPath}，将使用目录名作为模块名`);
    return new Map();
  }
  const content = readFileSync(metaPath, 'utf-8');
  const data = JSON.parse(content) as { modules?: ModuleMetaEntry[] };
  const map = new Map<string, string>();
  if (Array.isArray(data.modules)) {
    for (const m of data.modules) {
      if (m.id && m.title) {
        map.set(m.id, m.title);
      }
    }
  }
  return map;
}

/**
 * 处理单个 manifest 类型（full 或 mobile）
 *
 * 流程：
 * 1. 扫描内容目录
 * 2. 为每个模块分配 ID（若未分配）
 * 3. 为每个文档分配 ID 并写入 doc-id-map
 *
 * @param manifestType - manifest 类型
 * @param registry - 当前 registry（会被修改）
 * @param moduleNameMap - 模块名映射
 * @returns 更新后的 registry
 */
async function processManifestType(
  manifestType: ManifestType,
  registry: IdRegistry,
  moduleNameMap: Map<string, string>,
): Promise<IdRegistry> {
  console.log(`[init-ids] 处理 manifest 类型: ${manifestType}`);

  const contentDir = join(FANDEX_ROOT, 'cnt-content', manifestType);
  if (!existsSync(contentDir)) {
    console.warn(`[init-ids] 内容目录不存在，跳过: ${contentDir}`);
    return registry;
  }

  /* 扫描内容 */
  const scanResult = await scanContentDir(contentDir);
  console.log(
    `[init-ids]   扫描到 ${scanResult.modules.length} 个模块，共 ${scanResult.modules.reduce((s, m) => s + m.docs.length, 0)} 篇文档`,
  );

  /* 加载或创建 doc-id-map */
  const docIdMap = loadDocIdMap(manifestType);

  let moduleAllocated = 0;
  let moduleSkipped = 0;
  let docAllocated = 0;
  let docSkipped = 0;

  for (const scannedModule of scanResult.modules) {
    /* 检查模块是否已分配（active） */
    const existingModule = registry.modules.find(
      (m) => m.english_short === scannedModule.english_short && m.status === 'active',
    );

    let moduleId: string;
    if (existingModule) {
      /* 模块已分配，复用 */
      moduleId = existingModule.module_id;
      moduleSkipped++;
    } else {
      /* 分配新模块 ID */
      const name = moduleNameMap.get(scannedModule.english_short) || scannedModule.english_short;
      const result = allocateModuleId(registry, scannedModule.english_short, name);
      moduleId = result.module_id;
      moduleAllocated++;
      console.log(`[init-ids]   分配模块: ${moduleId} (${scannedModule.english_short} → ${name})`);
    }

    /* 分配文档 ID */
    for (const scannedDoc of scannedModule.docs) {
      /* 检查 source_path 是否已映射 */
      const existingDocId = docIdMap.mappings[scannedDoc.source_path];
      if (existingDocId) {
        docSkipped++;
        continue;
      }

      /* 分配新 doc_id */
      const result = allocateDocId(registry, moduleId, scannedDoc.title);
      addMapping(docIdMap, scannedDoc.source_path, result.doc_id);
      docAllocated++;
    }
  }

  /* 保存 doc-id-map */
  saveDocIdMap(docIdMap);

  console.log(
    `[init-ids]   ${manifestType} 完成: 模块新增 ${moduleAllocated} / 复用 ${moduleSkipped}，文档新增 ${docAllocated} / 复用 ${docSkipped}`,
  );

  return registry;
}

/* 执行主函数 */
main().catch((err) => {
  console.error('[init-ids] 执行失败:', err);
  process.exit(1);
});
