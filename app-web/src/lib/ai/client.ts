import { AI_CHANNEL_ACTIVE, AI_PROVIDERS } from './constants';
import type {
  AiChatMessage,
  AiChatRequest,
  AiChatResult,
  AiClientError,
  AiConnectionCheck,
} from './types';

// OrcaRouter 请求客户端（OpenAI 兼容，docs.orcarouter.ai）。
// 约束：
// - 不引入任何 SDK，纯 fetch，保证静态站体积与 Lighthouse 门禁；
// - 密钥只出现在 Authorization 请求头，直连 api.orcarouter.ai，不经任何中间方；
// - 全模块不打印日志：密钥、提示词与输出内容一律不落 console；
// - verifyOrcaConnection 是预留阶段唯一可达的网络路径（用户在设置页手动触发），
//   对话类请求受 AI_CHANNEL_ACTIVE 总闸控制，false 时在代码层直接拒绝。

const DEFAULT_TIMEOUT_MS = 20_000;
const SAMPLE_MODEL_COUNT = 5;

function aiError(kind: AiClientError['kind'], message: string, extra: Partial<AiClientError> = {}): AiClientError {
  const error = new Error(message) as AiClientError;
  error.kind = kind;
  return Object.assign(error, extra);
}

function rejectInactive(): AiClientError {
  return aiError(
    'inactive',
    'AI 通道尚未启用（架构预留阶段）：FANDEX 本版本不提供任何 AI 功能。',
  );
}

// 合并外部 signal 与超时控制；返回原始响应或抛出归一化错误。
async function orcaFetch(
  path: string,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener('abort', onExternalAbort, { once: true });
  try {
    return await fetch(path, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw aiError('network', '请求超时或已被中止。');
    }
    // TypeError：网络失败或被 CSP connect-src 拦截
    throw aiError('network', '网络请求失败（检查网络连接或浏览器策略）。');
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

interface OrcaErrorBody {
  error?: {
    message?: unknown;
    code?: unknown;
    metadata?: { reason?: unknown; retry_after_seconds?: unknown };
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

// 按 OrcaRouter 错误码归一化（含免费档 err_free_* 与 BYOK 503 分支）。
function mapErrorResponse(response: Response, body: unknown): AiClientError {
  const parsed = typeof body === 'object' && body !== null ? (body as OrcaErrorBody) : {};
  const errInfo = parsed.error ?? {};
  const code = readString(errInfo.code);
  const reason = readString(errInfo.metadata?.reason);
  const message = readString(errInfo.message) ?? `HTTP ${response.status}`;
  const retryAfterHeader = Number(response.headers.get('Retry-After') ?? '');
  const retryAfterSeconds =
    typeof errInfo.metadata?.retry_after_seconds === 'number'
      ? errInfo.metadata.retry_after_seconds
      : Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
        ? retryAfterHeader
        : undefined;

  if (response.status === 401 || response.status === 403) {
    return aiError('auth', `密钥无效或无权限（${message}）`, { status: response.status });
  }
  if (response.status === 402) {
    return aiError('credits', `账户余额不足（${message}）`, { status: response.status });
  }
  if (response.status === 400 && code === 'err_free_prompt_cap') {
    return aiError('prompt-cap', '免费档单次提示词超限，请缩短输入或改用付费模型。', {
      status: response.status,
    });
  }
  if (response.status === 429) {
    if (code === 'err_free_access_denied' || reason === 'err_free_access_denied') {
      return aiError('free-access', '免费档资格不足（需绑定 GitHub 账号或账户有充值记录）。', {
        status: response.status,
      });
    }
    if (typeof retryAfterSeconds === 'number') {
      return aiError('rate-limit', `请求过于频繁，请在 ${retryAfterSeconds} 秒后重试。`, {
        status: response.status,
        retryAfterSeconds,
      });
    }
    return aiError('rate-limit', `请求过于频繁或免费档容量已满（${message}）。`, {
      status: response.status,
    });
  }
  if (response.status === 503 && (code === 'byok:key_unavailable' || message.includes('byok'))) {
    return aiError('byok-unavailable', 'BYOK 密钥不可用且已设置为不回退（503）。', {
      status: response.status,
    });
  }
  if (response.status >= 500) {
    return aiError('server', `服务商端错误（${message}）`, { status: response.status });
  }
  return aiError('unknown', message, { status: response.status });
}

async function readErrorBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export interface OrcaModelsResult {
  modelCount: number;
  sampleModels: string[];
}

interface OrcaModelsBody {
  data?: unknown;
}

// GET /v1/models：校验密钥有效性与连通性。
async function listOrcaModels(key: string, signal?: AbortSignal, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<OrcaModelsResult> {
  const response = await orcaFetch(
    `${AI_PROVIDERS.orca.apiBaseUrl}/models`,
    { headers: { Authorization: `Bearer ${key}` } },
    timeoutMs,
    signal,
  );
  if (!response.ok) {
    throw mapErrorResponse(response, await readErrorBody(response));
  }
  const body = (await response.json()) as OrcaModelsBody;
  const ids = Array.isArray(body.data)
    ? body.data
        .map((entry) => (typeof entry === 'object' && entry !== null ? readString((entry as { id?: unknown }).id) : undefined))
        .filter((id): id is string => typeof id === 'string')
    : [];
  return {
    modelCount: ids.length,
    sampleModels: ids.slice(0, SAMPLE_MODEL_COUNT),
  };
}

// 设置页"测试连接"：用户手动触发，验证密钥与网络通路。
export async function verifyOrcaConnection(options: {
  key: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<AiConnectionCheck> {
  try {
    const result = await listOrcaModels(options.key, options.signal, options.timeoutMs);
    return { ok: true, modelCount: result.modelCount, sampleModels: result.sampleModels };
  } catch (error) {
    return { ok: false, error: error as AiClientError };
  }
}

// 对话补全：受 AI_CHANNEL_ACTIVE 总闸控制（预留阶段恒为关闭）。
export async function requestChatCompletion(request: AiChatRequest): Promise<AiChatResult> {
  if (!AI_CHANNEL_ACTIVE) {
    throw rejectInactive();
  }
  const { key, model, messages, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = request;
  if (!key || key.trim().length === 0) {
    throw aiError('no-key', '未配置 API 密钥。');
  }
  if (messages.length === 0) {
    throw aiError('unknown', '消息列表不能为空。');
  }
  const payload: { model: string; messages: AiChatMessage[] } = { model, messages };
  const response = await orcaFetch(
    `${AI_PROVIDERS.orca.apiBaseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    timeoutMs,
    signal,
  );
  if (!response.ok) {
    throw mapErrorResponse(response, await readErrorBody(response));
  }
  const body = (await response.json()) as {
    model?: unknown;
    choices?: { message?: { content?: unknown } }[];
    usage?: { prompt_tokens?: unknown; completion_tokens?: unknown };
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw aiError('unknown', '响应格式异常：缺少 choices[0].message.content。');
  }
  return {
    content,
    model: readString(body.model) ?? model,
    usage: {
      promptTokens: typeof body.usage?.prompt_tokens === 'number' ? body.usage.prompt_tokens : undefined,
      completionTokens:
        typeof body.usage?.completion_tokens === 'number' ? body.usage.completion_tokens : undefined,
    },
  };
}
