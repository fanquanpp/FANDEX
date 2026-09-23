// AI 接入通道类型定义。
// 定位：FANDEX 只提供"通道"，不提供 AI 服务本身；密钥与用量均由用户自行管理。

export type AiProviderId = 'orca';

// 密钥存放模式：session = 仅当前页面会话内存（默认，刷新即失效）；
// device = 用户明确勾选后写入本机 localStorage（绝不离开设备）。
export type AiKeyStorageMode = 'session' | 'device';

// 持久化到本机的设置（不含任何密钥明文）
export interface AiProviderSettings {
  provider: AiProviderId;
  // "用户已启用该 Provider"的状态标记；不启用则全站不产生任何 AI 请求
  enabled: boolean;
  model: string;
  keyStorage: AiKeyStorageMode;
  updatedAt: string;
}

export type AiErrorKind =
  | 'inactive' // 通道总闸未开启（架构预留阶段）
  | 'no-key' // 未配置密钥
  | 'network' // 网络失败 / 超时 / 被 CSP 拦截
  | 'auth' // 401 / 403：密钥无效
  | 'credits' // 402：余额不足
  | 'rate-limit' // 429：限流（含免费模型窗口）
  | 'prompt-cap' // 400 err_free_prompt_cap：免费档单次提示词超限
  | 'free-access' // 429 err_free_access_denied：免费档资格不足
  | 'byok-unavailable' // 503 byok:key_unavailable：BYOK 密钥不可用且未回退
  | 'server' // 5xx
  | 'unknown';

export interface AiClientError extends Error {
  kind: AiErrorKind;
  status?: number;
  retryAfterSeconds?: number;
}

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatRequest {
  // 用户自有密钥（仅用于本次请求的 Authorization 头，不落日志）
  key: string;
  model: string;
  messages: AiChatMessage[];
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface AiChatResult {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number | undefined;
    completionTokens?: number | undefined;
  };
}

export interface AiConnectionCheck {
  ok: boolean;
  modelCount?: number;
  sampleModels?: string[];
  error?: AiClientError;
}
