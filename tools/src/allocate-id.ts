/**
 * allocate-id CLI 入口
 *
 * 功能概述：
 * 分配或退役 module_id / doc_id，同步更新 id-registry.json 与 doc-id-map-{type}.json。
 * 所有 ID 一旦分配永不复用，retired 后永久封存。
 *
 * 子命令：
 * - module: 分配新 module_id（自动检测 english_short 未被占用，分配最小未占用 sequence）
 * - doc: 分配新 doc_id（在指定 module_id 下分配最小未占用 sequence，并在 doc-id-map 添加映射）
 * - retire-module: 退役 module_id（同时退役其下所有 active 文档，并清理 doc-id-map 中对应映射）
 * - retire-doc: 退役 doc_id（同时清理 doc-id-map 中对应映射）
 * - rename-doc: 文档改名（doc_id 不变，仅更新 doc-id-map 中的 source_path 映射）
 * - list: 列出所有 ID（modules 与 docs）
 *
 * 使用方式：
 *   pnpm allocate-id module --english-short rust --name "Rust"
 *   pnpm allocate-id doc --module-id Model_Java_00 --source-path "java/泛型详解.md" --title "泛型详解" --manifest-type full
 *   pnpm allocate-id retire-doc --doc-id Doc_Java_00_005
 *   pnpm allocate-id rename-doc --doc-id Doc_Java_00_001 --new-source-path "java/intro.md" --manifest-type full
 *   pnpm allocate-id list
 *
 * 退出码：
 * - 0：成功
 * - 1：参数错误、ID 已存在、ID 不存在、状态非法、写入失败
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  loadIdRegistry,
  saveIdRegistry,
  allocateModuleId,
  allocateDocId,
  retireModuleId,
  retireDocId,
  getDefaultRegistryPath,
  getModuleRecord,
  getDocRecord,
} from './lib/id-registry';
import {
  loadDocIdMap,
  saveDocIdMap,
  addMapping,
  removeMapping,
  renameMapping,
  lookupSourcePaths,
  getDefaultMapPathForType,
} from './lib/doc-id-map';
import type { ManifestType } from './lib/types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** FANDEX 仓库根目录 */
const FANDEX_ROOT = resolve(__dirname, '..', '..');

/**
 * 程序入口
 *
 * 定义子命令与全局选项
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('allocate-id')
    .description('分配或退役 module_id / doc_id，同步更新 id-registry 与 doc-id-map')
    .option(
      '--registry <path>',
      'id-registry.json 路径（默认 FANDEX/id-registry.json）',
      getDefaultRegistryPath(),
    );

  /* 子命令：分配新 module_id */
  program
    .command('module')
    .description('分配新 module_id')
    .requiredOption('--english-short <short>', '模块英文简称（小写字母+数字，首字符为字母）')
    .requiredOption('--name <name>', '模块显示名称（中文）')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await allocateModule(opts.registry, cmdOpts.englishShort, cmdOpts.name);
    });

  /* 子命令：分配新 doc_id */
  program
    .command('doc')
    .description('分配新 doc_id')
    .requiredOption('--module-id <id>', '所属模块 ID（如 Model_Java_00）')
    .requiredOption('--source-path <path>', '文档源路径（相对 content/{type}/）')
    .requiredOption('--title <title>', '文档标题')
    .requiredOption(
      '--manifest-type <type>',
      'manifest 类型（full 或 mobile，决定写入哪个 doc-id-map）',
    )
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await allocateDoc(
        opts.registry,
        cmdOpts.moduleId,
        cmdOpts.sourcePath,
        cmdOpts.title,
        parseManifestType(cmdOpts.manifestType),
      );
    });

  /* 子命令：退役 module_id */
  program
    .command('retire-module')
    .description('退役 module_id（同时退役其下所有 active 文档）')
    .requiredOption('--module-id <id>', '待退役的 module_id')
    .option('--manifest-type <type>', '同时清理哪个 doc-id-map（full 或 mobile）')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await retireModule(opts.registry, cmdOpts.moduleId, cmdOpts.manifestType);
    });

  /* 子命令：退役 doc_id */
  program
    .command('retire-doc')
    .description('退役 doc_id（同时清理 doc-id-map 中的映射）')
    .requiredOption('--doc-id <id>', '待退役的 doc_id')
    .option('--manifest-type <type>', '同时清理哪个 doc-id-map（full 或 mobile）')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await retireDocAction(opts.registry, cmdOpts.docId, cmdOpts.manifestType);
    });

  /* 子命令：文档改名（doc_id 不变，仅更新 source_path 映射） */
  program
    .command('rename-doc')
    .description('文档改名（doc_id 不变，仅更新 doc-id-map 中的 source_path）')
    .requiredOption('--doc-id <id>', '文档 ID')
    .requiredOption('--new-source-path <path>', '新源路径')
    .requiredOption('--manifest-type <type>', 'manifest 类型（full 或 mobile）')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await renameDoc(
        opts.registry,
        cmdOpts.docId,
        cmdOpts.newSourcePath,
        parseManifestType(cmdOpts.manifestType),
      );
    });

  /* 子命令：列出所有 ID */
  program
    .command('list')
    .description('列出所有已分配的 ID（modules 与 docs）')
    .option('--status <status>', '过滤状态（active 或 retired，默认全部）')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      await listIds(opts.registry, cmdOpts.status);
    });

  await program.parseAsync(process.argv);
}

/**
 * 分配新 module_id
 *
 * 流程：
 * 1. 加载 id-registry
 * 2. 调用 allocateModuleId 分配 ID（自动检测 english_short 未被占用）
 * 3. 保存 id-registry
 * 4. 输出分配结果
 *
 * @param registryPath - id-registry.json 路径
 * @param englishShort - 模块英文简称
 * @param name - 模块中文名
 */
async function allocateModule(
  registryPath: string,
  englishShort: string,
  name: string,
): Promise<void> {
  console.log('[allocate-id] 分配新 module_id');
  console.log(`[allocate-id]   english_short: ${englishShort}`);
  console.log(`[allocate-id]   name: ${name}`);

  const registry = loadIdRegistry(registryPath);
  const result = allocateModuleId(registry, englishShort, name);
  saveIdRegistry(registry, registryPath);

  console.log('[allocate-id] 分配成功');
  console.log(`[allocate-id]   module_id: ${result.module_id}`);
  console.log(`[allocate-id]   sequence: ${result.sequence}`);
  console.log(`[allocate-id]   已写入: ${registryPath}`);
}

/**
 * 分配新 doc_id
 *
 * 流程：
 * 1. 加载 id-registry
 * 2. 调用 allocateDocId 分配 ID（自动检测 module_id 存在且 active）
 * 3. 加载 doc-id-map
 * 4. 在 doc-id-map 中添加 source_path → doc_id 映射
 * 5. 保存 id-registry 与 doc-id-map
 * 6. 输出分配结果
 *
 * @param registryPath - id-registry.json 路径
 * @param moduleId - 所属模块 ID
 * @param sourcePath - 文档源路径
 * @param title - 文档标题
 * @param manifestType - manifest 类型（决定写入哪个 doc-id-map）
 */
async function allocateDoc(
  registryPath: string,
  moduleId: string,
  sourcePath: string,
  title: string,
  manifestType: ManifestType,
): Promise<void> {
  console.log('[allocate-id] 分配新 doc_id');
  console.log(`[allocate-id]   module_id: ${moduleId}`);
  console.log(`[allocate-id]   source_path: ${sourcePath}`);
  console.log(`[allocate-id]   title: ${title}`);
  console.log(`[allocate-id]   manifest_type: ${manifestType}`);

  const registry = loadIdRegistry(registryPath);
  const result = allocateDocId(registry, moduleId, title);

  /* 同步更新 doc-id-map */
  const docIdMapPath = getDefaultMapPathForType(manifestType);
  const docIdMap = loadDocIdMap(manifestType, docIdMapPath);
  addMapping(docIdMap, sourcePath, result.doc_id);
  saveDocIdMap(docIdMap, docIdMapPath);

  /* 保存 id-registry */
  saveIdRegistry(registry, registryPath);

  console.log('[allocate-id] 分配成功');
  console.log(`[allocate-id]   doc_id: ${result.doc_id}`);
  console.log(`[allocate-id]   sequence: ${result.sequence}`);
  console.log(`[allocate-id]   已写入 id-registry: ${registryPath}`);
  console.log(`[allocate-id]   已写入 doc-id-map: ${docIdMapPath}`);
}

/**
 * 退役 module_id
 *
 * 流程：
 * 1. 加载 id-registry
 * 2. 调用 retireModuleId 退役模块（同时退役其下所有 active 文档）
 * 3. 若指定 manifest-type，清理 doc-id-map 中此模块下所有文档的映射
 * 4. 保存 id-registry（与 doc-id-map）
 *
 * @param registryPath - id-registry.json 路径
 * @param moduleId - 待退役的 module_id
 * @param manifestTypeStr - manifest 类型字符串（可选，决定清理哪个 doc-id-map）
 */
async function retireModule(
  registryPath: string,
  moduleId: string,
  manifestTypeStr?: string,
): Promise<void> {
  console.log('[allocate-id] 退役 module_id');
  console.log(`[allocate-id]   module_id: ${moduleId}`);

  const registry = loadIdRegistry(registryPath);

  /* 收集此模块下所有 active 文档的 doc_id（用于清理 doc-id-map） */
  const docsToClean = registry.docs.filter(
    (d) => d.module_id === moduleId && d.status === 'active',
  );

  retireModuleId(registry, moduleId);
  saveIdRegistry(registry, registryPath);

  /* 清理 doc-id-map（若指定 manifest-type） */
  if (manifestTypeStr) {
    const manifestType = parseManifestType(manifestTypeStr);
    const docIdMapPath = getDefaultMapPathForType(manifestType);
    const docIdMap = loadDocIdMap(manifestType, docIdMapPath);
    let cleanedCount = 0;
    for (const doc of docsToClean) {
      const sourcePaths = lookupSourcePaths(docIdMap, doc.doc_id);
      for (const path of sourcePaths) {
        if (removeMapping(docIdMap, path)) {
          cleanedCount++;
        }
      }
    }
    saveDocIdMap(docIdMap, docIdMapPath);
    console.log(`[allocate-id]   已清理 doc-id-map（${manifestType}）中 ${cleanedCount} 条映射`);
  }

  console.log('[allocate-id] 退役成功');
  console.log(`[allocate-id]   同时退役 ${docsToClean.length} 个 active 文档`);
}

/**
 * 退役 doc_id
 *
 * 流程：
 * 1. 加载 id-registry
 * 2. 调用 retireDocId 退役文档
 * 3. 若指定 manifest-type，清理 doc-id-map 中此 doc_id 的映射
 * 4. 保存 id-registry（与 doc-id-map）
 *
 * @param registryPath - id-registry.json 路径
 * @param docId - 待退役的 doc_id
 * @param manifestTypeStr - manifest 类型字符串（可选）
 */
async function retireDocAction(
  registryPath: string,
  docId: string,
  manifestTypeStr?: string,
): Promise<void> {
  console.log('[allocate-id] 退役 doc_id');
  console.log(`[allocate-id]   doc_id: ${docId}`);

  const registry = loadIdRegistry(registryPath);
  retireDocId(registry, docId);
  saveIdRegistry(registry, registryPath);

  /* 清理 doc-id-map（若指定 manifest-type） */
  if (manifestTypeStr) {
    const manifestType = parseManifestType(manifestTypeStr);
    const docIdMapPath = getDefaultMapPathForType(manifestType);
    const docIdMap = loadDocIdMap(manifestType, docIdMapPath);
    const sourcePaths = lookupSourcePaths(docIdMap, docId);
    let cleanedCount = 0;
    for (const path of sourcePaths) {
      if (removeMapping(docIdMap, path)) {
        cleanedCount++;
      }
    }
    saveDocIdMap(docIdMap, docIdMapPath);
    console.log(`[allocate-id]   已清理 doc-id-map（${manifestType}）中 ${cleanedCount} 条映射`);
  }

  console.log('[allocate-id] 退役成功');
}

/**
 * 文档改名（doc_id 不变，仅更新 doc-id-map 中的 source_path 映射）
 *
 * 流程：
 * 1. 加载 id-registry（校验 doc_id 存在且 active）
 * 2. 加载 doc-id-map
 * 3. 查找 doc_id 当前对应的 source_path
 * 4. 调用 renameMapping 更新映射（doc_id 不变）
 * 5. 保存 doc-id-map
 *
 * 注意：id-registry 不变（doc_id 与文档标题首次分配时记录，改名不改 title）
 *      若需更新 title，可在 id-registry 中手动修改（但不推荐，title 仅用于追溯）
 *
 * @param registryPath - id-registry.json 路径
 * @param docId - 文档 ID
 * @param newSourcePath - 新源路径
 * @param manifestType - manifest 类型
 */
async function renameDoc(
  registryPath: string,
  docId: string,
  newSourcePath: string,
  manifestType: ManifestType,
): Promise<void> {
  console.log('[allocate-id] 文档改名');
  console.log(`[allocate-id]   doc_id: ${docId}`);
  console.log(`[allocate-id]   new_source_path: ${newSourcePath}`);
  console.log(`[allocate-id]   manifest_type: ${manifestType}`);

  /* 校验 doc_id 存在且 active */
  const registry = loadIdRegistry(registryPath);
  const docRecord = getDocRecord(registry, docId);
  if (!docRecord) {
    console.error(`[allocate-id] 错误：doc_id 不存在: ${docId}`);
    process.exit(1);
  }
  if (docRecord.status !== 'active') {
    console.error(`[allocate-id] 错误：doc_id 状态为 ${docRecord.status}，无法改名`);
    process.exit(1);
  }

  /* 加载 doc-id-map，查找当前 source_path */
  const docIdMapPath = getDefaultMapPathForType(manifestType);
  const docIdMap = loadDocIdMap(manifestType, docIdMapPath);
  const currentPaths = lookupSourcePaths(docIdMap, docId);
  if (currentPaths.length === 0) {
    console.error(`[allocate-id] 错误：doc_id ${docId} 在 doc-id-map（${manifestType}）中无映射`);
    process.exit(1);
  }
  if (currentPaths.length > 1) {
    console.warn(
      `[allocate-id] 警告：doc_id ${docId} 在 doc-id-map 中有 ${currentPaths.length} 条映射（应为 1），将仅重命名第一条`,
    );
  }

  const oldPath = currentPaths[0]!;
  renameMapping(docIdMap, oldPath, newSourcePath);
  saveDocIdMap(docIdMap, docIdMapPath);

  console.log('[allocate-id] 改名成功');
  console.log(`[allocate-id]   旧 source_path: ${oldPath}`);
  console.log(`[allocate-id]   新 source_path: ${newSourcePath}`);
  console.log(`[allocate-id]   doc_id 保持不变: ${docId}`);
  console.log(`[allocate-id]   已写入 doc-id-map: ${docIdMapPath}`);
}

/**
 * 列出所有 ID
 *
 * @param registryPath - id-registry.json 路径
 * @param statusFilter - 状态过滤（active 或 retired，可选）
 */
async function listIds(registryPath: string, statusFilter?: string): Promise<void> {
  const registry = loadIdRegistry(registryPath);

  /* 校验 status 过滤值 */
  if (statusFilter && statusFilter !== 'active' && statusFilter !== 'retired') {
    console.error(`[allocate-id] 错误：--status 必须为 active 或 retired，当前为 ${statusFilter}`);
    process.exit(1);
  }

  console.log('[allocate-id] ID 列表');
  console.log(`[allocate-id]   registry_path: ${registryPath}`);
  console.log(`[allocate-id]   updated_at: ${registry.updated_at}`);
  console.log(`[allocate-id]   next_module_sequence: ${registry.next_module_sequence ?? '(未计算)'}`);

  /* 列出 modules */
  const modules = statusFilter
    ? registry.modules.filter((m) => m.status === statusFilter)
    : registry.modules;
  console.log(`\n[allocate-id] 模块（共 ${modules.length} 个${statusFilter ? `，状态=${statusFilter}` : ''}）：`);
  console.log('  module_id                  | english_short | seq | status   | name');
  console.log('  ---------------------------|---------------|-----|----------|--------');
  for (const m of modules) {
    const moduleIdPadded = m.module_id.padEnd(27);
    const englishShortPadded = m.english_short.padEnd(13);
    const seqPadded = String(m.sequence).padStart(3).padEnd(3);
    const statusPadded = m.status.padEnd(8);
    console.log(`  ${moduleIdPadded} | ${englishShortPadded} | ${seqPadded} | ${statusPadded} | ${m.name}`);
  }

  /* 列出 docs */
  const docs = statusFilter
    ? registry.docs.filter((d) => d.status === statusFilter)
    : registry.docs;
  console.log(`\n[allocate-id] 文档（共 ${docs.length} 个${statusFilter ? `，状态=${statusFilter}` : ''}）：`);
  console.log('  doc_id                       | module_id          | seq | status   | title');
  console.log('  ------------------------------|--------------------|-----|----------|-------');
  for (const d of docs) {
    const docIdPadded = d.doc_id.padEnd(30);
    const moduleIdPadded = d.module_id.padEnd(18);
    const seqPadded = String(d.sequence).padStart(3).padEnd(3);
    const statusPadded = d.status.padEnd(8);
    console.log(`  ${docIdPadded} | ${moduleIdPadded} | ${seqPadded} | ${statusPadded} | ${d.title}`);
  }
}

/**
 * 解析 manifest 类型字符串
 *
 * @param value - 字符串值
 * @returns ManifestType
 * @throws {Error} 值非法时退出进程
 */
function parseManifestType(value: string): ManifestType {
  if (value !== 'full' && value !== 'mobile') {
    console.error(`[allocate-id] 错误：--manifest-type 必须为 full 或 mobile，当前为 ${value}`);
    process.exit(1);
  }
  return value;
}

/* 执行主函数 */
main().catch((err) => {
  console.error('[allocate-id] 执行失败:', err);
  process.exit(1);
});
