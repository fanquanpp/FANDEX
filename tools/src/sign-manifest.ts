/**
 * sign-manifest CLI 入口
 *
 * 功能概述：
 * 读取未签名 manifest（generate-manifest 输出的 dist/manifests/{type}.manifest.unsigned.json），
 * 使用 Ed25519 私钥对其签名，输出已签名 manifest（dist/manifests/{type}.manifest.json）。
 * 签名后通过 Schema 验证确保结构合法。
 *
 * 支持两种数据类型：
 * - manifest：完整内容清单
 * - op-list：热更新操作列表（差量）
 *
 * 设计目的：
 * - 将"扫描物理文件"与"签名"解耦，便于本地预览与 CI 分阶段执行
 * - 签名对象为 manifest / op-list 中除 signature 字段外的所有字段，
 *   按 key 字典序递归排序后序列化为紧凑 JSON，再对 UTF-8 字节流做 Ed25519 签名
 * - 私钥仅存于本地（~/.fandex/keys/ 或环境变量 FANDEX_PRIVATE_KEY），
 *   远程仓库仅存储公钥
 *
 * 使用方式：
 *   pnpm sign-manifest --type full
 *   pnpm sign-manifest --type mobile --input dist/manifests/mobile.manifest.unsigned.json
 *   pnpm sign-manifest --data-type op-list --input dist/op-lists/full.op-list.unsigned.json
 *
 * 退出码：
 * - 0：成功
 * - 1：参数错误、密钥加载失败、Schema 验证失败、签名失败、写入失败
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadKeyPair } from './lib/key-manager';
import { initEd25519, signData, computePublicKeyFingerprint } from './lib/ed25519';
import { assertValidSchema, type SchemaType } from './lib/schema-loader';
import type { SignatureObject } from './lib/types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** FANDEX 仓库根目录 */
const FANDEX_ROOT = resolve(__dirname, '..', '..');

/** 默认输入目录（dist/manifests/ 或 dist/op-lists/） */
function defaultInputDir(dataType: DataType): string {
  return join(FANDEX_ROOT, 'dist', dataType === 'manifest' ? 'manifests' : 'op-lists');
}

/** 默认输出目录（与输入目录相同） */
function defaultOutputDir(dataType: DataType): string {
  return defaultInputDir(dataType);
}

/** 数据类型枚举（manifest 或 op-list） */
type DataType = 'manifest' | 'op-list';

/** 文件名前缀（manifest 或 op-list，与 type 组合成 full.manifest / full.op-list） */
const FILE_PREFIX: Record<DataType, string> = {
  'manifest': 'manifest',
  'op-list': 'op-list',
};

/** Schema 类型映射 */
const SCHEMA_TYPE: Record<DataType, SchemaType> = {
  'manifest': 'manifest',
  'op-list': 'op-list',
};

/**
 * 程序入口
 *
 * 解析 CLI 参数，执行签名流程
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('sign-manifest')
    .description('对未签名 manifest / op-list 进行 Ed25519 签名')
    .option(
      '--data-type <type>',
      '数据类型（manifest 或 op-list，默认 manifest）',
      'manifest',
    )
    .option(
      '-t, --type <type>',
      '内容类型（full 或 mobile，用于推断默认文件路径）',
      'full',
    )
    .option(
      '-i, --input <path>',
      '输入文件路径（默认 dist/{manifests|op-lists}/{type}.{manifest|op-list}.unsigned.json）',
    )
    .option(
      '-o, --output <path>',
      '输出文件路径（默认 dist/{manifests|op-lists}/{type}.{manifest|op-list}.json）',
    )
    .option(
      '--keys-dir <path>',
      '密钥目录（默认 ~/.fandex/keys/）',
    )
    .option(
      '--skip-schema-validate',
      '跳过 Schema 验证（不推荐，仅用于调试）',
    )
    .action(async (options) => {
      await runSign(options);
    });

  await program.parseAsync(process.argv);
}

/** CLI 选项类型 */
interface CliOptions {
  dataType: string;
  type: string;
  input?: string;
  output?: string;
  keysDir?: string;
  skipSchemaValidate: boolean;
}

/**
 * 执行签名流程
 *
 * 流程：
 * 1. 校验参数（data-type、type）
 * 2. 解析输入输出路径
 * 3. 加载密钥对（环境变量 > 本地文件）
 * 4. 读取未签名数据
 * 5. 计算签名（规范化 JSON → Ed25519 签名）
 * 6. 组装已签名对象
 * 7. Schema 验证（可选）
 * 8. 写入已签名文件
 *
 * @param options - CLI 选项
 */
async function runSign(options: CliOptions): Promise<void> {
  /* 校验 data-type */
  if (options.dataType !== 'manifest' && options.dataType !== 'op-list') {
    console.error(
      `[sign-manifest] 错误：--data-type 必须为 manifest 或 op-list，当前为 ${options.dataType}`,
    );
    process.exit(1);
  }
  const dataType: DataType = options.dataType;

  /* 校验 type */
  if (options.type !== 'full' && options.type !== 'mobile') {
    console.error(
      `[sign-manifest] 错误：--type 必须为 full 或 mobile，当前为 ${options.type}`,
    );
    process.exit(1);
  }
  const contentType = options.type;

  /* 解析输入输出路径 */
  const inputPath = options.input
    ? resolve(options.input)
    : join(defaultInputDir(dataType), `${contentType}.${FILE_PREFIX[dataType]}.unsigned.json`);
  const outputPath = options.output
    ? resolve(options.output)
    : join(defaultOutputDir(dataType), `${contentType}.${FILE_PREFIX[dataType]}.json`);

  console.log('[sign-manifest] 开始签名');
  console.log(`[sign-manifest]   数据类型: ${dataType}`);
  console.log(`[sign-manifest]   内容类型: ${contentType}`);
  console.log(`[sign-manifest]   输入路径: ${inputPath}`);
  console.log(`[sign-manifest]   输出路径: ${outputPath}`);

  /* 校验输入文件存在 */
  if (!existsSync(inputPath)) {
    console.error(`[sign-manifest] 错误：输入文件不存在: ${inputPath}`);
    console.error(
      `[sign-manifest] 提示：请先运行 generate-manifest 生成未签名 manifest，或检查路径`,
    );
    process.exit(1);
  }

  /* 加载密钥对 */
  console.log('[sign-manifest] 加载密钥对...');
  const keysDir = options.keysDir ? resolve(options.keysDir) : undefined;
  const keyPair = loadKeyPair(keysDir);
  console.log(`[sign-manifest]   密钥来源: ${keyPair.source}`);
  console.log(`[sign-manifest]   公钥指纹: ${computePublicKeyFingerprint(keyPair.publicKey)}`);

  /* 初始化 Ed25519（设置 SHA-512 实现） */
  await initEd25519();

  /* 读取未签名数据 */
  console.log('[sign-manifest] 读取未签名数据...');
  const inputContent = await readFile(inputPath, 'utf-8');
  const unsignedData = JSON.parse(inputContent) as Record<string, unknown>;

  /* 校验输入数据不含 signature 字段 */
  if ('signature' in unsignedData) {
    console.error(
      `[sign-manifest] 错误：输入文件已包含 signature 字段，可能为已签名文件: ${inputPath}`,
    );
    process.exit(1);
  }

  /* 计算签名 */
  console.log('[sign-manifest] 计算 Ed25519 签名...');
  const signature: SignatureObject = await signData(
    unsignedData,
    keyPair.privateKey,
    keyPair.publicKey,
  );
  console.log(`[sign-manifest]   签名值长度: ${signature.value.length} 字符（base64）`);

  /* 组装已签名对象 */
  const signedData: Record<string, unknown> = {
    ...unsignedData,
    signature,
  };

  /* Schema 验证 */
  if (!options.skipSchemaValidate) {
    console.log('[sign-manifest] 执行 Schema 验证...');
    const schemaType = SCHEMA_TYPE[dataType];
    const description = `${contentType} ${dataType}`;
    assertValidSchema(schemaType, signedData, description);
    console.log('[sign-manifest]   Schema 验证通过');
  } else {
    console.warn('[sign-manifest] 警告：已跳过 Schema 验证（--skip-schema-validate）');
  }

  /* 写入已签名文件 */
  console.log('[sign-manifest] 写入已签名文件...');
  await mkdir(dirname(outputPath), { recursive: true });
  const json = JSON.stringify(signedData, null, 2);
  await writeFile(outputPath, `${json}\n`, 'utf-8');

  const sizeKB = (Buffer.byteLength(json, 'utf-8') / 1024).toFixed(1);
  console.log('[sign-manifest] 签名完成');
  console.log(`[sign-manifest]   文件大小: ${sizeKB} KB`);
  console.log(`[sign-manifest]   输出路径: ${outputPath}`);
  console.log(`[sign-manifest]   公钥指纹: ${signature.public_key_fingerprint}`);
  console.log('[sign-manifest] 下一步：运行 verify-manifest 验证签名，或分发到 CDN/GitHub Raw');
}

/* 执行主函数 */
main().catch((err) => {
  console.error('[sign-manifest] 执行失败:', err);
  process.exit(1);
});
