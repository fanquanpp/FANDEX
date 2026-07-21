/**
 * Schema 加载与验证模块
 *
 * 功能概述：
 * 加载 shared/ 目录下的 JSON Schema 文件，提供 Ajv 验证器。
 * 支持 manifest / op-list / id-registry 三类 Schema。
 *
 * 设计目的：
 * - 工具链在生成、签名、验证 manifest / op-list 时统一调用此模块做 Schema 校验
 * - 确保数据结构合法，避免后续处理因结构错误产生未定义行为
 * - Schema 文件位于 shared/，跨子项目共享，TS 工具链与 Android 端引用同一份 Schema
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

/** 当前模块所在目录（用于定位 shared/ 目录） */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** shared/ 目录绝对路径（tools/src/lib/ → tools/ → FANDEX/ → shared/） */
const SHARED_DIR = resolve(__dirname, '..', '..', '..', 'shared');

/** Schema 类型枚举 */
export type SchemaType = 'manifest' | 'op-list' | 'id-registry';

/** Schema 文件名映射 */
const SCHEMA_FILES: Record<SchemaType, string> = {
  'manifest': 'manifest.schema.json',
  'op-list': 'op-list.schema.json',
  'id-registry': 'id-registry.schema.json',
};

/** Ajv 实例缓存（同一进程内复用，避免重复编译 Schema） */
let ajvInstance: Ajv2020 | null = null;

/** 已加载的 Schema 缓存 */
const schemaCache = new Map<SchemaType, object>();

/**
 * 获取 Ajv 实例（单例）
 *
 * 配置：
 * - strict: true（严格模式，禁止未知关键字）
 * - allErrors: true（收集所有错误，便于调试）
 * - formats: date-time（ISO 8601 日期时间格式）
 *
 * Skill 偏差报备：
 * 原 Skill 设计使用 `Ajv`（draft-07），但 shared/*.schema.json 均使用
 * draft 2020-12，draft-07 Ajv 无法识别 2020-12 的 $schema 声明。
 * 经终端验证改用 `Ajv2020`（ajv/dist/2020）。
 *
 * @returns Ajv2020 实例
 */
function getAjv(): Ajv2020 {
  if (ajvInstance) {
    return ajvInstance;
  }
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  ajvInstance = ajv;
  return ajv;
}

/**
 * 加载 Schema 文件
 *
 * 输入：Schema 类型
 * 输出：Schema 对象（已解析的 JSON）
 * 流程：从 shared/ 目录读取对应 Schema 文件，解析为 JSON 并缓存
 *
 * @param type - Schema 类型
 * @returns Schema 对象
 */
export function loadSchema(type: SchemaType): object {
  const cached = schemaCache.get(type);
  if (cached) {
    return cached;
  }
  const filePath = join(SHARED_DIR, SCHEMA_FILES[type]);
  const content = readFileSync(filePath, 'utf-8');
  const schema = JSON.parse(content) as object;
  schemaCache.set(type, schema);
  return schema;
}

/**
 * 验证数据是否符合 Schema
 *
 * 输入：Schema 类型、待验证数据
 * 输出：验证结果对象 { valid, errors }
 * 流程：
 * 1. 加载 Schema
 * 2. 编译 Schema 为验证器
 * 3. 执行验证
 * 4. 返回验证结果与错误信息
 *
 * @param type - Schema 类型
 * @param data - 待验证数据
 * @returns 验证结果对象
 */
export function validateSchema(
  type: SchemaType,
  data: unknown,
): { valid: boolean; errors: string[] } {
  const schema = loadSchema(type);
  const ajv = getAjv();
  const validate = ajv.compile(schema);
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map((err) => {
    const path = err.instancePath || '(root)';
    const message = err.message ?? '未知错误';
    const params = Object.keys(err.params).length > 0 ? JSON.stringify(err.params) : '';
    return `${path}: ${message}${params ? ` ${params}` : ''}`;
  });

  return { valid: false, errors };
}

/**
 * 断言数据符合 Schema（验证失败抛出错误）
 *
 * 输入：Schema 类型、待验证数据、数据描述（用于错误信息）
 * 输出：无（验证失败抛出 Error）
 *
 * @param type - Schema 类型
 * @param data - 待验证数据
 * @param description - 数据描述（用于错误信息，如 "full manifest"）
 * @throws {Error} 验证失败时抛出包含详细错误信息的 Error
 */
export function assertValidSchema(
  type: SchemaType,
  data: unknown,
  description: string,
): void {
  const result = validateSchema(type, data);
  if (!result.valid) {
    const errorList = result.errors.map((err) => `  - ${err}`).join('\n');
    throw new Error(
      `[schema-loader] ${description} Schema 验证失败，共 ${result.errors.length} 个错误:\n${errorList}`,
    );
  }
}

/**
 * 获取 shared/ 目录绝对路径
 *
 * 用途：工具链需要读写 shared/fixtures/ 等资源时调用
 *
 * @returns shared/ 目录绝对路径
 */
export function getSharedDir(): string {
  return SHARED_DIR;
}
