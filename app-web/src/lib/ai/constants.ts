import type { AiProviderId, AiProviderSettings } from './types';

// 通道总闸（"接入的最后一步"）：false = 仅预留架构与设置入口，
// 对话类请求在代码层被硬性拒绝；激活 AI 功能时再改为 true。
export const AI_CHANNEL_ACTIVE = false;

// 本机存储键：遵循全站 fandex-<域> 命名约定。设置与密钥分键存放，
// 便于"只清密钥"与"清全部 AI 数据"两类操作。
export const AI_STORAGE_KEYS = {
  settings: 'fandex-ai-settings',
  apiKey: 'fandex-ai-key',
} as const;

export const AI_STORAGE_PREFIX = 'fandex-ai-';

export const AI_DEFAULT_MODEL = 'orcarouter/free';

// OrcaRouter 密钥前缀（docs.orcarouter.ai/getting-started/get-api-key）
export const AI_KEY_PREFIX = 'sk-orca-';

export interface AiProviderInfo {
  id: AiProviderId;
  name: string;
  apiBaseUrl: string;
  siteUrl: string;
  docsUrl: string;
  consoleKeysUrl: string;
  consoleByokUrl: string;
  dataHandlingUrl: string;
}

// 服务商注册表：新增 Provider 只需在此追加条目，界面与通道逻辑复用。
// 链接以 OrcaRouter 官方控制台为准（用户自行前往配置，FANDEX 不经手）。
export const AI_PROVIDERS: Record<AiProviderId, AiProviderInfo> = {
  orca: {
    id: 'orca',
    name: 'OrcaRouter',
    apiBaseUrl: 'https://api.orcarouter.ai/v1',
    siteUrl: 'https://www.orcarouter.ai/',
    docsUrl: 'https://docs.orcarouter.ai/introduction',
    consoleKeysUrl: 'https://www.orcarouter.ai/console/keys',
    consoleByokUrl: 'https://www.orcarouter.ai/console/byok',
    dataHandlingUrl: 'https://docs.orcarouter.ai/operations/data-handling',
  },
};

export const AI_DEFAULT_SETTINGS: AiProviderSettings = {
  provider: 'orca',
  enabled: false,
  model: AI_DEFAULT_MODEL,
  keyStorage: 'session',
  updatedAt: '',
};
