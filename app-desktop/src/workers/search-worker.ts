/**
 * Search Worker（Phase 9）
 *
 * 功能概述：
 * - 在 Web Worker 中运行 Fuse.js 实时模糊搜索，避免阻塞主线程
 * - 支持 init（构建索引）与 search（执行查询）两类消息
 * - 索引构建异步进行，期间收到的查询请求入队，构建完成后批量执行
 * - 防抖合并：短时间内多个相同 query 仅执行最后一个
 * - content 字段超 50KB 自动截断，避免索引体积过大
 * - 严格不执行任何用户代码，仅运行 Fuse.js 查询逻辑
 *
 * 消息协议：
 * - 输入（SearchWorkerMessage）：init / search
 * - 输出（SearchWorkerResponse）：ready / results / error
 *
 * Fuse 配置说明：
 * - keys weights：title 0.5, description 0.3, tags 0.15, content 0.05
 *   （标题权重最高，正文权重最低，确保标题匹配排在前面）
 * - threshold 0.4：模糊匹配阈值，0=完全匹配，1=任意匹配
 * - includeScore：返回相关性分数（0=完美匹配，1=完全不匹配）
 * - minMatchCharLength 2：最小匹配字符数（避免单字符噪声）
 * - ignoreLocation：忽略位置加权（长文档中匹配位置不影响分数）
 *
 * 使用示例（主线程）：
 *   const worker = new Worker(new URL('./search-worker.ts', import.meta.url), { type: 'module' });
 *   worker.postMessage({ type: 'init', docs: [...] });
 *   worker.addEventListener('message', (e) => {
 *     if (e.data.type === 'ready') {
 *       worker.postMessage({ type: 'search', query: 'react', requestId: '1' });
 *     }
 *   });
 */

import Fuse, { type IFuseOptions } from 'fuse.js';
import type { SearchDoc, SearchResult, SearchWorkerMessage, SearchWorkerResponse } from './types';

/** content 字段最大长度（超过则截断，避免索引体积过大） */
const MAX_CONTENT_LENGTH = 50 * 1024; // 50KB

/** 默认返回结果数量上限 */
const DEFAULT_LIMIT = 20;

/** 防抖等待时间（毫秒）：短时间内多个相同 query 仅执行最后一个 */
const DEBOUNCE_MS = 16;

/** Fuse.js 索引键配置（含权重） */
const FUSE_KEYS: Array<{ name: keyof SearchDoc; weight: number }> = [
  { name: 'title', weight: 0.5 },
  { name: 'description', weight: 0.3 },
  { name: 'tags', weight: 0.15 },
  { name: 'content', weight: 0.05 },
];

/** Fuse.js 实例配置 */
const FUSE_OPTIONS: IFuseOptions<SearchDoc> = {
  keys: FUSE_KEYS,
  threshold: 0.4,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
  isCaseSensitive: false,
  ignoreFieldNorm: true,
};

/** 待处理的搜索请求（入队等待索引构建完成） */
interface PendingSearch {
  query: string;
  requestId: string;
  limit: number;
}

/** 当前 Fuse 索引实例（null 表示未构建/构建中） */
let fuseIndex: Fuse<SearchDoc> | null = null;

/** 索引是否正在构建中（构建期间新请求入队等待） */
let isIndexing = false;

/** 待处理的搜索请求队列（索引构建期间累积） */
const pendingQueue: PendingSearch[] = [];

/** 防抖定时器句柄（短时间多个相同 query 仅执行最后一个） */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 防抖累积的最后一个请求（仅这个会被执行） */
let debouncedRequest: PendingSearch | null = null;

/**
 * 截断超长 content 字段
 *
 * 输入：原始 content 字符串
 * 输出：截断到 MAX_CONTENT_LENGTH 长度的字符串
 *
 * @param content - 原始 content
 * @returns 截断后的 content
 */
function truncateContent(content: string | undefined): string | undefined {
  if (content === undefined) return undefined;
  if (content.length <= MAX_CONTENT_LENGTH) return content;
  /* 截断并追加省略标记，便于搜索结果识别 */
  return `${content.slice(0, MAX_CONTENT_LENGTH)}…[truncated]`;
}

/**
 * 规范化 SearchDoc（截断 content、补全默认字段）
 *
 * 输入：原始 SearchDoc
 * 输出：规范化后的 SearchDoc
 *
 * @param doc - 原始文档
 * @returns 规范化后的文档
 */
function normalizeDoc(doc: SearchDoc): SearchDoc {
  return {
    ...doc,
    content: truncateContent(doc.content),
    type: doc.type ?? 'doc',
  };
}

/**
 * 将 Fuse 搜索结果转换为 SearchResult
 *
 * 输入：Fuse.FuseResult<SearchDoc>
 * 输出：SearchResult（与 search-store 兼容）
 *
 * 转换规则：
 * - id = doc.slug
 * - score = 1 - fuseResult.score（Fuse 分数越低越相关，转换为越高越相关）
 * - 保留 title/description/module/slug/url/type
 *
 * @param fuseResult - Fuse 搜索结果项
 * @returns 转换后的 SearchResult
 */
function toSearchResult(fuseResult: { item: SearchDoc; score?: number }): SearchResult {
  const { item, score } = fuseResult;
  /* Fuse score: 0=完美匹配，1=完全不匹配；转换为 0-1 之间，越高越相关 */
  const normalizedScore = score !== undefined ? Math.max(0, 1 - score) : undefined;

  return {
    id: item.slug,
    title: item.title,
    description: item.description,
    module: item.module,
    slug: item.slug,
    url: item.url,
    type: item.type ?? 'doc',
    score: normalizedScore,
  };
}

/**
 * 异步构建 Fuse 索引
 *
 * 输入：SearchDoc[] 文档列表
 * 输出：Promise<Fuse<SearchDoc>>
 *
 * 流程：
 * 1. 规范化文档（截断 content、补全默认字段）
 * 2. 创建 Fuse 实例（使用宏任务分块避免阻塞 Worker 消息循环）
 * 3. 标记 isIndexing=false，触发队列消费
 *
 * @param docs - 文档列表
 * @returns Fuse 索引实例
 */
async function buildIndex(docs: SearchDoc[]): Promise<Fuse<SearchDoc>> {
  /* 规范化所有文档 */
  const normalizedDocs = docs.map(normalizeDoc);

  /* 使用 requestAnimationFrame 不可用（Worker 中），改用 setTimeout 0 让出消息循环
   * 大数据量时 Fuse 构建可能耗时几十毫秒，分块构建避免阻塞 init 后的 search 消息 */
  await new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0);
  });

  return new Fuse(normalizedDocs, FUSE_OPTIONS);
}

/**
 * 执行单次搜索查询
 *
 * 输入：query 关键词、requestId、limit
 * 输出：发送 results 消息给主线程
 *
 * @param query - 搜索关键词
 * @param requestId - 请求 ID（用于关联响应）
 * @param limit - 结果数量上限
 */
function performSearch(query: string, requestId: string, limit: number): void {
  /* 索引未就绪：理论上不会进入此分支（应在队列中等待），但仍兜底处理 */
  if (!fuseIndex) {
    const response: SearchWorkerResponse = {
      type: 'error',
      error: '索引尚未构建完成',
      requestId,
    };
    self.postMessage(response);
    return;
  }

  try {
    /* 空查询返回空结果（不调用 Fuse） */
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      const response: SearchWorkerResponse = {
        type: 'results',
        results: [],
        query,
        requestId,
        count: 0,
      };
      self.postMessage(response);
      return;
    }

    /* Fuse 查询：返回 { item, score } 数组 */
    const fuseResults = fuseIndex.search(trimmedQuery, { limit });
    const results = fuseResults.map(toSearchResult);

    const response: SearchWorkerResponse = {
      type: 'results',
      results,
      query,
      requestId,
      count: results.length,
    };
    self.postMessage(response);
  } catch (error) {
    const response: SearchWorkerResponse = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      requestId,
    };
    self.postMessage(response);
  }
}

/**
 * 消费待处理队列（索引构建完成后调用）
 *
 * 流程：
 * 1. 取出队列中所有请求
 * 2. 仅执行最后一个请求（防抖合并语义）
 * 3. 其余请求发送空 results（已过期）
 */
function drainPendingQueue(): void {
  if (pendingQueue.length === 0) return;

  /* 取出最后一个请求执行（之前的全部视为过期） */
  const lastRequest = pendingQueue[pendingQueue.length - 1];
  const expiredRequests = pendingQueue.slice(0, -1);

  pendingQueue.length = 0;

  /* 过期请求返回空结果（requestId 仍需关联响应，否则主线程会一直 pending） */
  for (const req of expiredRequests) {
    const response: SearchWorkerResponse = {
      type: 'results',
      results: [],
      query: req.query,
      requestId: req.requestId,
      count: 0,
    };
    self.postMessage(response);
  }

  if (lastRequest) {
    performSearch(lastRequest.query, lastRequest.requestId, lastRequest.limit);
  }
}

/**
 * 处理 init 消息：构建索引
 *
 * 输入：SearchDoc[] 文档列表
 * 流程：
 * 1. 标记 isIndexing=true
 * 2. 异步构建 Fuse 索引
 * 3. 构建完成后发送 ready 消息
 * 4. 消费队列中等待的请求
 *
 * @param docs - 文档列表
 */
async function handleInit(docs: SearchDoc[]): Promise<void> {
  isIndexing = true;
  fuseIndex = null;

  try {
    fuseIndex = await buildIndex(docs);
    isIndexing = false;

    /* 通知主线程索引就绪 */
    const readyResponse: SearchWorkerResponse = { type: 'ready' };
    self.postMessage(readyResponse);

    /* 消费索引构建期间累积的请求 */
    drainPendingQueue();
  } catch (error) {
    isIndexing = false;
    const response: SearchWorkerResponse = {
      type: 'error',
      error: `索引构建失败：${error instanceof Error ? error.message : String(error)}`,
      requestId: '',
    };
    self.postMessage(response);
  }
}

/**
 * 处理 search 消息：执行查询（带防抖）
 *
 * 输入：query、requestId、limit?
 * 流程：
 * 1. 索引未就绪：入队等待
 * 2. 索引就绪：设置防抖定时器，短时间多个 query 仅执行最后一个
 *
 * @param query - 搜索关键词
 * @param requestId - 请求 ID
 * @param limit - 结果数量上限
 */
function handleSearch(query: string, requestId: string, limit?: number): void {
  const resolvedLimit = limit ?? DEFAULT_LIMIT;

  /* 索引未就绪：入队等待 */
  if (isIndexing || !fuseIndex) {
    pendingQueue.push({ query, requestId, limit: resolvedLimit });
    return;
  }

  /* 索引就绪：设置防抖定时器
   * 短时间（DEBOUNCE_MS）内多个请求仅执行最后一个，避免快速输入时重复查询 */
  debouncedRequest = { query, requestId, limit: resolvedLimit };

  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    const request = debouncedRequest;
    debouncedRequest = null;
    if (request) {
      performSearch(request.query, request.requestId, request.limit);
    }
  }, DEBOUNCE_MS);
}

/**
 * Worker 消息入口
 *
 * 监听主线程 postMessage，根据消息类型分发到对应处理函数。
 * 使用 discriminated union 实现类型安全的消息分发。
 */
self.addEventListener('message', (event: MessageEvent<SearchWorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init':
      /* init 消息异步处理，不阻塞消息循环 */
      void handleInit(message.docs);
      break;
    case 'search':
      handleSearch(message.query, message.requestId, message.limit);
      break;
    /* 默认分支：理论上不会进入，仅用于类型安全兜底 */
    default: {
      const exhaustive: never = message;
      void exhaustive;
    }
  }
});
