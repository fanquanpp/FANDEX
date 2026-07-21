/**
 * 共享类型定义模块
 *
 * 功能概述：
 * 定义 manifest、op-list、id-registry 的 TypeScript 类型。
 * 类型与 shared/*.schema.json 严格对齐，由工具链各模块引用。
 *
 * 设计目的：
 * - 提供编译时类型检查，避免运行时结构错误
 * - 集中管理类型定义，便于维护与变更
 * - 类型与 Schema 双重保障数据结构合法性
 */

/* ========== Manifest 类型 ========== */

/** manifest 类型枚举 */
export type ManifestType = 'full' | 'mobile';

/** 模块定义 */
export interface Module {
  /** 模块唯一标识符（Model_<EnglishShort>_<NN>） */
  module_id: string;
  /** 模块显示名称（中文） */
  name: string;
  /** 模块英文简称（小写） */
  english_short: string;
  /** 模块两位数字编号（0-99） */
  sequence: number;
  /** 此模块下的文档数量 */
  docs_count: number;
  /** 模块图标标识（可选） */
  icon?: string;
  /** 模块主题色（可选，hex 格式） */
  color?: string;
  /** 模块简介（可选） */
  description?: string;
}

/** 单篇文档定义 */
export interface Doc {
  /** 文档唯一标识符（Doc_<EnglishShort>_<NN>_<NNN>） */
  doc_id: string;
  /** 所属模块 ID */
  module_id: string;
  /** 文档显示标题（中文） */
  title: string;
  /** 文档相对路径（相对于 content/full/ 或 content/mobile/） */
  source_path: string;
  /** 文档文件内容的 SHA-256 哈希值（小写 hex） */
  sha256: string;
  /** 文档文件大小（字节） */
  size: number;
  /** 文档最近更新时间（ISO 8601 UTC） */
  updated_at: string;
  /** 此文档兼容的应用最低版本（可选） */
  compat_version?: string;
  /** 文档标签（可选） */
  tags?: string[];
}

/** 签名对象 */
export interface SignatureObject {
  /** 签名算法，固定为 EdDSA */
  algorithm: 'EdDSA';
  /** 公钥指纹（SHA-256 前 16 字符 hex） */
  public_key_fingerprint: string;
  /** 签名值（base64 编码） */
  value: string;
}

/** 完整 manifest 结构 */
export interface Manifest {
  /** Schema 版本号 */
  manifest_version: string;
  /** manifest 类型 */
  manifest_type: ManifestType;
  /** manifest 生成时间（ISO 8601 UTC） */
  generated_at: string;
  /** 此 manifest 兼容的应用最低版本 */
  app_compat_version: string;
  /** 模块列表 */
  modules: Module[];
  /** 文档列表 */
  docs: Doc[];
  /** 归档来源版本（仅归档 manifest 存在） */
  archive_of?: string;
  /** Ed25519 签名信息 */
  signature: SignatureObject;
}

/* ========== Op-List 类型 ========== */

/** 操作类型枚举 */
export type OpType = 'add-module' | 'modify-doc' | 'add-doc' | 'remove-doc' | 'remove-module';

/** modify-doc 操作的变更字段集合 */
export interface DocChanges {
  /** 新标题（可选，仅改名时存在） */
  title?: string;
  /** 新源路径（可选，仅改名或移动时存在） */
  source_path?: string;
  /** 新内容 SHA-256（必填） */
  sha256: string;
  /** 新文件大小（必填） */
  size: number;
  /** 新更新时间（必填） */
  updated_at: string;
  /** 新兼容版本（可选，null 表示取消限制） */
  compat_version?: string | null;
  /** 新标签列表（可选） */
  tags?: string[];
}

/** 单个操作基础结构 */
export interface BaseOp {
  /** 操作类型 */
  op_type: OpType;
  /** 操作唯一标识符（UUID v4） */
  op_id: string;
}

/** add-module 操作 */
export interface AddModuleOp extends BaseOp {
  op_type: 'add-module';
  /** 新模块的完整定义 */
  module: Module;
  /** 新模块下的初始文档列表（可选） */
  docs?: Doc[];
}

/** modify-doc 操作 */
export interface ModifyDocOp extends BaseOp {
  op_type: 'modify-doc';
  /** 待修改文档的 doc_id */
  doc_id: string;
  /** 待变更的字段集合 */
  changes: DocChanges;
}

/** add-doc 操作 */
export interface AddDocOp extends BaseOp {
  op_type: 'add-doc';
  /** 新文档的完整定义 */
  doc: Doc;
}

/** remove-doc 操作 */
export interface RemoveDocOp extends BaseOp {
  op_type: 'remove-doc';
  /** 待删除文档的 doc_id */
  doc_id: string;
}

/** remove-module 操作 */
export interface RemoveModuleOp extends BaseOp {
  op_type: 'remove-module';
  /** 待删除模块的 module_id */
  module_id: string;
}

/** 所有操作类型的联合 */
export type Op =
  | AddModuleOp
  | ModifyDocOp
  | AddDocOp
  | RemoveDocOp
  | RemoveModuleOp;

/** 完整 op-list 结构 */
export interface OpList {
  /** Schema 版本号 */
  op_list_version: string;
  /** 对应 manifest 类型 */
  manifest_type: ManifestType;
  /** 起始 manifest 版本号 */
  from_manifest_version: string;
  /** 目标 manifest 版本号 */
  to_manifest_version: string;
  /** op-list 生成时间（ISO 8601 UTC） */
  generated_at: string;
  /** 操作列表 */
  ops: Op[];
  /** Ed25519 签名信息 */
  signature: SignatureObject;
}

/* ========== ID-Registry 类型 ========== */

/** 模块 ID 记录 */
export interface ModuleRecord {
  /** 模块唯一标识符 */
  module_id: string;
  /** 模块英文简称（小写） */
  english_short: string;
  /** 模块两位数字编号（0-99） */
  sequence: number;
  /** 模块显示名称（中文） */
  name: string;
  /** module_id 分配时间（ISO 8601 UTC） */
  allocated_at: string;
  /** 模块状态（active 或 retired） */
  status: 'active' | 'retired';
  /** 模块退役时间（仅 status=retired 时存在） */
  retired_at?: string;
}

/** 文档 ID 记录 */
export interface DocRecord {
  /** 文档唯一标识符 */
  doc_id: string;
  /** 所属模块 ID */
  module_id: string;
  /** 文档三位数字编号（1-999） */
  sequence: number;
  /** 文档标题（首次分配时的标题） */
  title: string;
  /** doc_id 分配时间（ISO 8601 UTC） */
  allocated_at: string;
  /** 文档状态（active 或 retired） */
  status: 'active' | 'retired';
  /** 文档退役时间（仅 status=retired 时存在） */
  retired_at?: string;
}

/** 完整 id-registry 结构 */
export interface IdRegistry {
  /** Schema 版本号 */
  registry_version: string;
  /** 注册表最后更新时间（ISO 8601 UTC） */
  updated_at: string;
  /** 下一个待分配的模块编号（0-100） */
  next_module_sequence?: number;
  /** 已分配的模块 ID 完整列表 */
  modules: ModuleRecord[];
  /** 已分配的文档 ID 完整列表 */
  docs: DocRecord[];
}
