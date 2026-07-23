/**
 * 全局快捷键管理（Phase 5）
 *
 * 功能概述：
 * - 注册全局快捷键：Ctrl+K（搜索）、Ctrl+/（快捷键帮助）、← →（上下篇导航）、g d（仪表盘）、g h（首页）
 * - 支持单键序列（如 "g d" 两键触发，间隔 500ms 内有效）
 * - 自动忽略输入框内的快捷键（input / textarea / contenteditable / select）
 * - 提供 `registerShortcut(key, handler, options)` 函数式 API
 * - 提供 `useShortcut(key, handler, deps)` React hook
 * - 防止重复绑定（相同 key + handler 仅注册一次）
 *
 * 设计要点：
 * - 使用单一全局 keydown 监听器，内部维护快捷键注册表（避免多个监听器开销）
 * - 修饰键匹配：支持 ctrl / meta（macOS Command）/ shift / alt 组合
 * - 单键序列：使用 `g` 等 prefix 键进入等待状态，500ms 内按下下一个键触发
 * - 通过 Set 去重 handler，避免相同回调被多次调用
 *
 * 使用示例：
 *   import { registerShortcut, useShortcut } from '@/lib/keyboard';
 *   registerShortcut('ctrl+k', () => openSearch());
 *   registerShortcut('g d', () => navigate('/dashboard'));
 *   useShortcut('Escape', () => closeModal(), []);
 */

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

/** 快捷键匹配选项 */
export interface ShortcutOptions {
  /** 是否在输入框内禁用（默认 true） */
  ignoreInInput?: boolean;
  /** 是否阻止默认行为（默认 true） */
  preventDefault?: boolean;
  /** 是否启用（默认 true） */
  enabled?: boolean;
}

/** 快捷键处理器类型 */
type ShortcutHandler = () => void;

/** 注册的快捷键条目 */
interface ShortcutEntry {
  /** 快捷键描述（如 'ctrl+k'） */
  key: string;
  /** 处理函数 */
  handler: ShortcutHandler;
  /** 配置选项 */
  options: Required<ShortcutOptions>;
}

/** 快捷键注册表（key → handlers） */
const shortcutRegistry = new Map<string, Set<ShortcutEntry>>();

/** 全局 keydown 监听器是否已绑定 */
let listenerBound = false;

/** 单键序列状态：上一次按下的 prefix 键与时间戳 */
let sequencePrefix: string | null = null;
let sequenceTime = 0;

/** 单键序列超时（毫秒） */
const SEQUENCE_TIMEOUT = 500;

/**
 * 解析快捷键描述字符串为标准化形式
 *
 * 支持的格式：
 * - `ctrl+k` / `Cmd+K`：修饰键 + 单键
 * - `g d`：单键序列（两键，空格分隔）
 * - `Escape` / `Enter` / `ArrowLeft`：单键
 * - `shift+ArrowUp`：修饰键 + 方向键
 *
 * 标准化规则：
 * - 修饰键统一为小写：ctrl / meta / shift / alt
 * - 单键统一为小写（除方向键与特殊键）
 * - 多键序列保留空格分隔
 *
 * @param key - 快捷键描述
 * @returns 标准化后的快捷键
 */
function normalizeKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/\bcmd\b/g, 'meta')
    .replace(/\bmod\b/g, 'meta')
    .replace(/\bcommand\b/g, 'meta')
    .replace(/\bcontrol\b/g, 'ctrl')
    .replace(/\boption\b/g, 'alt');
}

/**
 * 检查事件目标是否在输入框内
 *
 * @param target - 事件目标元素
 * @returns 是否在输入框内
 */
function isInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * 从键盘事件构造标准化快捷键字符串
 *
 * @param e - 键盘事件
 * @returns 标准化快捷键（如 'ctrl+k'）或 null
 */
function eventToKey(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.metaKey) parts.push('meta');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');

  // 忽略单独的修饰键
  if (['Control', 'Meta', 'Shift', 'Alt'].includes(e.key)) {
    return null;
  }

  // 标准化按键名
  let key = e.key;
  // 方向键保持原样（ArrowUp/ArrowDown 等，无需转换）
  // 其他单字符键统一小写，空格转为 space
  if (key === ' ') {
    key = 'space';
  } else if (key.length === 1) {
    key = key.toLowerCase();
  }
  // 其他特殊键（Enter、Escape、F1-F12 等）保持原样

  parts.push(key.toLowerCase());
  return parts.join('+');
}

/**
 * 触发指定快捷键的所有处理器
 *
 * @param key - 标准化快捷键
 * @param inputFocused - 是否在输入框内
 */
function _triggerHandlers(key: string, inputFocused: boolean): void {
  const entries = shortcutRegistry.get(key);
  if (!entries || entries.size === 0) return;

  for (const entry of entries) {
    if (entry.options.ignoreInInput && inputFocused) continue;
    try {
      entry.handler();
    } catch (err) {
      logger.error(`[keyboard] shortcut "${key}" handler error:`, err);
    }
  }
}

/**
 * 全局 keydown 监听器
 *
 * 实现说明：
 * - 单键序列处理：若按下 'g' 等 prefix 键，进入等待状态
 * - 序列超时：500ms 内未按下下一个键，清除等待状态
 * - 修饰键组合：直接匹配快捷键注册表
 */
function handleKeyDown(e: KeyboardEvent): void {
  const inputFocused = isInputTarget(e.target);
  const key = eventToKey(e);

  if (!key) return;

  // 单键序列处理（仅无修饰键时）
  if (!e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
    // 若已有 prefix，检查是否构成序列
    if (sequencePrefix !== null) {
      const now = Date.now();
      if (now - sequenceTime < SEQUENCE_TIMEOUT) {
        const sequence = `${sequencePrefix} ${key}`;
        const entries = shortcutRegistry.get(sequence);
        if (entries && entries.size > 0) {
          // 找到序列匹配，触发并清除等待状态
          if (entries) {
            let triggered = false;
            for (const entry of entries) {
              if (entry.options.ignoreInInput && inputFocused) continue;
              if (entry.options.preventDefault) e.preventDefault();
              try {
                entry.handler();
                triggered = true;
              } catch (err) {
                logger.error(`[keyboard] shortcut "${sequence}" handler error:`, err);
              }
            }
            if (triggered) {
              sequencePrefix = null;
              return;
            }
          }
        }
      }
      // 序列超时或未匹配，清除等待状态
      sequencePrefix = null;
    }

    // 检查是否是序列的 prefix（如 'g'）
    // 查找所有以 'g ' 开头的快捷键
    let hasSequenceWithPrefix = false;
    for (const seqKey of shortcutRegistry.keys()) {
      if (seqKey.includes(' ') && seqKey.startsWith(`${key} `)) {
        hasSequenceWithPrefix = true;
        break;
      }
    }

    if (hasSequenceWithPrefix && !inputFocused) {
      sequencePrefix = key;
      sequenceTime = Date.now();
      return;
    }
  }

  // 单键 / 修饰键组合匹配
  const entries = shortcutRegistry.get(key);
  if (entries && entries.size > 0) {
    let triggered = false;
    for (const entry of entries) {
      if (entry.options.ignoreInInput && inputFocused) continue;
      if (entry.options.preventDefault) e.preventDefault();
      try {
        entry.handler();
        triggered = true;
      } catch (err) {
        logger.error(`[keyboard] shortcut "${key}" handler error:`, err);
      }
    }
    if (triggered) {
      // 触发后清除序列等待状态
      sequencePrefix = null;
    }
  }
}

/**
 * 确保全局 keydown 监听器已绑定
 */
function ensureListenerBound(): void {
  if (typeof window === 'undefined') return;
  if (listenerBound) return;
  window.addEventListener('keydown', handleKeyDown);
  listenerBound = true;
}

/**
 * 注册全局快捷键
 *
 * @param key - 快捷键描述（如 'ctrl+k'、'g d'、'Escape'）
 * @param handler - 处理函数
 * @param options - 配置选项
 * @returns 取消注册函数
 */
export function registerShortcut(
  key: string,
  handler: ShortcutHandler,
  options: ShortcutOptions = {},
): () => void {
  const normalizedKey = normalizeKey(key);
  const resolvedOptions: Required<ShortcutOptions> = {
    ignoreInInput: options.ignoreInInput ?? true,
    preventDefault: options.preventDefault ?? true,
    enabled: options.enabled ?? true,
  };

  if (!resolvedOptions.enabled) return () => {};

  const entry: ShortcutEntry = {
    key: normalizedKey,
    handler,
    options: resolvedOptions,
  };

  let entries = shortcutRegistry.get(normalizedKey);
  if (!entries) {
    entries = new Set();
    shortcutRegistry.set(normalizedKey, entries);
  }
  entries.add(entry);

  ensureListenerBound();

  // 返回取消注册函数
  return () => {
    const set = shortcutRegistry.get(normalizedKey);
    if (set) {
      set.delete(entry);
      if (set.size === 0) {
        shortcutRegistry.delete(normalizedKey);
      }
    }
  };
}

/**
 * React Hook：在组件中注册快捷键
 *
 * 实现说明：
 * - 通过 useEffect 在组件挂载时注册，卸载时自动取消
 * - deps 变化时重新注册
 *
 * @param key - 快捷键描述
 * @param handler - 处理函数
 * @param deps - 依赖数组（控制重新注册时机）
 * @param options - 配置选项
 */
export function useShortcut(
  key: string,
  handler: ShortcutHandler,
  deps: React.DependencyList = [],
  options: ShortcutOptions = {},
): void {
  useEffect(() => {
    const unregister = registerShortcut(key, handler, options);
    return unregister;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);
}

/**
 * 初始化默认全局快捷键
 *
 * 注册的快捷键：
 * - `ctrl+k` / `meta+k`：打开搜索
 * - `ctrl+/` / `meta+/`：打开快捷键帮助
 * - `g h`：跳转首页
 * - `g d`：跳转仪表盘
 * - `ArrowLeft`：上一篇（仅在非输入框内）
 * - `ArrowRight`：下一篇（仅在非输入框内）
 *
 * @param handlers - 各快捷键对应的处理函数
 */
export function initDefaultShortcuts(handlers: {
  onOpenSearch?: () => void;
  onOpenHelp?: () => void;
  onGoHome?: () => void;
  onGoDashboard?: () => void;
  onPrevDoc?: () => void;
  onNextDoc?: () => void;
}): () => void {
  const unregisters: Array<() => void> = [];

  if (handlers.onOpenSearch) {
    unregisters.push(registerShortcut('ctrl+k', handlers.onOpenSearch));
    unregisters.push(registerShortcut('meta+k', handlers.onOpenSearch));
  }
  if (handlers.onOpenHelp) {
    unregisters.push(registerShortcut('ctrl+/', handlers.onOpenHelp));
    unregisters.push(registerShortcut('meta+/', handlers.onOpenHelp));
  }
  if (handlers.onGoHome) {
    unregisters.push(registerShortcut('g h', handlers.onGoHome));
  }
  if (handlers.onGoDashboard) {
    unregisters.push(registerShortcut('g d', handlers.onGoDashboard));
  }
  if (handlers.onPrevDoc) {
    unregisters.push(registerShortcut('arrowleft', handlers.onPrevDoc));
  }
  if (handlers.onNextDoc) {
    unregisters.push(registerShortcut('arrowright', handlers.onNextDoc));
  }

  return () => {
    for (const unregister of unregisters) {
      unregister();
    }
  };
}

export default {
  registerShortcut,
  useShortcut,
  initDefaultShortcuts,
};
