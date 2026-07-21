/**
 * verify-manifest CLI 入口
 *
 * 功能概述：
 * 加载已签名的 manifest / op-list，使用公钥验签 Ed25519 签名，
 * 并可选执行 Schema 验证。用于本地校验签名正确性、CI 流水线发布前校验、
 * 客户端内置公钥列表验签前的人工排查。
 *
 * 支持两种数据类型：
 * - manifest：完整内容清单
 * - op-list：热更新操作列表
 *
 * 验签流程：
 * 1. 加载已签名文件（含 signature 字段）
 * 2. 加载公钥（环境变量 > 本地公钥文件 > 仓库内公钥文件 tools/keys/public-key.hex）
 * 3. 调用 verifySignedObject 验签
 *    - 提取 signature 字段
 *    - 校验 algorithm = EdDSA
 *    - 校验 public_key_fingerprint 与公钥指纹匹配
 *    - 规范化 JSON（除 signature 外）→ UTF-8 字节流 → Ed25519 验签
 * 4. 可选 Schema 验证
 *
 * 使用方式：
 *   pnpm verify-manifest --type full
 *   pnpm verify-manifest --data-type op-list --input dist/op-lists/full.op-list.json
 *   pnpm verify-manifest --type mobile --input dist/manifests/mobile.manifest.json --skip-schema-validate
 *
 * 退出码：
 * - 0：验签成功
 * - 1：参数错误、文件不存在、Schema 验证失败、签名不匹配
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { loadPublicKey } from './lib/key-manager';
import { initEd25519, verifySignedObject, computePublicKeyFingerprint } from './lib/ed25519';
import { assertValidSchema, type SchemaType } from './lib/schema-loader';
import type { SignatureObject } from './lib/types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** FANDEX 仓库根目录 */
const FANDEX_ROOT = resolve(__dirname, '..', '..');

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

/** 默认输入目录 */
function defaultInputDir(dataType: DataType): string {
  return join(FANDEX_ROOT, 'dist', dataType === 'manifest' ? 'manifests' : 'op-lists');
}

/**
 * 程序入口
 *
 * 解析 CLI 参数，执行验签流程
 */
async function main(): Promise<void> {
  const program = new Command();

  program
    .name('verify-manifest')
    .description('验证已签名 manifest / op-list 的 Ed25519 签名')
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
      '输入文件路径（默认 dist/{manifests|op-lists}/{type}.{manifest|op-list}.json）',
    )
    .option(
      '--keys-dir <path>',
      '公钥目录（默认 ~/.fandex/keys/ 或仓库内 tools/keys/）',
    )
    .option(
      '--skip-schema-validate',
      '跳过 Schema 验证（仅验签，不校验结构）',
    )
    .option(
      '--public-key <hex>',
      '指定公钥（hex 编码，覆盖文件/环境变量加载）',
    )
    .action(async (options) => {
      await runVerify(options);
    });

  await program.parseAsync(process.argv);
}

/** CLI 选项类型 */
interface CliOptions {
  dataType: string;
  type: string;
  input?: string;
  keysDir?: string;
  skipSchemaValidate: boolean;
  publicKey?: string;
}

/**
 * 执行验签流程
 *
 * 流程：
 * 1. 校验参数
 * 2. 解析输入路径
 * 3. 加载公钥（命令行参数 > 环境变量 > 本地文件 > 仓库内文件）
 * 4. 读取已签名数据
 * 5. Schema 验证（可选）
 * 6. Ed25519 验签
 * 7. 输出结果
 *
 * @param options - CLI 选项
 */
async function runVerify(options: CliOptions): Promise<void> {
  /* 校验 data-type */
  if (options.dataType !== 'manifest' && options.dataType !== 'op-list') {
    console.error(
      `[verify-manifest] 错误：--data-type 必须为 manifest 或 op-list，当前为 ${options.dataType}`,
    );
    process.exit(1);
  }
  const dataType: DataType = options.dataType;

  /* 校验 type */
  if (options.type !== 'full' && options.type !== 'mobile') {
    console.error(
      `[verify-manifest] 错误：--type 必须为 full 或 mobile，当前为 ${options.type}`,
    );
    process.exit(1);
  }
  const contentType = options.type;

  /* 解析输入路径 */
  const inputPath = options.input
    ? resolve(options.input)
    : join(defaultInputDir(dataType), `${contentType}.${FILE_PREFIX[dataType]}.json`);

  console.log('[verify-manifest] 开始验签');
  console.log(`[verify-manifest]   数据类型: ${dataType}`);
  console.log(`[verify-manifest]   内容类型: ${contentType}`);
  console.log(`[verify-manifest]   输入路径: ${inputPath}`);

  /* 校验输入文件存在 */
  if (!existsSync(inputPath)) {
    console.error(`[verify-manifest] 错误：输入文件不存在: ${inputPath}`);
    process.exit(1);
  }

  /* 加载公钥 */
  let publicKey: string;
  if (options.publicKey) {
    publicKey = options.publicKey.toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(publicKey)) {
      console.error(
        `[verify-manifest] 错误：--public-key 公钥格式错误（需 64 字符 hex 编码），当前长度 ${publicKey.length}`,
      );
      process.exit(1);
    }
    console.log('[verify-manifest]   公钥来源: 命令行参数');
  } else {
    const keysDir = options.keysDir ? resolve(options.keysDir) : undefined;
    publicKey = loadPublicKey(keysDir);
    console.log('[verify-manifest]   公钥来源: 环境变量 / 本地文件 / 仓库内文件');
  }
  console.log(`[verify-manifest]   公钥指纹: ${computePublicKeyFingerprint(publicKey)}`);

  /* 初始化 Ed25519 */
  await initEd25519();

  /* 读取已签名数据 */
  const inputContent = await readFile(inputPath, 'utf-8');
  const signedData = JSON.parse(inputContent) as Record<string, unknown>;

  /* 校验 signature 字段存在 */
  if (!('signature' in signedData)) {
    console.error(
      `[verify-manifest] 错误：输入文件缺少 signature 字段，可能为未签名文件: ${inputPath}`,
    );
    process.exit(1);
  }

  const signature = signedData.signature as SignatureObject;
  if (!signature || typeof signature !== 'object') {
    console.error(`[verify-manifest] 错误：signature 字段格式错误（非对象）`);
    process.exit(1);
  }
  if (signature.algorithm !== 'EdDSA') {
    console.error(
      `[verify-manifest] 错误：签名算法不支持: ${signature.algorithm}（仅支持 EdDSA）`,
    );
    process.exit(1);
  }

  console.log(`[verify-manifest]   文件内公钥指纹: ${signature.public_key_fingerprint}`);

  /* Schema 验证（可选） */
  if (!options.skipSchemaValidate) {
    console.log('[verify-manifest] 执行 Schema 验证...');
    const schemaType = SCHEMA_TYPE[dataType];
    const description = `${contentType} ${dataType}`;
    assertValidSchema(schemaType, signedData, description);
    console.log('[verify-manifest]   Schema 验证通过');
  } else {
    console.warn('[verify-manifest] 警告：已跳过 Schema 验证（--skip-schema-validate）');
  }

  /* Ed25519 验签 */
  console.log('[verify-manifest] 执行 Ed25519 验签...');
  const isValid = await verifySignedObject(
    signedData as { signature: SignatureObject } & Record<string, unknown>,
    publicKey,
  );

  if (!isValid) {
    console.error('[verify-manifest] 验签失败：签名不匹配');
    console.error('[verify-manifest] 可能原因：');
    console.error('  1. 文件被篡改（内容与签名不一致）');
    console.error('  2. 公钥不匹配（使用错误的公钥或密钥已轮换）');
    console.error('  3. 规范化 JSON 实现差异（TS / Kotlin 字节流不一致）');
    console.error('  4. 签名时使用了不同的私钥');
    process.exit(1);
  }

  console.log('[verify-manifest] 验签成功：签名有效');
  console.log(`[verify-manifest]   签名算法: ${signature.algorithm}`);
  console.log(`[verify-manifest]   公钥指纹匹配: ${signature.public_key_fingerprint}`);
  console.log(`[verify-manifest]   签名值长度: ${signature.value.length} 字符（base64）`);
}

/* 执行主函数 */
main().catch((err) => {
  console.error('[verify-manifest] 执行失败:', err);
  process.exit(1);
});
