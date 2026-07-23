/**
 * 文档路径映射模块
 *
 * 功能概述：
 * 维护 source_path → doc_id 的映射关系，用于 generate-manifest 将扫描到的
 * 物理文件映射到 id-registry 中的 doc_id。
 *
 * 设计目的：
 * - id-registry.json 仅追踪 ID 分配状态（active/retired），不追踪 source_path
 * - doc-id-map.json 追踪 source_path → doc_id 的当前映射
 * - 文档改名时，旧 source_path 的映射删除，新 source_path 的映射添加（doc_id 不变）
 * - 职责分离：id-registry 管 ID 生命周期，doc-id-map 管路径映射
 *
 * 文件位置：
 * - doc-id-map.json 位于 cnt-content/full/_doc-id-map.json（内容层 full 目录，git 跟踪）
 * - 与 _id-registry.json 同级
 * - mobile 版本已归档为 _doc-id-map-mobile.archived.json（三端架构统一后仅保留 full）
 *
 * 数据结构：
 * {
 *   "map_version": "1.0.0",
 *   "updated_at": "2026-07-21T...",
 *   "manifest_type": "full",  // 或 "mobile"
 *   "mappings": {
 *     "java/快速入门.md": "Doc_Java_00_001",
 *     "python/装饰器.md": "Doc_Python_01_001"
 *   }
 * }
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ManifestType } from './types';

/** 当前模块所在目录 */
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * doc-id-map.json 默认路径
 *
 * 三端架构统一后，doc-id-map 迁入内容层 full 目录：
 * - full 类型：cnt-content/full/_doc-id-map.json（当前活跃版本）
 * - mobile 类型：cnt-content/full/_doc-id-map-mobile.archived.json（已归档，仅保留历史）
 */
function getDefaultMapPath(manifestType: ManifestType): string {
  const fileName =
    manifestType === 'full'
      ? '_doc-id-map.json'
      : `_doc-id-map-${manifestType}.archived.json`;
  return resolve(__dirname, '..', '..', '..', 'cnt-content', 'full', fileName);
}

/** 文档路径映射结构 */
export interface DocIdMap {
  /** Schema 版本号 */
  map_version: string;
  /** 映射最后更新时间（ISO 8601 UTC） */
  updated_at: string;
  /** 对应 manifest 类型（full 或 mobile） */
  manifest_type: ManifestType;
  /** source_path → doc_id 映射表 */
  mappings: Record<string, string>;
}

/**
 * 加载 doc-id-map
 *
 * 输入：manifest 类型、可选的映射文件路径
 * 输出：DocIdMap 对象
 * 流程：
 * 1. 读取文件（不存在则返回空映射）
 * 2. JSON 解析
 *
 * @param manifestType - manifest 类型
 * @param mapPath - 映射文件路径（可选）
 * @returns DocIdMap 对象
 */
export function loadDocIdMap(
  manifestType: ManifestType,
  mapPath?: string,
): DocIdMap {
  const filePath = mapPath ?? getDefaultMapPath(manifestType);
  if (!existsSync(filePath)) {
    return createEmptyMap(manifestType);
  }
  const content = readFileSync(filePath, 'utf-8');
  const map = JSON.parse(content) as DocIdMap;
  return map;
}

/**
 * 保存 doc-id-map
 *
 * 输入：DocIdMap 对象、可选的映射文件路径
 * 输出：无（写入文件）
 *
 * @param map - DocIdMap 对象
 * @param mapPath - 映射文件路径（可选）
 */
export function saveDocIdMap(map: DocIdMap, mapPath?: string): void {
  const filePath = mapPath ?? getDefaultMapPath(map.manifest_type);
  map.updated_at = new Date().toISOString();

  /* 确保目录存在 */
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  /* 写入文件 */
  const json = JSON.stringify(map, null, 2);
  writeFileSync(filePath, `${json}\n`, 'utf-8');
}

/**
 * 创建空映射
 *
 * @param manifestType - manifest 类型
 * @returns 空 DocIdMap 对象
 */
function createEmptyMap(manifestType: ManifestType): DocIdMap {
  return {
    map_version: '1.0.0',
    updated_at: new Date().toISOString(),
    manifest_type: manifestType,
    mappings: {},
  };
}

/**
 * 添加映射
 *
 * 输入：DocIdMap 对象、source_path、doc_id
 * 输出：无（修改 map）
 *
 * @param map - DocIdMap 对象（会被修改）
 * @param sourcePath - 文档源路径
 * @param docId - 文档 ID
 * @throws {Error} source_path 已映射到其他 doc_id
 */
export function addMapping(map: DocIdMap, sourcePath: string, docId: string): void {
  const existing = map.mappings[sourcePath];
  if (existing && existing !== docId) {
    throw new Error(
      `[doc-id-map] source_path 已映射到其他 doc_id: ${sourcePath} → ${existing}（尝试映射到 ${docId}）`,
    );
  }
  map.mappings[sourcePath] = docId;
}

/**
 * 移除映射
 *
 * 输入：DocIdMap 对象、source_path
 * 输出：是否移除成功
 *
 * @param map - DocIdMap 对象（会被修改）
 * @param sourcePath - 文档源路径
 * @returns 是否移除成功（false 表示映射不存在）
 */
export function removeMapping(map: DocIdMap, sourcePath: string): boolean {
  if (map.mappings[sourcePath]) {
    delete map.mappings[sourcePath];
    return true;
  }
  return false;
}

/**
 * 改名映射
 *
 * 输入：DocIdMap 对象、旧 source_path、新 source_path
 * 输出：无（修改 map）
 * 流程：
 * 1. 查找旧 source_path 的 doc_id
 * 2. 删除旧映射
 * 3. 添加新映射（doc_id 不变）
 *
 * @param map - DocIdMap 对象（会被修改）
 * @param oldPath - 旧 source_path
 * @param newPath - 新 source_path
 * @throws {Error} 旧 source_path 不存在，或新 source_path 已被占用
 */
export function renameMapping(map: DocIdMap, oldPath: string, newPath: string): void {
  const docId = map.mappings[oldPath];
  if (!docId) {
    throw new Error(`[doc-id-map] 旧 source_path 不存在: ${oldPath}`);
  }
  if (map.mappings[newPath] && map.mappings[newPath] !== docId) {
    throw new Error(
      `[doc-id-map] 新 source_path 已被其他 doc_id 占用: ${newPath} → ${map.mappings[newPath]}`,
    );
  }
  delete map.mappings[oldPath];
  map.mappings[newPath] = docId;
}

/**
 * 查询 source_path 对应的 doc_id
 *
 * @param map - DocIdMap 对象
 * @param sourcePath - 文档源路径
 * @returns doc_id（不存在返回 undefined）
 */
export function lookupDocId(map: DocIdMap, sourcePath: string): string | undefined {
  return map.mappings[sourcePath];
}

/**
 * 查询 doc_id 对应的所有 source_path
 *
 * 注意：一个 doc_id 理论上只对应一个 source_path（文档改名时旧路径删除），
 * 但此函数返回数组以应对可能的映射残留。
 *
 * @param map - DocIdMap 对象
 * @param docId - 文档 ID
 * @returns source_path 数组（空数组表示无映射）
 */
export function lookupSourcePaths(map: DocIdMap, docId: string): string[] {
  return Object.entries(map.mappings)
    .filter(([, id]) => id === docId)
    .map(([path]) => path);
}

/**
 * 获取所有映射条目
 *
 * @param map - DocIdMap 对象
 * @returns 映射条目数组（[source_path, doc_id]）
 */
export function getAllMappings(map: DocIdMap): Array<[string, string]> {
  return Object.entries(map.mappings);
}

/**
 * 获取默认映射文件路径
 *
 * @param manifestType - manifest 类型
 * @returns 默认路径
 */
export function getDefaultMapPathForType(manifestType: ManifestType): string {
  return getDefaultMapPath(manifestType);
}
