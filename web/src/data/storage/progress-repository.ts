/**
 * 文档阅读进度仓库（IndexedDB 持久化）
 *
 * 功能概述：
 * 基于 IndexedDB 存储文档阅读进度记录，提供按模块、书签、完成状态等多维度查询能力，
 * 支持导入导出 JSON 包用于备份与跨设备迁移。所有异步方法均通过 try-catch 包裹，
 * 异常时返回安全默认值，保证 SSR 与浏览器环境均不抛错。
 *
 * 设计原则：
 * - SSR 安全：typeof indexedDB === 'undefined' 时安全降级
 * - 类型严格：无 any/unknown，所有类型显式声明
 * - 单一职责：仅负责数据存取，不承载业务逻辑（业务逻辑在 progress-service）
 * - 无循环依赖：仅依赖标准浏览器 API
 *
 * 与 lib/progress.ts 的关系：
 * - lib/progress.ts 保存简化版 ReadingProgress（status/lastRead/scrollPos），用于 ProgressToggle 等组件快速同步
 * - 本仓库保存完整版 ProgressRecord（含 moduleId/readingTime/bookmarked/completedAt 等），用于统计与推荐
 * - 两者通过 docSlug 关联，progress-service 负责聚合
 */

/** 文档阅读状态（与任务规范对齐） */
export type ProgressStatus = 'not-started' | 'reading' | 'completed';

/**
 * 文档阅读进度记录
 * 每条记录对应一个文档的学习状态（按 docSlug 唯一）
 */
export interface ProgressRecord {
  /** 文档唯一标识（格式为 "moduleId/slug"） */
  docSlug: string;
  /** 所属模块 ID */
  moduleId: string;
  /** 阅读状态 */
  status: ProgressStatus;
  /** 阅读进度百分比（0-100） */
  progress: number;
  /** 累计阅读时长（秒） */
  readingTime: number;
  /** 是否标记为书签 */
  bookmarked: boolean;
  /** 最后阅读时间戳（ms） */
  lastReadAt?: number;
  /** 完成时间戳（ms）；仅 status === 'completed' 时存在 */
  completedAt?: number;
}

/** IndexedDB 数据库配置 */
const DB_NAME = 'fandex-progress-record-db';
const DB_VERSION = 1;
const STORE_NAME = 'records';
/** 索引名称常量 */
const INDEX_MODULE_ID = 'moduleId';
const INDEX_STATUS = 'status';
const INDEX_BOOKMARKED = 'bookmarked';
const INDEX_LAST_READ_AT = 'lastReadAt';

/** localStorage 缓存键名（与 lib/progress 区分，避免冲突） */
const CACHE_KEY = 'fandex-progress-records-cache';

/**
 * 打开 IndexedDB 连接（SSR 安全）
 * @returns IDBDatabase 实例；SSR 或环境不支持时返回 null
 */
function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      // 创建 object store 与索引（仅首次或版本升级时执行）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'docSlug' });
        store.createIndex(INDEX_MODULE_ID, 'moduleId', { unique: false });
        store.createIndex(INDEX_STATUS, 'status', { unique: false });
        // IDBValidKey 类型未涵盖 boolean，但运行时 IndexedDB 支持以 boolean 作为索引键
        store.createIndex(INDEX_BOOKMARKED, 'bookmarked', { unique: false });
        store.createIndex(INDEX_LAST_READ_AT, 'lastReadAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 包装 IDBRequest 为 Promise
 * @param req - IDBRequest 实例
 * @returns Promise，resolve 收到 result，reject 收到 error
 */
function wrapRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * 包装 IDBTransaction 为 Promise
 * 监听 transaction 的 oncomplete/onerror/onabort 事件
 * @param tx - IDBTransaction 实例
 */
function wrapTransaction(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

/**
 * 写入 localStorage 缓存（SSR 安全）
 * 缓存全量记录数组，用于快速读取避免每次都打开 IndexedDB
 * @param records - 全量进度记录数组
 */
function writeCache(records: ProgressRecord[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(records));
  } catch {
    // 缓存写入失败静默忽略（可能存储空间不足）
  }
}

/**
 * 读取 localStorage 缓存（SSR 安全）
 * @returns 缓存的进度记录数组；无缓存或异常时返回 undefined
 */
function readCache(): ProgressRecord[] | undefined {
  if (typeof localStorage === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as ProgressRecord[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 文档阅读进度仓库
 * 单例模式，所有方法均为实例方法，提供按多维度查询与导入导出能力
 */
export class ProgressRepository {
  /**
   * 写入或更新一条进度记录（upsert 语义）
   * 同时更新 localStorage 缓存以加快后续读取
   * @param record - 进度记录
   */
  async upsert(record: ProgressRecord): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      await wrapTransaction(tx);
      db.close();
      // 同步更新缓存
      const all = await this.getAll();
      const idx = all.findIndex((r) => r.docSlug === record.docSlug);
      if (idx >= 0) {
        all[idx] = record;
      } else {
        all.push(record);
      }
      writeCache(all);
    } catch {
      // 存储异常静默忽略，不影响业务流程
    }
  }

  /**
   * 根据 docSlug 获取单条记录
   * @param docSlug - 文档唯一标识
   * @returns 记录；未找到或异常时返回 undefined
   */
  async get(docSlug: string): Promise<ProgressRecord | undefined> {
    try {
      const db = await openDB();
      if (!db) return undefined;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const result = (await wrapRequest(tx.objectStore(STORE_NAME).get(docSlug))) as
        ProgressRecord | undefined;
      db.close();
      return result ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取指定模块的全部进度记录
   * @param moduleId - 模块 ID
   * @returns 记录数组；异常时返回空数组
   */
  async getByModule(moduleId: string): Promise<ProgressRecord[]> {
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index(INDEX_MODULE_ID);
      const result = (await wrapRequest(index.getAll(moduleId))) as ProgressRecord[];
      db.close();
      return result ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 获取全部进度记录（优先读取 localStorage 缓存以加速）
   * @returns 记录数组；异常时返回空数组
   */
  async getAll(): Promise<ProgressRecord[]> {
    // 优先读取缓存
    const cached = readCache();
    if (cached) return cached;
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const result = (await wrapRequest(tx.objectStore(STORE_NAME).getAll())) as ProgressRecord[];
      db.close();
      const records = result ?? [];
      writeCache(records);
      return records;
    } catch {
      return [];
    }
  }

  /**
   * 获取所有标记为书签的进度记录
   * @returns 书签记录数组；异常时返回空数组
   */
  async getBookmarked(): Promise<ProgressRecord[]> {
    try {
      const all = await this.getAll();
      return all.filter((r) => r.bookmarked);
    } catch {
      return [];
    }
  }

  /**
   * 获取所有已完成的进度记录
   * @returns 已完成记录数组；异常时返回空数组
   */
  async getCompleted(): Promise<ProgressRecord[]> {
    try {
      const all = await this.getAll();
      return all.filter((r) => r.status === 'completed');
    } catch {
      return [];
    }
  }

  /**
   * 获取所有进行中（status === 'reading'）的进度记录
   * @returns 进行中记录数组；异常时返回空数组
   */
  async getInProgress(): Promise<ProgressRecord[]> {
    try {
      const all = await this.getAll();
      return all.filter((r) => r.status === 'reading');
    } catch {
      return [];
    }
  }

  /**
   * 清空全部进度记录
   * 同时清除 localStorage 缓存
   */
  async clearAll(): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      await wrapTransaction(tx);
      db.close();
      writeCache([]);
    } catch {
      // 异常时静默忽略
    }
  }

  /**
   * 导出全部进度记录为 JSON 字符串
   * @returns JSON 字符串；异常时返回空记录字面量
   */
  async exportJSON(): Promise<string> {
    const all = await this.getAll();
    return JSON.stringify(
      {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        records: all,
      },
      null,
      2
    );
  }

  /**
   * 从 JSON 字符串导入进度记录（覆盖式）
   * 导入完成后同步更新 localStorage 缓存
   * @param json - JSON 字符串（由 exportJSON 产生）
   */
  async importJSON(json: string): Promise<void> {
    try {
      const parsed = JSON.parse(json) as { records?: ProgressRecord[] };
      const records = parsed.records ?? [];
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // 先清空再写入，保证导入数据的一致性
      store.clear();
      for (const record of records) {
        store.put(record);
      }
      await wrapTransaction(tx);
      db.close();
      writeCache(records);
    } catch {
      // 导入异常静默忽略，避免影响 UI
    }
  }
}

/** 仓库单例（模块级缓存，避免重复实例化） */
let repositoryInstance: ProgressRepository | null = null;

/**
 * 获取仓库单例
 * @returns ProgressRepository 实例
 */
export function getProgressRepository(): ProgressRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ProgressRepository();
  }
  return repositoryInstance;
}
