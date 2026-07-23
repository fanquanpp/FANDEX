/**
 * ID 注册表管理模块
 *
 * 功能概述：
 * 维护 id-registry.json，提供 module_id 与 doc_id 的分配、查询、退役功能。
 * 分配规则：编号只增不复用，retired 后永久封存。
 *
 * 设计目的：
 * - 防止 ID 复用（核心约束）
 * - 工具链各模块（generate-manifest、allocate-id）通过此模块读写 id-registry
 * - 提供 ID 唯一性校验，避免手动编辑 manifest 时引入冲突 ID
 *
 * 文件位置：
 * - id-registry.json 位于 cnt-content/full/_id-registry.json（内容层 full 目录，git 跟踪）
 * - 工具链通过相对路径读写
 * - 迁移说明：原位于仓库根 id-registry.json，三端架构统一后迁入内容层
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertValidSchema } from './schema-loader';
import type { DocRecord, IdRegistry, ModuleRecord } from './types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/** id-registry.json 默认路径（cnt-content/full/_id-registry.json） */
const DEFAULT_REGISTRY_PATH = resolve(__dirname, '..', '..', '..', 'cnt-content', 'full', '_id-registry.json');

/** ID 分配结果 */
export interface AllocatedModuleId {
  /** 分配的 module_id（Model_<EnglishShort>_<NN>） */
  module_id: string;
  /** 分配的两位数字编号 */
  sequence: number;
}

/** ID 分配结果 */
export interface AllocatedDocId {
  /** 分配的 doc_id（Doc_<EnglishShort>_<NN>_<NNN>） */
  doc_id: string;
  /** 分配的三位数字编号 */
  sequence: number;
}

/**
 * 加载 id-registry
 *
 * 输入：可选的注册表文件路径（默认 cnt-content/full/_id-registry.json）
 * 输出：IdRegistry 对象
 * 流程：
 * 1. 读取文件（不存在则返回空注册表）
 * 2. JSON 解析
 * 3. Schema 验证
 *
 * @param registryPath - 注册表文件路径（可选）
 * @returns IdRegistry 对象
 */
export function loadIdRegistry(registryPath: string = DEFAULT_REGISTRY_PATH): IdRegistry {
  if (!existsSync(registryPath)) {
    return createEmptyRegistry();
  }
  const content = readFileSync(registryPath, 'utf-8');
  const registry = JSON.parse(content) as IdRegistry;
  assertValidSchema('id-registry', registry, 'id-registry');
  return registry;
}

/**
 * 保存 id-registry
 *
 * 输入：IdRegistry 对象、可选的注册表文件路径
 * 输出：无（写入文件）
 * 流程：
 * 1. Schema 验证
 * 2. 更新 updated_at 时间戳
 * 3. 写入文件（pretty JSON，2 空格缩进）
 *
 * @param registry - IdRegistry 对象
 * @param registryPath - 注册表文件路径（可选）
 */
export function saveIdRegistry(
  registry: IdRegistry,
  registryPath: string = DEFAULT_REGISTRY_PATH,
): void {
  /* 更新时间戳 */
  registry.updated_at = new Date().toISOString();
  /* 更新 next_module_sequence */
  registry.next_module_sequence = computeNextModuleSequence(registry);

  /* Schema 验证 */
  assertValidSchema('id-registry', registry, 'id-registry');

  /* 确保目录存在 */
  const dir = dirname(registryPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  /* 写入文件（pretty JSON，2 空格缩进，末尾换行） */
  const json = JSON.stringify(registry, null, 2);
  writeFileSync(registryPath, `${json}\n`, 'utf-8');
}

/**
 * 创建空注册表
 *
 * @returns 空 IdRegistry 对象
 */
function createEmptyRegistry(): IdRegistry {
  return {
    registry_version: '1.0.0',
    updated_at: new Date().toISOString(),
    next_module_sequence: 0,
    modules: [],
    docs: [],
  };
}

/**
 * 计算下一个待分配的模块编号
 *
 * 扫描所有已分配的模块编号，返回最小的未占用编号。
 * 若所有编号（0-99）均已占用，返回 100（表示编号空间耗尽）。
 *
 * @param registry - IdRegistry 对象
 * @returns 下一个待分配的模块编号（0-100）
 */
function computeNextModuleSequence(registry: IdRegistry): number {
  const usedSequences = new Set(registry.modules.map((m) => m.sequence));
  for (let seq = 0; seq < 100; seq++) {
    if (!usedSequences.has(seq)) {
      return seq;
    }
  }
  return 100;
}

/**
 * 分配新 module_id
 *
 * 输入：IdRegistry 对象、模块英文简称、模块显示名称
 * 输出：分配结果（含 module_id 与 sequence）
 * 流程：
 * 1. 校验 english_short 格式（小写字母+数字）
 * 2. 校验 english_short 未被占用（active 状态）
 * 3. 扫描最小未占用 sequence
 * 4. 构造 ModuleRecord 并加入 registry.modules
 *
 * @param registry - IdRegistry 对象（会被修改）
 * @param englishShort - 模块英文简称（小写）
 * @param name - 模块显示名称（中文）
 * @returns 分配结果
 * @throws {Error} english_short 格式错误或已被占用，或编号空间耗尽
 */
export function allocateModuleId(
  registry: IdRegistry,
  englishShort: string,
  name: string,
): AllocatedModuleId {
  /* 校验 english_short 格式 */
  if (!/^[a-z][a-z0-9]*$/.test(englishShort)) {
    throw new Error(
      `[id-registry] english_short 格式错误: ${englishShort}（需小写字母+数字，首字符为字母）`,
    );
  }

  /* 校验 english_short 未被 active 模块占用 */
  const existingActive = registry.modules.find(
    (m) => m.english_short === englishShort && m.status === 'active',
  );
  if (existingActive) {
    throw new Error(
      `[id-registry] english_short 已被占用: ${englishShort}（当前归属 ${existingActive.module_id}）`,
    );
  }

  /* 扫描最小未占用 sequence */
  const usedSequences = new Set(registry.modules.map((m) => m.sequence));
  let sequence = -1;
  for (let seq = 0; seq < 100; seq++) {
    if (!usedSequences.has(seq)) {
      sequence = seq;
      break;
    }
  }
  if (sequence === -1) {
    throw new Error('[id-registry] 模块编号空间耗尽（0-99 均已分配）');
  }

  /* 构造 module_id */
  const sequenceStr = String(sequence).padStart(2, '0');
  const moduleId = `Model_${capitalizeFirst(englishShort)}_${sequenceStr}`;

  /* 构造 ModuleRecord 并加入 registry */
  const record: ModuleRecord = {
    module_id: moduleId,
    english_short: englishShort,
    sequence,
    name,
    allocated_at: new Date().toISOString(),
    status: 'active',
  };
  registry.modules.push(record);

  return { module_id: moduleId, sequence };
}

/**
 * 分配新 doc_id
 *
 * 输入：IdRegistry 对象、所属 module_id、文档标题
 * 输出：分配结果（含 doc_id 与 sequence）
 * 流程：
 * 1. 校验 module_id 存在且 active
 * 2. 获取模块的 english_short 与 sequence
 * 3. 扫描此模块下最小未占用 doc sequence（1-999）
 * 4. 构造 DocRecord 并加入 registry.docs
 *
 * @param registry - IdRegistry 对象（会被修改）
 * @param moduleId - 所属模块 ID
 * @param title - 文档标题
 * @returns 分配结果
 * @throws {Error} module_id 不存在、非 active，或文档编号空间耗尽
 */
export function allocateDocId(
  registry: IdRegistry,
  moduleId: string,
  title: string,
): AllocatedDocId {
  /* 查找模块 */
  const module = registry.modules.find((m) => m.module_id === moduleId);
  if (!module) {
    throw new Error(`[id-registry] module_id 不存在: ${moduleId}`);
  }
  if (module.status !== 'active') {
    throw new Error(`[id-registry] module_id 非 active: ${moduleId}（当前 ${module.status}）`);
  }

  /* 扫描此模块下最小未占用 doc sequence（1-999） */
  const usedDocSequences = new Set(
    registry.docs
      .filter((d) => d.module_id === moduleId)
      .map((d) => d.sequence),
  );
  let sequence = -1;
  for (let seq = 1; seq <= 999; seq++) {
    if (!usedDocSequences.has(seq)) {
      sequence = seq;
      break;
    }
  }
  if (sequence === -1) {
    throw new Error(`[id-registry] 模块 ${moduleId} 文档编号空间耗尽（1-999 均已分配）`);
  }

  /* 构造 doc_id */
  const moduleSeqStr = String(module.sequence).padStart(2, '0');
  const docSeqStr = String(sequence).padStart(3, '0');
  const docId = `Doc_${capitalizeFirst(module.english_short)}_${moduleSeqStr}_${docSeqStr}`;

  /* 构造 DocRecord 并加入 registry */
  const record: DocRecord = {
    doc_id: docId,
    module_id: moduleId,
    sequence,
    title,
    allocated_at: new Date().toISOString(),
    status: 'active',
  };
  registry.docs.push(record);

  return { doc_id: docId, sequence };
}

/**
 * 退役 module_id
 *
 * 输入：IdRegistry 对象、module_id
 * 输出：无（修改 registry）
 * 流程：
 * 1. 查找模块记录
 * 2. 校验当前状态为 active
 * 3. 更新状态为 retired，记录 retired_at
 * 4. 同时退役此模块下所有 active 文档
 *
 * @param registry - IdRegistry 对象（会被修改）
 * @param moduleId - 待退役的 module_id
 * @throws {Error} module_id 不存在或已 retired
 */
export function retireModuleId(registry: IdRegistry, moduleId: string): void {
  const module = registry.modules.find((m) => m.module_id === moduleId);
  if (!module) {
    throw new Error(`[id-registry] module_id 不存在: ${moduleId}`);
  }
  if (module.status !== 'active') {
    throw new Error(`[id-registry] module_id 已 retired: ${moduleId}`);
  }
  module.status = 'retired';
  module.retired_at = new Date().toISOString();

  /* 同时退役此模块下所有 active 文档 */
  for (const doc of registry.docs) {
    if (doc.module_id === moduleId && doc.status === 'active') {
      doc.status = 'retired';
      doc.retired_at = new Date().toISOString();
    }
  }
}

/**
 * 退役 doc_id
 *
 * 输入：IdRegistry 对象、doc_id
 * 输出：无（修改 registry）
 * 流程：
 * 1. 查找文档记录
 * 2. 校验当前状态为 active
 * 3. 更新状态为 retired，记录 retired_at
 *
 * @param registry - IdRegistry 对象（会被修改）
 * @param docId - 待退役的 doc_id
 * @throws {Error} doc_id 不存在或已 retired
 */
export function retireDocId(registry: IdRegistry, docId: string): void {
  const doc = registry.docs.find((d) => d.doc_id === docId);
  if (!doc) {
    throw new Error(`[id-registry] doc_id 不存在: ${docId}`);
  }
  if (doc.status !== 'active') {
    throw new Error(`[id-registry] doc_id 已 retired: ${docId}`);
  }
  doc.status = 'retired';
  doc.retired_at = new Date().toISOString();
}

/**
 * 查询 module_id 是否存在（含 active 与 retired）
 *
 * @param registry - IdRegistry 对象
 * @param moduleId - 待查询的 module_id
 * @returns 是否存在
 */
export function moduleExists(registry: IdRegistry, moduleId: string): boolean {
  return registry.modules.some((m) => m.module_id === moduleId);
}

/**
 * 查询 doc_id 是否存在（含 active 与 retired）
 *
 * @param registry - IdRegistry 对象
 * @param docId - 待查询的 doc_id
 * @returns 是否存在
 */
export function docExists(registry: IdRegistry, docId: string): boolean {
  return registry.docs.some((d) => d.doc_id === docId);
}

/**
 * 查询 module_id 是否活跃
 *
 * @param registry - IdRegistry 对象
 * @param moduleId - 待查询的 module_id
 * @returns 是否活跃（true 表示 active）
 */
export function isModuleActive(registry: IdRegistry, moduleId: string): boolean {
  const module = registry.modules.find((m) => m.module_id === moduleId);
  return module?.status === 'active';
}

/**
 * 查询 doc_id 是否活跃
 *
 * @param registry - IdRegistry 对象
 * @param docId - 待查询的 doc_id
 * @returns 是否活跃（true 表示 active）
 */
export function isDocActive(registry: IdRegistry, docId: string): boolean {
  const doc = registry.docs.find((d) => d.doc_id === docId);
  return doc?.status === 'active';
}

/**
 * 获取模块记录
 *
 * @param registry - IdRegistry 对象
 * @param moduleId - 模块 ID
 * @returns 模块记录（不存在返回 undefined）
 */
export function getModuleRecord(registry: IdRegistry, moduleId: string): ModuleRecord | undefined {
  return registry.modules.find((m) => m.module_id === moduleId);
}

/**
 * 获取文档记录
 *
 * @param registry - IdRegistry 对象
 * @param docId - 文档 ID
 * @returns 文档记录（不存在返回 undefined）
 */
export function getDocRecord(registry: IdRegistry, docId: string): DocRecord | undefined {
  return registry.docs.find((d) => d.doc_id === docId);
}

/**
 * 获取 id-registry.json 默认路径
 *
 * @returns 默认路径
 */
export function getDefaultRegistryPath(): string {
  return DEFAULT_REGISTRY_PATH;
}

/**
 * 首字母大写
 *
 * 输入：java
 * 输出：Java
 *
 * @param str - 原始字符串
 * @returns 首字母大写的字符串
 */
function capitalizeFirst(str: string): string {
  if (str.length === 0) {
    return str;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
