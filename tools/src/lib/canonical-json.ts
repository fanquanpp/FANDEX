/**
 * 规范化 JSON 序列化模块
 *
 * 功能概述：
 * 将任意 JSON 值序列化为规范化字符串，用于 Ed25519 签名。
 * 规范化规则：
 * 1. 递归按 JSON key 字典序排序（仅对象，数组保持原序）
 * 2. 序列化为紧凑 JSON（无空白字符）
 * 3. 输出 UTF-8 字符串，作为签名的输入字节流
 *
 * 设计目的：
 * 确保相同逻辑内容的 JSON 在不同语言实现（TS / Kotlin）中
 * 产生完全相同的字节流，从而使签名验证跨语言一致。
 *
 * 跨语言对齐要点：
 * - key 排序：按 UTF-16 code unit 字典序（与 Kotlin 的 String.compareTo 一致）
 * - 数字格式：整数无小数点，浮点数保留必要精度（避免科学计数法）
 * - 字符串转义：双引号包裹，标准 JSON 转义（\n、\t、\\、\"、\uXXXX）
 * - null/true/false：小写字面量
 * - 空数组：[]
 * - 空对象：{}
 */

/**
 * 将 JSON 值规范化序列化为紧凑字符串
 *
 * 输入：任意 JSON 兼容值（object、array、string、number、boolean、null）
 * 输出：紧凑 JSON 字符串（key 按字典序排序，无空白）
 *
 * @param value - 待序列化的 JSON 值
 * @returns 规范化 JSON 字符串
 */
export function canonicalizeJson(value: unknown): string {
  return serializeValue(value);
}

/**
 * 序列化单个值（内部递归函数）
 *
 * @param value - 待序列化的值
 * @returns 序列化后的字符串
 */
function serializeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number') {
    return serializeNumber(value);
  }
  if (typeof value === 'string') {
    return serializeString(value);
  }
  if (Array.isArray(value)) {
    return serializeArray(value);
  }
  if (typeof value === 'object') {
    return serializeObject(value as Record<string, unknown>);
  }
  /* 不支持的类型（function、symbol、undefined、bigint）不应出现在 JSON 中 */
  throw new Error(`[canonicalizeJson] 不支持的类型: ${typeof value}`);
}

/**
 * 序列化数字
 *
 * 处理规则：
 * - 整数：直接输出（如 42、-7）
 * - 浮点数：保留必要精度（如 3.14、-0.5）
 * - NaN / Infinity：JSON 不支持，抛出错误
 * - -0：输出为 0（避免符号位差异）
 *
 * @param num - 待序列化的数字
 * @returns 序列化后的字符串
 */
function serializeNumber(num: number): string {
  if (!Number.isFinite(num)) {
    throw new Error(`[canonicalizeJson] 数字非有限值: ${num}`);
  }
  /* 处理 -0 与 0 的差异（JSON 中两者应一致） */
  if (num === 0) {
    return '0';
  }
  /* 整数直接输出，浮点数用 JSON.stringify 保证精度 */
  if (Number.isInteger(num)) {
    return String(num);
  }
  return JSON.stringify(num);
}

/**
 * 序列化字符串
 *
 * 处理规则：
 * - 双引号包裹
 * - 标准 JSON 转义：\"、\\、\/（可选）、\b、\f、\n、\r、\t
 * - 控制字符（U+0000 ~ U+001F）：转义为 \uXXXX
 * - 其他字符原样输出（含中文、emoji 等）
 *
 * 跨语言对齐：直接使用 JSON.stringify 保证转义规则一致
 *
 * @param str - 待序列化的字符串
 * @returns 序列化后的字符串（含双引号）
 */
function serializeString(str: string): string {
  return JSON.stringify(str);
}

/**
 * 序列化数组
 *
 * 处理规则：
 * - 方括号包裹
 * - 元素保持原序（不排序）
 * - 元素间用逗号分隔，无空白
 * - 空数组输出 []
 *
 * @param arr - 待序列化的数组
 * @returns 序列化后的字符串
 */
function serializeArray(arr: unknown[]): string {
  if (arr.length === 0) {
    return '[]';
  }
  const elements = arr.map((item) => serializeValue(item));
  return `[${elements.join(',')}]`;
}

/**
 * 序列化对象
 *
 * 处理规则：
 * - 花括号包裹
 * - key 按字典序（UTF-16 code unit）排序
 * - key 用双引号包裹（JSON 标准）
 * - key-value 间用冒号分隔，无空白
 * - pair 间用逗号分隔，无空白
 * - 空对象输出 {}
 * - 跳过 undefined 值（JSON 不支持）
 *
 * 跨语言对齐：
 * - TS 的 Array.prototype.sort 默认按 UTF-16 code unit 排序
 * - Kotlin 的 String.compareTo 也是 UTF-16 code unit 排序
 * - 两者一致
 *
 * @param obj - 待序列化的对象
 * @returns 序列化后的字符串
 */
function serializeObject(obj: Record<string, unknown>): string {
  const keys = Object.keys(obj).filter((key) => obj[key] !== undefined);
  if (keys.length === 0) {
    return '{}';
  }
  /* 按 UTF-16 code unit 字典序排序 */
  keys.sort();
  const pairs = keys.map((key) => `${serializeString(key)}:${serializeValue(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * 计算规范化 JSON 的 SHA-256 哈希（用于调试与跨语言对齐验证）
 *
 * 输入：任意 JSON 值
 * 输出：规范化 JSON 字符串的 SHA-256 哈希（hex）
 *
 * 用途：
 * - 调试时验证 TS 与 Kotlin 端规范化结果一致
 * - 不用于签名（签名使用 Ed25519 直接对规范化 JSON 字节流签名）
 *
 * @param value - 待哈希的 JSON 值
 * @returns SHA-256 哈希（hex，64 字符）
 */
export async function hashCanonicalJson(value: unknown): Promise<string> {
  const canonical = canonicalizeJson(value);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
