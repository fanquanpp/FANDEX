/**
 * Web Worker 共享类型定义（Phase 9）
 *
 * 功能概述：
 * - 定义 SearchWorker 与 CodeRunnerWorker 的消息协议
 * - 使用 discriminated union 区分消息类型，便于类型安全通信
 * - 与 lib/store/search-store SearchResult 结构兼容（结构化类型兼容）
 *
 * 设计要点：
 * - 所有消息携带 type 字段作为判别联合的 discriminator
 * - 请求消息携带 requestId 用于关联请求与响应（异步匹配）
 * - 类型严格：所有字段显式类型，无 any，必要时使用 unknown + 类型守卫
 */

// ================= Search Worker Types =================

/**
 * 搜索文档输入类型
 *
 * 用于构建 Fuse.js 索引时传入的单条文档数据。
 * 与 SearchResult 的区别：SearchDoc 是输入（含完整 content），SearchResult 是输出（精简）。
 */
export interface SearchDoc {
  /** 文档 slug（唯一标识） */
  slug: string;
  /** 文档标题 */
  title: string;
  /** 文档描述/摘要 */
  description?: string;
  /** 所属模块 ID（如 javascript、react） */
  module?: string;
  /** 标签列表 */
  tags?: string[];
  /** 文档完整内容（用于深度搜索，超 50KB 会被截断） */
  content?: string;
  /** 文档完整 URL */
  url?: string;
  /** 文档类型（默认 'doc'） */
  type?: 'doc' | 'glossary' | 'cheatsheet';
}

/**
 * 搜索结果类型
 *
 * 与 lib/store/search-store SearchResult 结构兼容（结构化类型兼容）。
 * Worker 返回给主线程的搜索结果使用此类型。
 */
export interface SearchResult {
  /** 文档 ID（通常等于 slug） */
  id: string;
  /** 标题 */
  title: string;
  /** 描述/摘要 */
  description?: string;
  /** 所属模块 */
  module?: string;
  /** URL slug */
  slug?: string;
  /** 完整 URL */
  url?: string;
  /** 结果类型 */
  type: 'doc' | 'glossary' | 'cheatsheet';
  /** 相关性分数（0-1，越高越相关；由 Fuse 分数转换而来） */
  score?: number;
}

/**
 * Search Worker 输入消息（主线程 → Worker）
 *
 * - init：初始化/重建索引
 * - search：执行搜索查询
 */
export type SearchWorkerMessage =
  | { type: 'init'; docs: SearchDoc[] }
  | { type: 'search'; query: string; requestId: string; limit?: number };

/**
 * Search Worker 输出消息（Worker → 主线程）
 *
 * - ready：索引构建完成，可接受搜索请求
 * - results：搜索结果
 * - error：执行错误
 */
export type SearchWorkerResponse =
  | { type: 'ready' }
  | {
      type: 'results';
      results: SearchResult[];
      query: string;
      requestId: string;
      count: number;
    }
  | { type: 'error'; error: string; requestId: string };

// ================= Code Runner Worker Types =================

/** 支持的代码语言 */
export type CodeLanguage = 'js' | 'ts' | 'javascript' | 'typescript';

/**
 * 代码运行错误分类
 *
 * - SyntaxError：语法错误（含 TS 转换失败、new Function 解析失败）
 * - RuntimeError：运行时错误（异常抛出、未处理的 Promise 拒绝）
 * - TimeoutError：执行超时
 * - SecurityError：安全检查未通过（命中危险 API 黑名单）
 */
export type CodeErrorType = 'SyntaxError' | 'RuntimeError' | 'TimeoutError' | 'SecurityError';

/**
 * 代码运行结果类型
 *
 * 与 lib/code-runner CodeRunResult 结构兼容，新增 errorType 字段用于错误分类。
 */
export interface CodeRunResult {
  /** 是否成功执行（无未捕获异常） */
  success: boolean;
  /** 所有 console 输出拼接（按顺序） */
  output: string;
  /** 未捕获异常的错误信息（仅 success=false 时存在） */
  error?: string;
  /** 错误分类（仅 success=false 时存在） */
  errorType?: CodeErrorType;
  /** 执行时长（毫秒） */
  duration: number;
}

/**
 * Code Runner Worker 输入消息（主线程 → Worker）
 *
 * - run：执行代码（含安全检查、TS 转换、超时控制）
 */
export type CodeRunnerWorkerMessage = {
  type: 'run';
  code: string;
  language: CodeLanguage;
  /** 超时时间（毫秒，默认 5000） */
  timeout?: number;
  requestId: string;
};

/**
 * Code Runner Worker 输出消息（Worker → 主线程）
 *
 * - result：执行结果（含所有输出与错误信息）
 */
export type CodeRunnerWorkerResponse = {
  type: 'result';
  result: CodeRunResult;
  requestId: string;
};
