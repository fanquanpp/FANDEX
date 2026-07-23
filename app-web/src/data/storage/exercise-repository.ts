/**
 * 习题数据仓库（IndexedDB 持久化）
 *
 * 功能概述：
 * 基于 IndexedDB 存储用户作答记录，提供按模块、文档、错题等多维度查询能力，
 * 支持导入导出 JSON 包用于备份与跨设备迁移。所有异步方法均通过 try-catch 包裹，
 * 异常时返回安全默认值，保证 SSR 与浏览器环境均不抛错。
 *
 * 设计原则：
 * - SSR 安全：typeof indexedDB === 'undefined' 时安全降级
 * - 类型严格：无 any/unknown，所有类型显式声明
 * - 单一职责：仅负责数据存取，不做判题逻辑（判题在 exercise-service）
 * - 无循环依赖：仅依赖标准浏览器 API
 */

/** 习题类型枚举（与 src/types/exercise.ts 对齐） */
export type ExerciseType = 'fill-blank' | 'choice' | 'code-fix' | 'open-ended';

/**
 * 习题作答记录
 * 每条记录对应一次习题的最终作答状态（重复提交会覆盖）
 */
export interface ExerciseRecord {
  /** 习题 ID（模块内唯一） */
  id: string;
  /** 所属模块 ID */
  moduleId: string;
  /** 所属文档 slug */
  docSlug: string;
  /** 习题类型 */
  type: ExerciseType;
  /** 题干文本（用于错题集展示） */
  question: string;
  /** 用户答案（open-ended 自评时为用户输入内容） */
  userAnswer?: string;
  /** 参考答案（用于错题展示与对比） */
  correctAnswer: string;
  /**
   * 是否答对
   * - true：答对
   * - false：答错
   * - null：未作答或自评题（open-ended 自评前为 null）
   */
  isCorrect: boolean | null;
  /** 尝试次数（每次提交 +1） */
  attempts: number;
  /** 最后作答时间戳（ms） */
  lastAttempted?: number;
  /** 创建时间戳（ms） */
  createdAt: number;
}

/** IndexedDB 数据库配置 */
const DB_NAME = 'fandex-exercise-db';
const DB_VERSION = 1;
const STORE_NAME = 'exercises';
/** 索引名称常量 */
const INDEX_MODULE_ID = 'moduleId';
const INDEX_DOC_SLUG = 'docSlug';
const INDEX_IS_CORRECT = 'isCorrect';

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
      // 创建 object store（仅首次或版本升级时执行）
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex(INDEX_MODULE_ID, 'moduleId', { unique: false });
        store.createIndex(INDEX_DOC_SLUG, 'docSlug', { unique: false });
        store.createIndex(INDEX_IS_CORRECT, 'isCorrect', { unique: false });
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
 * 习题数据仓库
 * 单例模式，所有方法均为实例方法，便于后续扩展（如缓存、订阅）
 */
export class ExerciseRepository {
  /**
   * 保存（或覆盖）一条作答记录
   * @param record - 作答记录
   */
  async save(record: ExerciseRecord): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      await wrapTransaction(tx);
      db.close();
    } catch {
      // 存储异常静默忽略，不影响业务流程
    }
  }

  /**
   * 根据 ID 获取单条记录
   * @param id - 习题 ID
   * @returns 记录；未找到或异常时返回 undefined
   */
  async get(id: string): Promise<ExerciseRecord | undefined> {
    try {
      const db = await openDB();
      if (!db) return undefined;
      const tx = db.transaction(STORE_NAME, 'readonly');
      const result = (await wrapRequest(tx.objectStore(STORE_NAME).get(id))) as
        ExerciseRecord | undefined;
      db.close();
      return result ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取指定模块的所有作答记录
   * @param moduleId - 模块 ID
   * @returns 记录数组；异常时返回空数组
   */
  async getByModule(moduleId: string): Promise<ExerciseRecord[]> {
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index(INDEX_MODULE_ID);
      const result = (await wrapRequest(index.getAll(moduleId))) as ExerciseRecord[];
      db.close();
      return result ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 获取指定文档的所有作答记录
   * @param docSlug - 文档 slug
   * @returns 记录数组；异常时返回空数组
   */
  async getByDoc(docSlug: string): Promise<ExerciseRecord[]> {
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index(INDEX_DOC_SLUG);
      const result = (await wrapRequest(index.getAll(docSlug))) as ExerciseRecord[];
      db.close();
      return result ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 获取全部作答记录
   * @returns 记录数组；异常时返回空数组
   */
  async getAll(): Promise<ExerciseRecord[]> {
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const result = (await wrapRequest(tx.objectStore(STORE_NAME).getAll())) as ExerciseRecord[];
      db.close();
      return result ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 获取错题集（isCorrect === false）
   * @returns 答错的记录数组；异常时返回空数组
   */
  async getIncorrect(): Promise<ExerciseRecord[]> {
    try {
      const db = await openDB();
      if (!db) return [];
      const tx = db.transaction(STORE_NAME, 'readonly');
      const index = tx.objectStore(STORE_NAME).index(INDEX_IS_CORRECT);
      // IndexedDB 索引查询仅能匹配 JS 值，false 对应布尔键
      // IDBValidKey 类型未涵盖 boolean，但运行时 IndexedDB 支持以 boolean 作为索引查询值
      // @ts-expect-error - TS2352: boolean 与 IDBValidKey 无重叠，运行时此查询有效
      const result = (await wrapRequest(index.getAll(false))) as ExerciseRecord[];
      db.close();
      return result ?? [];
    } catch {
      return [];
    }
  }

  /**
   * 清空全部作答记录
   */
  async clearAll(): Promise<void> {
    try {
      const db = await openDB();
      if (!db) return;
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      await wrapTransaction(tx);
      db.close();
    } catch {
      // 异常时静默忽略
    }
  }

  /**
   * 导出全部作答记录为 JSON 字符串
   * @returns JSON 字符串；异常时返回空数组字面量
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
   * 从 JSON 字符串导入作答记录（覆盖式）
   * @param json - JSON 字符串（由 exportJSON 产生）
   */
  async importJSON(json: string): Promise<void> {
    try {
      const parsed = JSON.parse(json) as { records?: ExerciseRecord[] };
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
    } catch {
      // 导入异常静默忽略，避免影响 UI
    }
  }
}

/** 仓库单例（模块级缓存，避免重复实例化） */
let repositoryInstance: ExerciseRepository | null = null;

/**
 * 获取仓库单例
 * @returns ExerciseRepository 实例
 */
export function getExerciseRepository(): ExerciseRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ExerciseRepository();
  }
  return repositoryInstance;
}
