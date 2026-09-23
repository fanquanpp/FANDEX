// AI 接入通道统一出口。
// 当前消费者：仅 AI 设置页（src/pages/ai.astro）。
// 预留阶段（AI_CHANNEL_ACTIVE = false）：通道可配置、可测试连通性，
// 但对话请求在 client 层被硬性拒绝——即"不执行接入的最后一步"。

export type {
  AiChatMessage,
  AiChatRequest,
  AiChatResult,
  AiClientError,
  AiConnectionCheck,
  AiErrorKind,
  AiKeyStorageMode,
  AiProviderId,
  AiProviderSettings,
} from './types';

export {
  AI_CHANNEL_ACTIVE,
  AI_DEFAULT_MODEL,
  AI_DEFAULT_SETTINGS,
  AI_KEY_PREFIX,
  AI_PROVIDERS,
  AI_STORAGE_KEYS,
  AI_STORAGE_PREFIX,
} from './constants';
export type { AiProviderInfo } from './constants';

export {
  clearApiKey,
  getApiKey,
  loadAiSettings,
  maskApiKey,
  resetAllAiData,
  saveAiSettings,
  setApiKey,
} from './settings';

export { requestChatCompletion, verifyOrcaConnection } from './client';
