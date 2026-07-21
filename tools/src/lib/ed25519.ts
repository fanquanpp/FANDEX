/**
 * Ed25519 签名与验签模块
 *
 * 功能概述：
 * 基于 @noble/ed25519 实现 Ed25519（EdDSA）签名与验签。
 * 用于对 manifest / op-list 进行签名与验证。
 *
 * 密钥管理：
 * - 私钥：32 字节随机数，仅存于本地（~/.fandex/keys/ 或环境变量）
 * - 公钥：32 字节，由私钥派生，可公开
 * - 公钥指纹：SHA-256(公钥) 前 16 字符（hex），用于快速匹配
 *
 * 签名流程：
 * 1. 加载私钥（从文件或环境变量）
 * 2. 规范化 JSON（canonicalizeJson）
 * 3. 编码为 UTF-8 字节流
 * 4. Ed25519 签名
 * 5. base64 编码签名值
 * 6. 计算公钥指纹
 * 7. 组装 signature 对象
 *
 * 验签流程：
 * 1. 提取 signature.public_key_fingerprint
 * 2. 在内置公钥列表中匹配
 * 3. 规范化 JSON（除 signature 字段外）
 * 4. 编码为 UTF-8 字节流
 * 5. base64 解码签名值
 * 6. Ed25519 验签
 */

import * as ed from '@noble/ed25519';
import { createHash, randomBytes } from 'node:crypto';
import { canonicalizeJson } from './canonical-json';

/** 私钥字节数（Ed25519 标准） */
const PRIVATE_KEY_BYTES = 32;

/** 公钥字节数（Ed25519 标准） */
const PUBLIC_KEY_BYTES = 32;

/** 签名值字节数（Ed25519 标准） */
const SIGNATURE_BYTES = 64;

/** 公钥指纹长度（SHA-256 前 16 字符 hex） */
const FINGERPRINT_LENGTH = 16;

/** 签名算法标识（固定为 EdDSA） */
export const SIGNATURE_ALGORITHM = 'EdDSA' as const;

/** signature 对象类型 */
export interface SignatureObject {
  /** 签名算法，固定为 EdDSA */
  algorithm: typeof SIGNATURE_ALGORITHM;
  /** 公钥指纹（SHA-256 前 16 字符 hex） */
  public_key_fingerprint: string;
  /** 签名值（base64 编码） */
  value: string;
}

/** 密钥对类型 */
export interface KeyPair {
  /** 私钥（32 字节，hex 编码） */
  privateKey: string;
  /** 公钥（32 字节，hex 编码） */
  publicKey: string;
}

/**
 * 初始化 Ed25519 模块
 *
 * 必须在使用签名/验签功能前调用一次。
 * 配置 @noble/ed25519 使用 noble-hashes 的 SHA-512 实现。
 *
 * Skill 偏差报备：
 * @noble/ed25519 v2.x 起不再内置 SHA-512，需显式设置。
 * 此处使用 node:crypto 的 createHash 提供 SHA-512 实现。
 */
let initialized = false;
export async function initEd25519(): Promise<void> {
  if (initialized) {
    return;
  }
  ed.etc.sha512Sync = (...messages: Uint8Array[]) => {
    const hash = createHash('sha512');
    for (const msg of messages) {
      hash.update(msg);
    }
    return new Uint8Array(hash.digest());
  };
  ed.etc.sha512Async = async (...messages: Uint8Array[]) => {
    const hash = createHash('sha512');
    for (const msg of messages) {
      hash.update(msg);
    }
    return new Uint8Array(hash.digest());
  };
  initialized = true;
}

/**
 * 生成新的 Ed25519 密钥对
 *
 * 输出：KeyPair（私钥与公钥，均为 hex 编码）
 *
 * 用途：
 * - 首次初始化工具链时生成密钥对
 * - 密钥轮换时生成新密钥对
 *
 * 安全提示：
 * - 私钥必须妥善保存，严禁上传远程仓库
 * - 建议保存到 ~/.fandex/keys/private-key.hex（权限 600）
 * - 或通过环境变量 FANDEX_PRIVATE_KEY 传入
 *
 * @returns 密钥对
 */
export async function generateKeyPair(): Promise<KeyPair> {
  await initEd25519();
  const privateKeyBytes = randomBytes(PRIVATE_KEY_BYTES);
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return {
    privateKey: bytesToHex(privateKeyBytes),
    publicKey: bytesToHex(publicKeyBytes),
  };
}

/**
 * 从私钥派生公钥
 *
 * 输入：私钥（hex 编码）
 * 输出：公钥（hex 编码）
 *
 * @param privateKeyHex - 私钥（hex 编码，64 字符）
 * @returns 公钥（hex 编码，64 字符）
 */
export async function derivePublicKey(privateKeyHex: string): Promise<string> {
  await initEd25519();
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
  return bytesToHex(publicKeyBytes);
}

/**
 * 计算公钥指纹
 *
 * 输入：公钥（hex 编码）
 * 输出：指纹（SHA-256 前 16 字符 hex）
 *
 * 用途：signature.public_key_fingerprint 字段值
 *
 * @param publicKeyHex - 公钥（hex 编码，64 字符）
 * @returns 指纹（16 字符 hex）
 */
export function computePublicKeyFingerprint(publicKeyHex: string): string {
  const hash = createHash('sha256').update(publicKeyHex, 'hex').digest('hex');
  return hash.slice(0, FINGERPRINT_LENGTH);
}

/**
 * 对数据进行 Ed25519 签名
 *
 * 输入：待签名数据（任意 JSON 兼容值）、私钥（hex 编码）、公钥（hex 编码，用于计算指纹）
 * 输出：SignatureObject（含算法、公钥指纹、签名值）
 *
 * 流程：
 * 1. 规范化 JSON（canonicalizeJson）
 * 2. 编码为 UTF-8 字节流
 * 3. Ed25519 签名
 * 4. base64 编码签名值
 * 5. 计算公钥指纹
 * 6. 组装 signature 对象
 *
 * @param data - 待签名数据（将先规范化再签名）
 * @param privateKeyHex - 私钥（hex 编码，64 字符）
 * @param publicKeyHex - 公钥（hex 编码，64 字符）
 * @returns 签名对象
 */
export async function signData(
  data: unknown,
  privateKeyHex: string,
  publicKeyHex: string,
): Promise<SignatureObject> {
  await initEd25519();
  const canonical = canonicalizeJson(data);
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(canonical);

  const privateKeyBytes = hexToBytes(privateKeyHex);
  const signatureBytes = await ed.signAsync(messageBytes, privateKeyBytes);

  if (signatureBytes.length !== SIGNATURE_BYTES) {
    throw new Error(
      `[ed25519] 签名长度异常: 期望 ${SIGNATURE_BYTES} 字节，实际 ${signatureBytes.length} 字节`,
    );
  }

  return {
    algorithm: SIGNATURE_ALGORITHM,
    public_key_fingerprint: computePublicKeyFingerprint(publicKeyHex),
    value: bytesToBase64(signatureBytes),
  };
}

/**
 * 验证 Ed25519 签名
 *
 * 输入：待验证数据（任意 JSON 兼容值，需与签名时的原始数据逻辑一致）、签名对象、公钥（hex 编码）
 * 输出：验证结果（true/false）
 *
 * 流程：
 * 1. 规范化 JSON（canonicalizeJson）
 * 2. 编码为 UTF-8 字节流
 * 3. base64 解码签名值
 * 4. Ed25519 验签
 *
 * 注意：调用方需自行验证 public_key_fingerprint 是否匹配预期公钥，
 *      本函数仅验证签名值与数据的对应关系。
 *
 * @param data - 待验证数据（将先规范化再验签）
 * @param signature - 签名对象
 * @param publicKeyHex - 公钥（hex 编码，64 字符）
 * @returns 验证结果（true 表示签名有效）
 */
export async function verifySignature(
  data: unknown,
  signature: SignatureObject,
  publicKeyHex: string,
): Promise<boolean> {
  await initEd25519();

  /* 校验签名算法 */
  if (signature.algorithm !== SIGNATURE_ALGORITHM) {
    return false;
  }

  /* 校验公钥指纹 */
  const expectedFingerprint = computePublicKeyFingerprint(publicKeyHex);
  if (signature.public_key_fingerprint !== expectedFingerprint) {
    return false;
  }

  try {
    const canonical = canonicalizeJson(data);
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(canonical);
    const signatureBytes = base64ToBytes(signature.value);
    const publicKeyBytes = hexToBytes(publicKeyHex);

    return await ed.verifyAsync(signatureBytes, messageBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * 对带 signature 字段的对象进行验签
 *
 * 输入：含 signature 字段的对象、公钥（hex 编码）
 * 输出：验证结果（true/false）
 *
 * 流程：
 * 1. 提取 signature 字段
 * 2. 从对象中移除 signature 字段，得到待验证数据
 * 3. 调用 verifySignature 验证
 *
 * 用途：manifest / op-list 验签的标准入口
 *
 * @param signedObject - 含 signature 字段的对象
 * @param publicKeyHex - 公钥（hex 编码，64 字符）
 * @returns 验证结果
 */
export async function verifySignedObject(
  signedObject: { signature: SignatureObject } & Record<string, unknown>,
  publicKeyHex: string,
): Promise<boolean> {
  const { signature, ...dataWithoutSignature } = signedObject;
  return verifySignature(dataWithoutSignature, signature, publicKeyHex);
}

/* ========== 字节编码工具函数 ========== */

/**
 * 字节数组转 hex 字符串
 *
 * @param bytes - 字节数组
 * @returns hex 字符串（小写）
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * hex 字符串转字节数组
 *
 * @param hex - hex 字符串
 * @returns 字节数组
 * @throws {Error} hex 字符串长度不是偶数或包含非 hex 字符
 */
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error(`[ed25519] hex 字符串长度不是偶数: ${hex.length}`);
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`[ed25519] hex 字符串包含非 hex 字符: ${hex}`);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = Number.parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * 字节数组转 base64 字符串
 *
 * @param bytes - 字节数组
 * @returns base64 字符串
 */
function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * base64 字符串转字节数组
 *
 * @param base64 - base64 字符串
 * @returns 字节数组
 * @throws {Error} base64 字符串无效
 */
function base64ToBytes(base64: string): Uint8Array {
  const buffer = Buffer.from(base64, 'base64');
  return new Uint8Array(buffer);
}
