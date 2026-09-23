import { getItem, removeItem, setItem, getJSON, setJSON, clearByPrefix } from '@/lib/storage';
import {
  AI_DEFAULT_SETTINGS,
  AI_KEY_PREFIX,
  AI_PROVIDERS,
  AI_STORAGE_KEYS,
  AI_STORAGE_PREFIX,
} from './constants';
import type { AiKeyStorageMode, AiProviderId, AiProviderSettings } from './types';

// 设置与密钥的隔离存储层：
// - 设置（Provider 选择 / 状态标记 / 模型）写入 localStorage，绝不含密钥明文；
// - 密钥默认仅保存在当前页面会话内存（module 变量，刷新即失效）；
//   只有用户明确勾选"在本设备记住"才写入本机 localStorage。
// FANDEX 无服务器：密钥永远不会被发送到 OrcaRouter 以外的任何地方，
// 也不写入日志（全站无统计埋点）。

let sessionApiKey: string | null = null;

function isProviderId(value: unknown): value is AiProviderId {
  return typeof value === 'string' && value in AI_PROVIDERS;
}

function isKeyStorageMode(value: unknown): value is AiKeyStorageMode {
  return value === 'session' || value === 'device';
}

export function loadAiSettings(): AiProviderSettings {
  const stored = getJSON<Partial<AiProviderSettings>>(AI_STORAGE_KEYS.settings);
  if (!stored) return { ...AI_DEFAULT_SETTINGS };
  return {
    provider: isProviderId(stored.provider) ? stored.provider : AI_DEFAULT_SETTINGS.provider,
    enabled: typeof stored.enabled === 'boolean' ? stored.enabled : AI_DEFAULT_SETTINGS.enabled,
    model:
      typeof stored.model === 'string' && stored.model.trim().length > 0
        ? stored.model.trim()
        : AI_DEFAULT_SETTINGS.model,
    keyStorage: isKeyStorageMode(stored.keyStorage)
      ? stored.keyStorage
      : AI_DEFAULT_SETTINGS.keyStorage,
    updatedAt: typeof stored.updatedAt === 'string' ? stored.updatedAt : '',
  };
}

export function saveAiSettings(patch: Partial<AiProviderSettings>): AiProviderSettings {
  const next: AiProviderSettings = {
    ...loadAiSettings(),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  setJSON(AI_STORAGE_KEYS.settings, next);
  return next;
}

// 保存密钥：始终更新会话内存；mode 为 device 时才落盘本机。
export function setApiKey(key: string, mode: AiKeyStorageMode): void {
  const trimmed = key.trim();
  sessionApiKey = trimmed.length > 0 ? trimmed : null;
  if (mode === 'device' && sessionApiKey) {
    setItem(AI_STORAGE_KEYS.apiKey, sessionApiKey);
  } else {
    removeItem(AI_STORAGE_KEYS.apiKey);
  }
}

// 读取密钥：优先会话内存，其次（用户勾选过"记住"时）读本机存储。
export function getApiKey(): string | null {
  if (sessionApiKey) return sessionApiKey;
  if (loadAiSettings().keyStorage === 'device') {
    return getItem(AI_STORAGE_KEYS.apiKey);
  }
  return null;
}

export function clearApiKey(): void {
  sessionApiKey = null;
  removeItem(AI_STORAGE_KEYS.apiKey);
}

// 清除本机全部 AI 数据（设置 + 密钥 + 会话内存）。
export function resetAllAiData(): void {
  clearApiKey();
  clearByPrefix(AI_STORAGE_PREFIX);
}

// 掩码展示：只露前缀与末 4 位，绝不明文回显。
export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length === 0) return '';
  const head = trimmed.startsWith(AI_KEY_PREFIX) ? AI_KEY_PREFIX : '';
  const tail = trimmed.slice(-4);
  return `${head}****${tail}`;
}
