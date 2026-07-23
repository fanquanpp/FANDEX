/**
 * 密钥管理模块
 *
 * 功能概述：
 * 管理 Ed25519 密钥对的加载、保存与查找。
 * 密钥来源优先级：环境变量 > 本地密钥文件
 *
 * 密钥文件位置：
 * - 默认：~/.fandex/keys/private-key.hex（私钥）与 ~/.fandex/keys/public-key.hex（公钥）
 * - 权限：私钥文件权限 600（仅所有者可读写）
 * - 格式：hex 编码（64 字符）
 *
 * 环境变量：
 * - FANDEX_PRIVATE_KEY：私钥（hex 编码）
 * - FANDEX_PUBLIC_KEY：公钥（hex 编码）
 *
 * 安全提示：
 * - 私钥严禁上传远程仓库
 * - .gitignore 需排除 ~/.fandex/keys/（或等效路径）
 * - GitHub Actions 中通过 Secrets 注入环境变量
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';

/** 私钥环境变量名 */
const ENV_PRIVATE_KEY = 'FANDEX_PRIVATE_KEY';

/** 公钥环境变量名 */
const ENV_PUBLIC_KEY = 'FANDEX_PUBLIC_KEY';

/** 默认密钥目录（~/.fandex/keys/） */
const DEFAULT_KEYS_DIR = join(homedir(), '.fandex', 'keys');

/** 私钥文件名 */
const PRIVATE_KEY_FILE = 'private-key.hex';

/** 公钥文件名 */
const PUBLIC_KEY_FILE = 'public-key.hex';

/** 密钥对类型 */
export interface LoadedKeyPair {
  /** 私钥（hex 编码，64 字符） */
  privateKey: string;
  /** 公钥（hex 编码，64 字符） */
  publicKey: string;
  /** 密钥来源 */
  source: 'env' | 'file';
}

/**
 * 加载密钥对
 *
 * 优先级：
 * 1. 环境变量 FANDEX_PRIVATE_KEY + FANDEX_PUBLIC_KEY
 * 2. 本地密钥文件 ~/.fandex/keys/private-key.hex + public-key.hex
 *
 * @param keysDir - 密钥目录（可选，默认 ~/.fandex/keys/）
 * @returns 密钥对
 * @throws {Error} 密钥不存在或格式错误
 */
export function loadKeyPair(keysDir: string = DEFAULT_KEYS_DIR): LoadedKeyPair {
  /* 优先从环境变量加载 */
  const envPrivateKey = process.env[ENV_PRIVATE_KEY];
  const envPublicKey = process.env[ENV_PUBLIC_KEY];
  if (envPrivateKey && envPublicKey) {
    validateKeyFormat(envPrivateKey, 'private key (env)');
    validateKeyFormat(envPublicKey, 'public key (env)');
    return {
      privateKey: envPrivateKey.toLowerCase(),
      publicKey: envPublicKey.toLowerCase(),
      source: 'env',
    };
  }

  /* 从文件加载 */
  const privateKeyPath = join(keysDir, PRIVATE_KEY_FILE);
  const publicKeyPath = join(keysDir, PUBLIC_KEY_FILE);

  if (!existsSync(privateKeyPath)) {
    throw new Error(
      `[key-manager] 私钥未找到。请设置环境变量 ${ENV_PRIVATE_KEY}，或创建文件 ${privateKeyPath}`,
    );
  }
  if (!existsSync(publicKeyPath)) {
    throw new Error(
      `[key-manager] 公钥未找到。请设置环境变量 ${ENV_PUBLIC_KEY}，或创建文件 ${publicKeyPath}`,
    );
  }

  const privateKey = readFileSync(privateKeyPath, 'utf-8').trim();
  const publicKey = readFileSync(publicKeyPath, 'utf-8').trim();

  validateKeyFormat(privateKey, 'private key (file)');
  validateKeyFormat(publicKey, 'public key (file)');

  return {
    privateKey: privateKey.toLowerCase(),
    publicKey: publicKey.toLowerCase(),
    source: 'file',
  };
}

/**
 * 仅加载公钥（用于验签）
 *
 * 优先级：
 * 1. 环境变量 FANDEX_PUBLIC_KEY
 * 2. 本地公钥文件
 * 3. 仓库内公钥文件（tools/keys/public-key.hex，可提交到 Git）
 *
 * @param keysDir - 密钥目录（可选）
 * @returns 公钥（hex 编码）
 * @throws {Error} 公钥不存在或格式错误
 */
export function loadPublicKey(keysDir: string = DEFAULT_KEYS_DIR): string {
  /* 优先从环境变量加载 */
  const envPublicKey = process.env[ENV_PUBLIC_KEY];
  if (envPublicKey) {
    validateKeyFormat(envPublicKey, 'public key (env)');
    return envPublicKey.toLowerCase();
  }

  /* 从本地密钥目录加载 */
  const publicKeyPath = join(keysDir, PUBLIC_KEY_FILE);
  if (existsSync(publicKeyPath)) {
    const publicKey = readFileSync(publicKeyPath, 'utf-8').trim();
    validateKeyFormat(publicKey, 'public key (file)');
    return publicKey.toLowerCase();
  }

  /* 从仓库内公钥文件加载（tools/keys/public-key.hex） */
  const repoPublicKeyPath = resolve(__dirname, '..', '..', 'keys', PUBLIC_KEY_FILE);
  if (existsSync(repoPublicKeyPath)) {
    const publicKey = readFileSync(repoPublicKeyPath, 'utf-8').trim();
    validateKeyFormat(publicKey, 'public key (repo)');
    return publicKey.toLowerCase();
  }

  throw new Error(
    `[key-manager] 公钥未找到。请设置环境变量 ${ENV_PUBLIC_KEY}，或创建文件 ${publicKeyPath} 或 ${repoPublicKeyPath}`,
  );
}

/* __dirname 兼容（ESM 中需通过 import.meta.url 获取） */
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * 保存密钥对到文件
 *
 * 输入：密钥对、可选的密钥目录
 * 输出：无（写入文件）
 * 流程：
 * 1. 校验密钥格式
 * 2. 创建密钥目录（若不存在）
 * 3. 写入私钥文件（权限 600）
 * 4. 写入公钥文件（权限 644）
 *
 * 安全提示：调用方需谨慎，避免覆盖已有密钥
 *
 * @param keyPair - 密钥对
 * @param keysDir - 密钥目录（可选，默认 ~/.fandex/keys/）
 */
export function saveKeyPair(
  keyPair: { privateKey: string; publicKey: string },
  keysDir: string = DEFAULT_KEYS_DIR,
): void {
  validateKeyFormat(keyPair.privateKey, 'private key');
  validateKeyFormat(keyPair.publicKey, 'public key');

  /* 创建密钥目录 */
  if (!existsSync(keysDir)) {
    mkdirSync(keysDir, { recursive: true });
  }

  /* 写入私钥文件（权限 600） */
  const privateKeyPath = join(keysDir, PRIVATE_KEY_FILE);
  writeFileSync(privateKeyPath, `${keyPair.privateKey.toLowerCase()}\n`, 'utf-8');
  chmodSync(privateKeyPath, 0o600);

  /* 写入公钥文件（权限 644） */
  const publicKeyPath = join(keysDir, PUBLIC_KEY_FILE);
  writeFileSync(publicKeyPath, `${keyPair.publicKey.toLowerCase()}\n`, 'utf-8');
  chmodSync(publicKeyPath, 0o644);
}

/**
 * 校验密钥格式
 *
 * Ed25519 密钥为 32 字节，hex 编码后为 64 字符。
 *
 * @param key - 密钥（hex 编码）
 * @param description - 密钥描述（用于错误信息）
 * @throws {Error} 密钥格式错误
 */
function validateKeyFormat(key: string, description: string): void {
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      `[key-manager] ${description} 格式错误：需 64 字符 hex 编码（32 字节），实际长度 ${key.length}`,
    );
  }
}

/**
 * 检查密钥文件是否存在
 *
 * @param keysDir - 密钥目录（可选）
 * @returns 是否存在密钥对文件
 */
export function keyPairExists(keysDir: string = DEFAULT_KEYS_DIR): boolean {
  return (
    existsSync(join(keysDir, PRIVATE_KEY_FILE)) &&
    existsSync(join(keysDir, PUBLIC_KEY_FILE))
  );
}

/**
 * 获取默认密钥目录
 *
 * @returns 默认密钥目录路径
 */
export function getDefaultKeysDir(): string {
  return DEFAULT_KEYS_DIR;
}

/**
 * 检查私钥文件权限是否安全
 *
 * 仅在类 Unix 系统生效（Windows 无 Unix 权限模型）。
 * 私钥文件权限应为 600（仅所有者可读写）。
 *
 * @param keysDir - 密钥目录（可选）
 * @returns 权限是否安全（true 表示 600 或 Windows 系统）
 */
export function checkPrivateKeyPermission(keysDir: string = DEFAULT_KEYS_DIR): boolean {
  const privateKeyPath = join(keysDir, PRIVATE_KEY_FILE);
  if (!existsSync(privateKeyPath)) {
    return false;
  }

  /* Windows 无 Unix 权限模型，直接返回 true */
  if (process.platform === 'win32') {
    return true;
  }

  try {
    const stat = statSync(privateKeyPath);
    const mode = stat.mode & 0o777;
    return mode === 0o600;
  } catch {
    return false;
  }
}
