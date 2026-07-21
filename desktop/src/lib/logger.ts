/**
 * 日志工具（Phase 5）
 *
 * 功能概述：
 * - 提供统一的日志输出接口（debug / info / warn / error）
 * - 开发环境（DEV）输出 debug 与 info 日志，生产环境静默
 * - warn 与 error 在所有环境下输出（确保生产环境可捕获异常）
 * - 所有日志统一添加 `[FANDEX]` 前缀，便于浏览器控制台过滤
 *
 * 设计要点：
 * - 使用 `import.meta.env.DEV` 判断环境（Astro/Vite 注入的常量）
 * - 短路求值（`isDev && console.debug(...)`）避免不必要的函数调用开销
 * - 模块级单例，全局共享
 *
 * 使用示例：
 *   import { logger } from '@/lib/logger';
 *   logger.debug(' Initializing progress store...');
 *   logger.info('User signed in:', user);
 *   logger.warn('Deprecated API usage:', apiName);
 *   logger.error('Failed to load document:', err);
 */

/** 是否为开发环境（Astro/Vite 注入的常量，构建时静态替换） */
const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * 调试日志（仅开发环境输出）
   *
   * 适用场景：详细的内部状态、调试信息、性能分析数据
   *
   * @param args - 任意参数
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug('[FANDEX]', ...args);
    }
  },

  /**
   * 信息日志（仅开发环境输出）
   *
   * 适用场景：关键操作日志、用户行为追踪、生命周期事件
   *
   * @param args - 任意参数
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info('[FANDEX]', ...args);
    }
  },

  /**
   * 警告日志（所有环境输出）
   *
   * 适用场景：弃用 API 提示、可恢复的异常、潜在问题
   *
   * @param args - 任意参数
   */
  warn: (...args: unknown[]): void => {
    console.warn('[FANDEX]', ...args);
  },

  /**
   * 错误日志（所有环境输出）
   *
   * 适用场景：未捕获异常、关键操作失败、需要运维介入的问题
   *
   * @param args - 任意参数
   */
  error: (...args: unknown[]): void => {
    console.error('[FANDEX]', ...args);
  },
};

export default logger;
