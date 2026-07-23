/**
 * generate-manifest CLI 入口
 *
 * 功能概述：
 * 扫描 cnt-content/full/ 或 cnt-content/mobile/ 目录，结合 id-registry 与 doc-id-map，
 * 生成未签名 manifest（不含 signature 字段），输出到 dist/manifests/{type}.manifest.unsigned.json。
 * 后续由 sign-manifest CLI 读取未签名 manifest 并添加 Ed25519 签名。
 *
 * 设计目的：
 * - 将"扫描物理文件"与"签名"解耦，便于本地预览与 CI 分阶段执行
 * - 通过 id-registry 与 doc-id-map 强制 ID 必须先分配，避免运行时分配导致 ID 漂移
 * - 未签名 manifest 不通过 Schema 验证（缺少 signature 字段），由 sign-manifest 完成后统一验证
 *
 * 使用方式：
 *   pnpm generate-manifest --type full
 *   pnpm generate-manifest --type mobile --app-compat-version 3.1.0
 *   pnpm generate-manifest --type full --modules-meta shd-shared/metadata/modules.json
 *
 * 退出码：
 * - 0：成功
 * - 1：参数错误、ID 未分配、扫描失败、写入失败
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import {
  loadIdRegistry,
  getDefaultRegistryPath,
  getDocRecord,
} from './lib/id-registry';
import { loadDocIdMap, getDefaultMapPathForType } from './lib/doc-id-map';
import { scanContentDir, type ScannedModule } from './lib/content-scanner';
import type { Doc, Manifest, ManifestType, Module } from './lib/types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** FANDEX 仓库根目录（tls-tools/src/ → tls-tools/ → FANDEX/） */
const FANDEX_ROOT = resolve(__dirname, '..', '..');

/** 默认内容目录（cnt-content/full/ 或 cnt-content/mobile/） */
function defaultContentDir(type: ManifestType): string {
  return join(FANDEX_ROOT, 'cnt-content', type);
}

/** 默认输出目录（dist/manifests/） */
const DEFAULT_OUTPUT_DIR = join(FANDEX_ROOT, 'dist', 'manifests');

/** 默认 manifest 版本号 */
const DEFAULT_MANIFEST_VERSION = '1.0.0';

/** 模块元数据覆盖文件类型（用于覆盖模块中文名、icon、color、description） */
interface ModuleMetaOverride {
  /** 模块英文简称（小写） */
  english_short: string;
  /** 模块显示名称（中文） */
  name?: string;
  /** 模块图标标识 */
  icon?: string;
  /** 模块主题色（hex） */
  color?: string;
  /** 模块简介 */
  description?: string;
}

/**
 * 程序入口
 *
 * 解析 CLI 参数，执行扫描与 manifest 生成流程
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('generate-manifest')
    .description('扫描 cnt-content/ 目录生成未签名 manifest')
    .option(
      '-t, --type <type>',
      'manifest 类型（full 或 mobile）',
      'full',
    )
    .option(
      '--content-dir <path>',
      '内容目录绝对路径（默认 cnt-content/{type}/）',
    )
    .option(
      '-o, --output <path>',
      '输出文件路径（默认 dist/manifests/{type}.manifest.unsigned.json）',
    )
    .option(
      '--app-compat-version <version>',
      '此 manifest 兼容的应用最低版本（语义化版本，如 3.1.0）',
      process.env.FANDEX_APP_COMPAT_VERSION || '1.0.0',
    )
    .option(
      '--manifest-version <version>',
      'manifest Schema 版本号',
      DEFAULT_MANIFEST_VERSION,
    )
    .option(
      '--modules-meta <path>',
      '模块元数据覆盖文件路径（JSON 数组，用于覆盖模块中文名、icon、color 等）',
    )
    .option(
      '--registry <path>',
      'id-registry.json 路径（默认 cnt-content/full/_id-registry.json）',
      getDefaultRegistryPath(),
    )
    .option(
      '--doc-id-map <path>',
      'doc-id-map 路径（默认 cnt-content/full/_doc-id-map.json，mobile 已归档）',
    )
    .action(async (options) => {
      await runGenerate(options);
    });

  await program.parseAsync(process.argv);
}

/** CLI 选项类型 */
interface CliOptions {
  type: string;
  contentDir?: string;
  output?: string;
  appCompatVersion: string;
  manifestVersion: string;
  modulesMeta?: string;
  registry: string;
  docIdMap?: string;
}

/**
 * 执行 manifest 生成流程
 *
 * 流程：
 * 1. 校验 type 参数
 * 2. 加载 id-registry 与 doc-id-map
 * 3. 加载模块元数据覆盖（可选）
 * 4. 扫描内容目录
 * 5. 将扫描结果映射为带 ID 的 manifest 数据
 * 6. 组装 Manifest 对象（不含 signature）
 * 7. 输出未签名 manifest 文件
 *
 * @param options - CLI 选项
 */
async function runGenerate(options: CliOptions): Promise<void> {
  /* 校验 type 参数 */
  if (options.type !== 'full' && options.type !== 'mobile') {
    console.error(`[generate-manifest] 错误：--type 必须为 full 或 mobile，当前为 ${options.type}`);
    process.exit(1);
  }
  const manifestType: ManifestType = options.type;

  /* 校验 app_compat_version 格式 */
  if (!/^\d+\.\d+\.\d+$/.test(options.appCompatVersion)) {
    console.error(
      `[generate-manifest] 错误：--app-compat-version 必须为语义化版本（如 3.1.0），当前为 ${options.appCompatVersion}`,
    );
    process.exit(1);
  }

  /* 校验 manifest_version 格式 */
  if (!/^\d+\.\d+\.\d+$/.test(options.manifestVersion)) {
    console.error(
      `[generate-manifest] 错误：--manifest-version 必须为语义化版本，当前为 ${options.manifestVersion}`,
    );
    process.exit(1);
  }

  /* 解析路径 */
  const contentDir = options.contentDir
    ? resolve(options.contentDir)
    : defaultContentDir(manifestType);

  const outputPath = options.output
    ? resolve(options.output)
    : join(DEFAULT_OUTPUT_DIR, `${manifestType}.manifest.unsigned.json`);

  const docIdMapPath = options.docIdMap
    ? resolve(options.docIdMap)
    : getDefaultMapPathForType(manifestType);

  console.log('[generate-manifest] 开始生成 manifest');
  console.log(`[generate-manifest]   类型: ${manifestType}`);
  console.log(`[generate-manifest]   内容目录: ${contentDir}`);
  console.log(`[generate-manifest]   id-registry: ${options.registry}`);
  console.log(`[generate-manifest]   doc-id-map: ${docIdMapPath}`);
  console.log(`[generate-manifest]   输出路径: ${outputPath}`);
  console.log(`[generate-manifest]   manifest_version: ${options.manifestVersion}`);
  console.log(`[generate-manifest]   app_compat_version: ${options.appCompatVersion}`);

  /* 加载 id-registry 与 doc-id-map */
  const registry = loadIdRegistry(options.registry);
  const docIdMap = loadDocIdMap(manifestType, docIdMapPath);

  /* 加载模块元数据覆盖（可选） */
  const moduleMetaOverrides = await loadModuleMetaOverrides(options.modulesMeta);
  if (moduleMetaOverrides) {
    console.log(`[generate-manifest]   已加载模块元数据覆盖（${moduleMetaOverrides.length} 条）`);
  }

  /* 扫描内容目录 */
  console.log('[generate-manifest] 扫描内容目录...');
  const scanResult = await scanContentDir(contentDir);
  console.log(
    `[generate-manifest]   扫描到 ${scanResult.modules.length} 个模块，共 ${scanResult.modules.reduce((sum, m) => sum + m.docs.length, 0)} 篇文档`,
  );

  /* 将扫描结果映射为带 ID 的 manifest 数据 */
  const { modules, docs, errors } = mapScanResultToManifest(
    scanResult.modules,
    registry,
    docIdMap.mappings,
    moduleMetaOverrides,
  );

  /* ID 未分配错误处理 */
  if (errors.length > 0) {
    console.error('[generate-manifest] 错误：扫描结果与 ID 注册表/映射不匹配，请先调用 allocate-id 分配 ID');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  /* 组装 Manifest 对象（不含 signature） */
  const manifest: Omit<Manifest, 'signature'> = {
    manifest_version: options.manifestVersion,
    manifest_type: manifestType,
    generated_at: new Date().toISOString(),
    app_compat_version: options.appCompatVersion,
    modules,
    docs,
  };

  /* 输出未签名 manifest */
  await mkdir(dirname(outputPath), { recursive: true });
  const json = JSON.stringify(manifest, null, 2);
  await writeFile(outputPath, `${json}\n`, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[generate-manifest] manifest 生成完成');
  console.log(`[generate-manifest]   模块数: ${modules.length}`);
  console.log(`[generate-manifest]   文档数: ${docs.length}`);
  console.log(`[generate-manifest]   文件大小: ${sizeKB} KB`);
  console.log(`[generate-manifest]   输出路径: ${outputPath}`);
  console.log('[generate-manifest] 下一步：运行 sign-manifest 添加 Ed25519 签名');
}

/**
 * 将扫描结果映射为带 ID 的 manifest 数据
 *
 * 流程：
 * 1. 对每个扫描到的模块：
 *    - 在 id-registry 中查找 active 且 english_short 匹配的模块
 *    - 若不存在：记录错误
 *    - 若存在：构造 Module 对象，应用元数据覆盖
 * 2. 对每个扫描到的文档：
 *    - 在 doc-id-map 中查找 source_path → doc_id
 *    - 若不存在：记录错误
 *    - 若存在：构造 Doc 对象
 *
 * @param scannedModules - 扫描到的模块列表
 * @param registry - ID 注册表
 * @param docIdMappings - doc-id-map 的 mappings 字段
 * @param moduleMetaOverrides - 模块元数据覆盖（可选）
 * @returns 模块列表、文档列表、错误列表
 */
function mapScanResultToManifest(
  scannedModules: ScannedModule[],
  registry: ReturnType<typeof loadIdRegistry>,
  docIdMappings: Record<string, string>,
  moduleMetaOverrides: ModuleMetaOverride[] | null,
): {
  modules: Module[];
  docs: Doc[];
  errors: string[];
} {
  const modules: Module[] = [];
  const docs: Doc[] = [];
  const errors: string[] = [];

  /* 构建模块元数据覆盖查找表 */
  const metaOverrideMap = new Map<string, ModuleMetaOverride>();
  if (moduleMetaOverrides) {
    for (const override of moduleMetaOverrides) {
      metaOverrideMap.set(override.english_short, override);
    }
  }

  /* 遍历扫描到的模块 */
  for (const scannedModule of scannedModules) {
    /* 在 id-registry 中查找 active 且 english_short 匹配的模块 */
    const moduleRecord = registry.modules.find(
      (m) => m.english_short === scannedModule.english_short && m.status === 'active',
    );

    if (!moduleRecord) {
      errors.push(
        `模块未在 id-registry 中分配 ID: ${scannedModule.english_short}（请先运行 allocate-id --type module --english-short ${scannedModule.english_short} --name "${scannedModule.name}"）`,
      );
      continue;
    }

    /* 应用元数据覆盖 */
    const override = metaOverrideMap.get(scannedModule.english_short);
    const moduleName = override?.name || moduleRecord.name || scannedModule.name;

    /* 构造 Module 对象 */
    const module: Module = {
      module_id: moduleRecord.module_id,
      name: moduleName,
      english_short: moduleRecord.english_short,
      sequence: moduleRecord.sequence,
      docs_count: scannedModule.docs.length,
    };
    if (override?.icon) {
      module.icon = override.icon;
    }
    if (override?.color) {
      module.color = override.color;
    }
    if (override?.description) {
      module.description = override.description;
    }
    modules.push(module);

    /* 遍历此模块下的文档 */
    for (const scannedDoc of scannedModule.docs) {
      /* 在 doc-id-map 中查找 source_path → doc_id */
      const docId = docIdMappings[scannedDoc.source_path];
      if (!docId) {
        errors.push(
          `文档未在 doc-id-map 中映射: ${scannedDoc.source_path}（请先运行 allocate-id --type doc --module-id ${moduleRecord.module_id} --source-path "${scannedDoc.source_path}" --title "${scannedDoc.title}"）`,
        );
        continue;
      }

      /* 校验 doc_id 在 id-registry 中存在且 active */
      const docRecord = getDocRecord(registry, docId);
      if (!docRecord) {
        errors.push(
          `doc_id ${docId}（${scannedDoc.source_path}）在 id-registry 中不存在，doc-id-map 与 id-registry 不一致`,
        );
        continue;
      }
      if (docRecord.status !== 'active') {
        errors.push(
          `doc_id ${docId}（${scannedDoc.source_path}）在 id-registry 中状态为 ${docRecord.status}，应先恢复为 active`,
        );
        continue;
      }
      if (docRecord.module_id !== moduleRecord.module_id) {
        errors.push(
          `doc_id ${docId}（${scannedDoc.source_path}）归属模块 ${docRecord.module_id}，与扫描到的模块 ${moduleRecord.module_id} 不一致`,
        );
        continue;
      }

      /* 构造 Doc 对象 */
      const doc: Doc = {
        doc_id: docId,
        module_id: moduleRecord.module_id,
        title: scannedDoc.title,
        source_path: scannedDoc.source_path,
        sha256: scannedDoc.sha256,
        size: scannedDoc.size,
        updated_at: scannedDoc.updated_at,
      };
      if (scannedDoc.compat_version) {
        doc.compat_version = scannedDoc.compat_version;
      }
      if (scannedDoc.tags && scannedDoc.tags.length > 0) {
        doc.tags = scannedDoc.tags;
      }
      docs.push(doc);
    }
  }

  /* 模块按 sequence 排序，文档按 module_id + doc_id 排序 */
  modules.sort((a, b) => a.sequence - b.sequence);
  docs.sort((a, b) => {
    if (a.module_id !== b.module_id) {
      return a.module_id.localeCompare(b.module_id);
    }
    return a.doc_id.localeCompare(b.doc_id);
  });

  return { modules, docs, errors };
}

/**
 * 加载模块元数据覆盖文件
 *
 * 输入：文件路径（可选）
 * 输出：ModuleMetaOverride 数组（文件不存在或解析失败返回 null）
 *
 * @param metaPath - 元数据文件路径（可选）
 * @returns 元数据覆盖数组或 null
 */
async function loadModuleMetaOverrides(
  metaPath?: string,
): Promise<ModuleMetaOverride[] | null> {
  if (!metaPath) {
    return null;
  }

  const absolutePath = resolve(metaPath);
  try {
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(absolutePath, 'utf-8');
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      console.warn(`[generate-manifest] 模块元数据覆盖文件应为 JSON 数组: ${absolutePath}`);
      return null;
    }

    return data as ModuleMetaOverride[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[generate-manifest] 加载模块元数据覆盖文件失败: ${absolutePath} - ${message}`);
    return null;
  }
}

/* 执行主函数 */
main().catch((err) => {
  console.error('[generate-manifest] 执行失败:', err);
  process.exit(1);
});
