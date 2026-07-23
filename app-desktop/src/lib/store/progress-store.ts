/**
 * 阅读进度状态管理 Store（Zustand v5 + 双层持久化 + 跨标签页同步）
 *
 * 功能概述：
 * - 使用 Zustand v5 `create` + `persist` + `subscribeWithSelector` 中间件
 * - 状态字段：progress（docId → status）、lastReadAt、recentDocs
 * - 双层持久化：localStorage（同步快速）+ IndexedDB（异步备份）
 * - BroadcastChannel('fandex-progress') 跨标签页同步
 * - 内存缓存层：getProgress 直接返回内存值，避免频繁反序列化
 *
 * 数据流：
 * 1. setProgress → 更新内存 state → persist 自动写 localStorage
 * 2. setProgress → 异步写 IndexedDB（progress-persist）
 * 3. setProgress → 广播 BroadcastChannel → 其他标签页接收更新
 * 4. 启动时：从 IndexedDB 同步到 localStorage 与内存
 *
 * 跨标签页同步协议：
 * - 发送：setProgress 时广播 { type: 'update', payload: { docId, status, ts } }
 * - 接收：更新本地状态（不再次广播，避免循环）
 * - 清空：clearAllProgress 时广播 { type: 'clear', payload: null }
 *
 * 使用示例：
 *   import { useProgressStore } from '@/lib/store/progress-store';
 *   const { progress, setProgress, getOverallProgress } = useProgressStore();
 */

import { create } from 'zustand';
import { createJSONStorage, persist, subscribeWithSelector } from 'zustand/middleware';
import { type BroadcastChannelController, createBroadcastChannel } from '@/lib/broadcast';
import {
  clearAllProgressDB,
  loadAllProgress,
  type ProgressStatus,
  persistProgress,
} from '@/lib/progress-persist';

/** 进度持久化键名 */
const STORAGE_KEY = 'fandex-progress';

/** 最近阅读列表最大长度 */
const MAX_RECENT_DOCS = 50;

/** 跨标签页同步 channel 名称 */
const BROADCAST_NAME = 'fandex-progress';

/** 跨标签页消息 payload 类型 */
interface ProgressBroadcastPayload {
  /** 消息类型 */
  type: 'update' | 'clear';
  /** 文档 ID（仅 update 类型需要） */
  docId?: string;
  /** 阅读状态（仅 update 类型需要） */
  status?: ProgressStatus;
  /** 时间戳 */
  ts: number;
}

/** 进度 Store 状态接口 */
export interface ProgressStoreState {
  /** 进度数据（docId → 阅读状态） */
  progress: Record<string, ProgressStatus>;
  /** 最近阅读时间戳（docId → timestamp） */
  lastReadAt: Record<string, number>;
  /** 最近阅读的 docId 列表（最新在前，最多 50 个） */
  recentDocs: string[];
  /** 是否已完成启动同步 */
  initialized: boolean;

  /** 获取单文档进度（内存快速路径） */
  getProgress: (docId: string) => ProgressStatus;
  /** 设置单文档进度（触发持久化 + 广播） */
  setProgress: (docId: string, status: ProgressStatus) => void;
  /** 切换单文档进度（unread → reading → read → unread 循环） */
  toggleProgress: (docId: string) => void;
  /** 获取最近阅读列表 */
  getRecentDocs: (limit: number) => string[];
  /** 获取模块级进度统计 */
  getModuleProgress: (
    moduleId: string,
    allDocIds: string[],
  ) => {
    total: number;
    read: number;
    reading: number;
    unread: number;
  };
  /** 获取整体进度统计 */
  getOverallProgress: (allDocIds?: string[]) => {
    total: number;
    read: number;
    reading: number;
    unread: number;
    percent: number;
  };
  /** 清空所有进度数据 */
  clearAllProgress: () => Promise<void>;
  /** 启动时从 IndexedDB 同步数据 */
  initialize: () => Promise<void>;
  /** 内部方法：从其他标签页接收更新 */
  _applyRemoteUpdate: (docId: string, status: ProgressStatus, ts: number) => void;
}

/** BroadcastChannel 单例（模块级，避免重复创建） */
let broadcastChannel: BroadcastChannelController<ProgressBroadcastPayload> | null = null;

/**
 * 获取或创建 BroadcastChannel 单例
 *
 * @returns BroadcastChannel 控制器
 */
function getBroadcastChannel(): BroadcastChannelController<ProgressBroadcastPayload> {
  if (!broadcastChannel) {
    broadcastChannel = createBroadcastChannel<ProgressBroadcastPayload>(BROADCAST_NAME);
  }
  return broadcastChannel;
}

/** 进度状态循环顺序 */
const STATUS_CYCLE: ProgressStatus[] = ['unread', 'reading', 'read'];

/**
 * 进度 Store 实现
 *
 * 设计要点：
 * 1. subscribeWithSelector 启用精准订阅（仅订阅需要的字段）
 * 2. persist 自动同步 localStorage（同步快速路径）
 * 3. setProgress 异步触发 IndexedDB 写入与广播
 * 4. _applyRemoteUpdate 接收广播更新，避免再次广播
 * 5. initialize 启动时从 IndexedDB 补偿数据
 */
export const useProgressStore = create<ProgressStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        progress: {},
        lastReadAt: {},
        recentDocs: [],
        initialized: false,

        /**
         * 获取单文档进度（内存快速路径）
         *
         * @param docId - 文档 ID
         * @returns 阅读状态，默认 'unread'
         */
        getProgress: (docId) => {
          return get().progress[docId] ?? 'unread';
        },

        /**
         * 设置单文档进度
         *
         * 实现细节：
         * 1. 更新内存 state（progress / lastReadAt / recentDocs）
         * 2. 异步写入 IndexedDB（progress-persist）
         * 3. 广播到其他标签页
         *
         * @param docId - 文档 ID
         * @param status - 目标状态
         */
        setProgress: (docId, status) => {
          const ts = Date.now();

          set((state) => {
            // 更新 recentDocs：移除已存在的 docId，再插入到列表头部
            const filteredRecent = state.recentDocs.filter((id) => id !== docId);
            const newRecent = [docId, ...filteredRecent].slice(0, MAX_RECENT_DOCS);

            return {
              progress: { ...state.progress, [docId]: status },
              lastReadAt: { ...state.lastReadAt, [docId]: ts },
              recentDocs: newRecent,
            };
          });

          // 异步双层持久化（IndexedDB 写入 + localStorage 由 persist 自动处理）
          // 使用 void 标记不阻塞主流程
          void persistProgress(docId, status, ts).catch((err) => {
            console.error('[progress-store] persistProgress failed:', err);
          });

          // 广播到其他标签页
          try {
            const channel = getBroadcastChannel();
            channel.post({
              type: 'update',
              payload: { type: 'update', docId, status, ts },
            });
          } catch (err) {
            console.error('[progress-store] broadcast failed:', err);
          }
        },

        /**
         * 切换单文档进度（unread → reading → read → unread 循环）
         *
         * @param docId - 文档 ID
         */
        toggleProgress: (docId) => {
          const current = get().getProgress(docId);
          const currentIndex = STATUS_CYCLE.indexOf(current);
          const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
          const next = STATUS_CYCLE[nextIndex] ?? 'unread';
          get().setProgress(docId, next);
        },

        /**
         * 获取最近阅读的 docId 列表
         *
         * @param limit - 返回数量上限
         * @returns docId 数组
         */
        getRecentDocs: (limit) => {
          return get().recentDocs.slice(0, limit);
        },

        /**
         * 获取模块级进度统计
         *
         * @param moduleId - 模块 ID（保留参数，用于未来扩展）
         * @param allDocIds - 该模块下所有文档 ID 列表
         * @returns 进度统计
         */
        getModuleProgress: (_moduleId, allDocIds) => {
          const progress = get().progress;
          let read = 0;
          let reading = 0;
          let unread = 0;

          for (const docId of allDocIds) {
            const status = progress[docId] ?? 'unread';
            if (status === 'read') read++;
            else if (status === 'reading') reading++;
            else unread++;
          }

          return {
            total: allDocIds.length,
            read,
            reading,
            unread,
          };
        },

        /**
         * 获取整体进度统计
         *
         * @param allDocIds - 所有文档 ID 列表（可选，未提供时使用 progress 的 key 数）
         * @returns 进度统计
         */
        getOverallProgress: (allDocIds) => {
          const progress = get().progress;
          const allKeys = allDocIds ?? Object.keys(progress);
          let read = 0;
          let reading = 0;
          let unread = 0;

          for (const docId of allKeys) {
            const status = progress[docId] ?? 'unread';
            if (status === 'read') read++;
            else if (status === 'reading') reading++;
            else unread++;
          }

          const total = allKeys.length;
          const percent = total === 0 ? 0 : Math.round((read / total) * 100);

          return { total, read, reading, unread, percent };
        },

        /**
         * 清空所有进度数据
         *
         * 实现细节：
         * 1. 清空内存 state
         * 2. 清空 localStorage + IndexedDB
         * 3. 广播 clear 消息到其他标签页
         */
        clearAllProgress: async () => {
          set({ progress: {}, lastReadAt: {}, recentDocs: [] });

          try {
            await clearAllProgressDB();
          } catch (err) {
            console.error('[progress-store] clearAllProgressDB failed:', err);
          }

          // 广播清空消息
          try {
            const channel = getBroadcastChannel();
            channel.post({
              type: 'clear',
              payload: { type: 'clear', ts: Date.now() },
            });
          } catch (err) {
            console.error('[progress-store] broadcast clear failed:', err);
          }
        },

        /**
         * 启动时从 IndexedDB 同步数据
         *
         * 实现说明：
         * - 调用 loadAllProgress 合并 localStorage 与 IndexedDB
         * - 合并结果写回内存 state
         * - 同时初始化 BroadcastChannel 订阅（监听其他标签页更新）
         * - SSR 环境直接返回
         */
        initialize: async () => {
          if (typeof window === 'undefined') return;
          if (get().initialized) return;

          try {
            const merged = await loadAllProgress();

            // 转换为 state 格式
            const progress: Record<string, ProgressStatus> = {};
            const lastReadAt: Record<string, number> = {};
            const recentDocs: string[] = [];

            for (const [docId, item] of Object.entries(merged)) {
              progress[docId] = item.status;
              lastReadAt[docId] = item.lastReadAt;
              recentDocs.push(docId);
            }

            // 按 lastReadAt 降序排序，作为 recentDocs
            recentDocs.sort((a, b) => (lastReadAt[b] ?? 0) - (lastReadAt[a] ?? 0));
            recentDocs.slice(0, MAX_RECENT_DOCS);

            set({ progress, lastReadAt, recentDocs, initialized: true });

            // 初始化 BroadcastChannel 订阅
            const channel = getBroadcastChannel();
            channel.subscribe((message) => {
              const payload = message.payload;
              if (payload.type === 'update' && payload.docId && payload.status) {
                get()._applyRemoteUpdate(payload.docId, payload.status, payload.ts);
              } else if (payload.type === 'clear') {
                set({ progress: {}, lastReadAt: {}, recentDocs: [] });
              }
            });
          } catch (err) {
            console.error('[progress-store] initialize failed:', err);
            set({ initialized: true });
          }
        },

        /**
         * 内部方法：从其他标签页接收更新
         *
         * 实现说明：
         * - 仅更新内存 state，不再次广播（避免循环）
         * - 不触发 IndexedDB 写入（来源标签页已写入）
         *
         * @param docId - 文档 ID
         * @param status - 阅读状态
         * @param ts - 时间戳
         */
        _applyRemoteUpdate: (docId, status, ts) => {
          set((state) => {
            const filteredRecent = state.recentDocs.filter((id) => id !== docId);
            const newRecent = [docId, ...filteredRecent].slice(0, MAX_RECENT_DOCS);
            return {
              progress: { ...state.progress, [docId]: status },
              lastReadAt: { ...state.lastReadAt, [docId]: ts },
              recentDocs: newRecent,
            };
          });
        },
      }),
      {
        name: STORAGE_KEY,
        storage: createJSONStorage(() => localStorage),
        // 仅持久化数据字段，方法不持久化
        partialize: (state) => ({
          progress: state.progress,
          lastReadAt: state.lastReadAt,
          recentDocs: state.recentDocs,
        }),
      },
    ),
  ),
);

export default useProgressStore;
