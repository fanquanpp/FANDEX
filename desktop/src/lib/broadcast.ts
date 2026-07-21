/**
 * BroadcastChannel 跨标签页通信封装
 *
 * 功能概述：
 * - 封装 BroadcastChannel API，提供类型安全的跨标签页消息通信
 * - 自动为每个 channel 实例生成唯一 source 标识，避免自循环
 * - 浏览器不支持时优雅降级为 storage event 机制
 * - 提供 post / subscribe / close 三元接口，符合发布订阅模式
 *
 * 设计要点：
 * - 类型参数 T 表示消息 payload 类型，编译期类型检查
 * - source 字段用于过滤自己发出的消息（避免循环）
 * - ts 字段用于消息时序调试与冲突解决
 * - close() 显式释放资源，避免内存泄漏
 *
 * 使用示例：
 *   const channel = createBroadcastChannel<{ docId: string; status: string }>('fandex-progress');
 *   const unsubscribe = channel.subscribe((msg) => console.log(msg));
 *   channel.post({ type: 'update', payload: { docId: 'x', status: 'read' } });
 *   unsubscribe();
 *   channel.close();
 */

/** 广播消息封装结构 */
export interface BroadcastMessage<T> {
  /** 消息类型（用于订阅端过滤） */
  type: string;
  /** 消息载荷 */
  payload: T;
  /** 消息来源标识（实例唯一 uuid） */
  source: string;
  /** 消息发送时间戳（ms） */
  ts: number;
}

/**
 * 生成简易 UUID（用于 source 标识）
 *
 * 实现说明：
 * - 优先使用 crypto.randomUUID()（现代浏览器）
 * - 降级为时间戳 + 随机数拼接
 *
 * @returns 唯一标识字符串
 */
function generateSourceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** BroadcastChannel 控制器接口 */
export interface BroadcastChannelController<T> {
  /** 发送消息（自动填充 source 与 ts） */
  post: (message: Omit<BroadcastMessage<T>, 'source' | 'ts'>) => void;
  /** 订阅消息（返回取消订阅函数） */
  subscribe: (handler: (message: BroadcastMessage<T>) => void) => () => void;
  /** 关闭 channel 并释放资源 */
  close: () => void;
}

/**
 * 创建 BroadcastChannel 控制器
 *
 * 实现细节：
 * 1. 检测 BroadcastChannel API 支持
 * 2. 不支持时降级为 localStorage + storage event
 * 3. 内部维护订阅者 Set，消息分发时过滤 source 自循环
 * 4. SSR 环境返回 noop 控制器
 *
 * @param name - channel 名称（相同 name 的标签页可互相通信）
 * @returns BroadcastChannel 控制器
 */
export function createBroadcastChannel<T>(name: string): BroadcastChannelController<T> {
  // SSR 环境返回 noop 控制器
  if (typeof window === 'undefined') {
    return {
      post: () => {},
      subscribe: () => () => {},
      close: () => {},
    };
  }

  const sourceId = generateSourceId();
  const subscribers = new Set<(message: BroadcastMessage<T>) => void>();

  // 用于降级方案的 localStorage key
  const storageKey = `__fandex_broadcast_${name}`;

  // 优先尝试 BroadcastChannel
  let channel: BroadcastChannel | null = null;
  let useStorageFallback = false;

  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(name);
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data as BroadcastMessage<T> | undefined;
        if (!data || data.source === sourceId) return;
        for (const handler of subscribers) {
          try {
            handler(data);
          } catch (err) {
            // 单个处理器异常不影响其他订阅者
            console.error('[broadcast] subscriber handler error:', err);
          }
        }
      };
    } else {
      useStorageFallback = true;
    }
  } catch (err) {
    // BroadcastChannel 构造异常时降级
    console.warn('[broadcast] BroadcastChannel init failed, fallback to storage event:', err);
    channel = null;
    useStorageFallback = true;
  }

  // 降级方案：storage event 监听
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key !== storageKey || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue) as BroadcastMessage<T>;
      if (data.source === sourceId) return;
      for (const handler of subscribers) {
        try {
          handler(data);
        } catch (err) {
          console.error('[broadcast] subscriber handler error (storage fallback):', err);
        }
      }
    } catch (err) {
      console.error('[broadcast] parse storage event payload failed:', err);
    }
  };

  if (useStorageFallback) {
    window.addEventListener('storage', handleStorageEvent);
  }

  return {
    /**
     * 发送消息
     *
     * @param message - 消息内容（不含 source 与 ts）
     */
    post: (message) => {
      const fullMessage: BroadcastMessage<T> = {
        ...message,
        source: sourceId,
        ts: Date.now(),
      };

      // 优先使用 BroadcastChannel
      if (channel) {
        try {
          channel.postMessage(fullMessage);
        } catch (err) {
          console.error('[broadcast] postMessage failed:', err);
        }
        return;
      }

      // 降级方案：写入 localStorage 触发 storage event
      if (useStorageFallback) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(fullMessage));
        } catch (err) {
          console.error('[broadcast] localStorage setItem failed:', err);
        }
      }
    },

    /**
     * 订阅消息
     *
     * @param handler - 消息处理函数
     * @returns 取消订阅函数
     */
    subscribe: (handler) => {
      subscribers.add(handler);
      return () => {
        subscribers.delete(handler);
      };
    },

    /**
     * 关闭 channel 并释放资源
     */
    close: () => {
      subscribers.clear();
      if (channel) {
        try {
          channel.close();
        } catch {
          // 关闭异常静默忽略
        }
        channel = null;
      }
      if (useStorageFallback) {
        window.removeEventListener('storage', handleStorageEvent);
      }
    },
  };
}

export default createBroadcastChannel;
