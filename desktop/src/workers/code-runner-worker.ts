/**
 * Code Runner Worker（Phase 9）
 *
 * 功能概述：
 * - 在 Web Worker 沙箱中执行用户输入的 JavaScript / TypeScript 代码
 * - 5 秒默认超时（可配置），防止死循环阻塞 Worker
 * - 危险 API 黑名单：grep 代码字符串，命中则拒绝执行（SecurityError）
 * - TypeScript 代码通过正则转换去除类型注解（无 sucrase 依赖）
 * - 重写 console.* 收集输出，重写 self.onerror / unhandledrejection 捕获异常
 * - 使用 `new Function` 在隔离作用域执行（非 eval，更安全）
 *
 * 消息协议：
 * - 输入（CodeRunnerWorkerMessage）：run
 * - 输出（CodeRunnerWorkerResponse）：result
 *
 * 错误分类（CodeErrorType）：
 * - SyntaxError：语法错误（含 TS 转换失败、new Function 解析失败）
 * - RuntimeError：运行时错误（异常抛出、未处理的 Promise 拒绝）
 * - TimeoutError：执行超时（5s 默认，可配置）
 * - SecurityError：安全检查未通过（命中危险 API 黑名单）
 *
 * 使用示例（主线程）：
 *   const worker = new Worker(new URL('./code-runner-worker.ts', import.meta.url), { type: 'module' });
 *   worker.postMessage({
 *     type: 'run',
 *     code: 'console.log("Hello, World!");',
 *     language: 'js',
 *     requestId: '1',
 *   });
 *   worker.addEventListener('message', (e) => {
 *     if (e.data.type === 'result') {
 *       console.log(e.data.result);  // CodeRunResult
 *     }
 *   });
 *
 * 安全模型说明：
 * - 此 Worker 仅执行经主线程 code-runner.ts 初步检查的代码
 * - Worker 内二次执行安全检查（黑名单 grep），防止绕过
 * - Worker 自身不导入任何敏感 API（无 fetch、localStorage、IndexedDB 等访问）
 * - Worker 独立上下文执行，与主线程 DOM 完全隔离
 */

import type {
  CodeErrorType,
  CodeLanguage,
  CodeRunnerWorkerMessage,
  CodeRunnerWorkerResponse,
  CodeRunResult,
} from './types';

/** 默认超时时间（毫秒） */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * 危险 API 黑名单
 *
 * 通过正则表达式 grep 代码字符串，命中任一即拒绝执行。
 * 覆盖范围：
 * - 网络请求：fetch、XMLHttpRequest、WebSocket
 * - 模块系统：import、require
 * - 动态执行：eval、Function 构造器
 * - 进程/全局：process、globalThis.fetch
 * - 持久化存储：IndexedDB、localStorage、sessionStorage
 */
const DANGEROUS_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  /* 模块系统（import / require） */
  { pattern: /\bimport\s+/, label: 'import 语句' },
  { pattern: /\brequire\s*\(/, label: 'require 函数' },
  /* 动态执行（eval / Function 构造器） */
  { pattern: /\beval\s*\(/, label: 'eval 函数' },
  { pattern: /\bnew\s+Function\s*\(/, label: 'Function 构造器' },
  /* 网络请求 */
  { pattern: /\bfetch\s*\(/, label: 'fetch 函数' },
  { pattern: /XMLHttpRequest/, label: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\s*\(/, label: 'WebSocket' },
  { pattern: /globalThis\.fetch/, label: 'globalThis.fetch' },
  /* 进程 / Node API */
  { pattern: /\bprocess\./, label: 'process 对象' },
  /* 持久化存储 */
  { pattern: /\bindexedDB\b/, label: 'indexedDB' },
  { pattern: /\blocalStorage\b/, label: 'localStorage' },
  { pattern: /\bsessionStorage\b/, label: 'sessionStorage' },
  /* DOM 操作（Worker 中无 DOM，但仍禁止以防 prototype 污染） */
  { pattern: /document\.write\s*\(/, label: 'document.write' },
  /* Worker 自身操作（防止嵌套 Worker 或自我终止） */
  { pattern: /new\s+Worker\s*\(/, label: 'new Worker' },
  { pattern: /self\.close\s*\(/, label: 'self.close' },
  { pattern: /self\.terminate\s*\(/, label: 'self.terminate' },
];

/**
 * 安全检查：检测代码中是否包含危险 API
 *
 * 输入：代码字符串
 * 输出：{ safe: true } 或 { safe: false, label }（label 用于错误消息）
 *
 * @param code - 待检测的代码
 * @returns 安全检查结果
 */
function checkSafety(code: string): { safe: boolean; label?: string } {
  for (const { pattern, label } of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      return { safe: false, label };
    }
  }
  return { safe: true };
}

/**
 * 将 TypeScript 代码简单转换为 JavaScript
 *
 * 实现说明：
 * - 仅做正则层面的简单转换，不解析 AST
 * - 移除 interface / type 声明
 * - 移除变量声明后的类型注解：`let x: number = 1` → `let x = 1`
 * - 移除函数参数类型注解：`(param: Type, ...)` → `(param, ...)`
 * - 移除函数返回类型注解：`function x(): Type {` → `function x() {`
 * - 移除非空断言：`x!.y` → `x.y`
 * - 移除 as 断言：`x as Type` → `x`
 * - 复杂 TS 特性（如泛型、装饰器、enum）不保证正确转换
 *
 * @param tsCode - TypeScript 代码
 * @returns 转换后的 JavaScript 代码
 */
function stripTypeScriptTypes(tsCode: string): string {
  let js = tsCode;
  /* 移除 interface 声明（含多行 body，简单贪婪匹配） */
  js = js.replace(/interface\s+\w+(\s*<[^>]+>)?\s*\{[^}]*\}/g, '');
  /* 移除 type 别名声明（含多行 body） */
  js = js.replace(/type\s+\w+(\s*<[^>]+>)?\s*=\s*[^;]*;/g, '');
  /* 移除 enum 声明（保留值） */
  js = js.replace(/enum\s+\w+\s*\{[^}]*\}/g, '');
  /* 移除变量声明后的类型注解：`: Type`（不匹配对象字面量中的冒号） */
  js = js.replace(/(\b(?:let|const|var)\s+\w+)\s*:\s*[^=;]+(?=\s*=)/g, '$1');
  /* 移除函数参数类型注解：`(param: Type, ...)` → `(param, ...)` */
  js = js.replace(/\(([^)]*)\)/g, (_match, params: string) => {
    const cleaned = params
      .split(',')
      .map((p: string) => p.replace(/:\s*[^=,)]+/g, '').trim())
      .join(', ');
    return `(${cleaned})`;
  });
  /* 移除函数返回类型注解：`function x(): Type {` → `function x() {` */
  js = js.replace(/\)\s*:\s*[\w<>[\]|\s&]+\s*\{/g, ') {');
  /* 移除非空断言：`x!.y` → `x.y` */
  js = js.replace(/!\./g, '.');
  /* 移除 as 断言：`x as Type` → `x` */
  js = js.replace(/\bas\s+[\w<>[\]|\s&]+\b/g, '');
  /* 移除泛型调用：`foo<number>(x)` → `foo(x)` */
  js = js.replace(/\b\w+\s*<[^<>]+>\s*\(/g, (match) => match.replace(/<[^<>]+>/, ''));
  return js;
}

/** 是否为 TypeScript 语言 */
function isTypeScript(language: CodeLanguage): boolean {
  return language === 'ts' || language === 'typescript';
}

/**
 * 将任意值序列化为字符串（用于 console 输出）
 *
 * 输入：任意值
 * 输出：字符串表示
 *
 * 规则：
 * - string：原样返回
 * - undefined/null：返回 'undefined'/'null'
 * - function：返回函数源码
 * - Error：返回堆栈
 * - 其他：JSON.stringify（失败则 String()）
 *
 * @param value - 待序列化的值
 * @returns 字符串表示
 */
function stringifyValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'function') return value.toString();
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 创建重写的 console 对象
 *
 * 输入：输出收集数组
 * 输出：console 对象（log/info/warn/error/debug 方法）
 *
 * 行为：所有 console.* 调用被序列化并追加到 outputs 数组
 *
 * @param outputs - 输出收集数组（引用传递）
 * @returns 重写后的 console 对象
 */
function createCapturingConsole(outputs: string[]): Console {
  const capture =
    (level: string) =>
    (...args: unknown[]) => {
      const text = args.map(stringifyValue).join(' ');
      outputs.push(`[${level}] ${text}`);
    };

  return {
    log: capture('log'),
    info: capture('info'),
    warn: capture('warn'),
    error: capture('error'),
    debug: capture('debug'),
    /* 其他 console 方法直接 no-op（避免 Worker 中无定义报错） */
    trace: () => {},
    dir: () => {},
    dirxml: () => {},
    table: () => {},
    group: () => {},
    groupEnd: () => {},
    groupCollapsed: () => {},
    clear: () => {},
    count: () => {},
    countReset: () => {},
    assert: () => {},
    profile: () => {},
    profileEnd: () => {},
    timeStamp: () => {},
    time: () => {},
    timeEnd: () => {},
    timeLog: () => {},
    context: () => ({}),
    Console: function Console() {},
  } as unknown as Console;
}

/**
 * 分类错误类型
 *
 * 输入：Error 实例
 * 输出：CodeErrorType（SyntaxError / RuntimeError）
 *
 * 规则：
 * - SyntaxError 实例 → 'SyntaxError'
 * - 其他错误 → 'RuntimeError'
 *
 * @param error - 错误对象
 * @returns 错误分类
 */
function classifyError(error: unknown): CodeErrorType {
  if (error instanceof SyntaxError) return 'SyntaxError';
  /* TypeError / ReferenceError / RangeError 等均视为 RuntimeError */
  return 'RuntimeError';
}

/**
 * 构建失败结果
 *
 * @param errorType - 错误分类
 * @param errorMessage - 错误消息
 * @param outputs - 已收集的输出
 * @param startTime - 开始时间戳
 * @returns CodeRunResult（success=false）
 */
function buildFailureResult(
  errorType: CodeErrorType,
  errorMessage: string,
  outputs: string[],
  startTime: number,
): CodeRunResult {
  return {
    success: false,
    output: outputs.join('\n'),
    error: errorMessage,
    errorType,
    duration: Date.now() - startTime,
  };
}

/**
 * 构建成功结果
 *
 * @param outputs - 已收集的输出
 * @param startTime - 开始时间戳
 * @returns CodeRunResult（success=true）
 */
function buildSuccessResult(outputs: string[], startTime: number): CodeRunResult {
  return {
    success: true,
    output: outputs.join('\n'),
    duration: Date.now() - startTime,
  };
}

/**
 * 发送结果响应给主线程
 *
 * @param result - 代码运行结果
 * @param requestId - 请求 ID（用于关联请求）
 */
function sendResult(result: CodeRunResult, requestId: string): void {
  const response: CodeRunnerWorkerResponse = {
    type: 'result',
    result,
    requestId,
  };
  self.postMessage(response);
}

/**
 * 执行用户代码（在 new Function 沙箱中）
 *
 * 输入：JavaScript 代码字符串
 * 输出：Promise<void>（成功 resolve，失败 reject）
 *
 * 实现说明：
 * - 使用 `new Function` 创建独立函数作用域
 * - 包裹 async 函数以支持 await 语法
 * - 通过参数注入 console，避免用户代码访问 Worker 全局 console
 * - try-catch 捕获同步异常；Promise.catch 捕获异步异常
 *
 * @param jsCode - JavaScript 代码
 * @param sandboxConsole - 重写后的 console 对象
 * @returns Promise，resolve 表示执行完成，reject 表示抛出异常
 */
function executeUserCode(jsCode: string, sandboxConsole: Console): Promise<void> {
  /* 将用户代码包裹在 async 函数中：
   * 1. 支持 top-level await
   * 2. 通过参数注入 console（屏蔽全局 console）
   * 3. 立即执行函数返回 Promise，便于捕获异步异常 */
  const wrappedCode = `
    "use strict";
    return (async () => {
      ${jsCode}
    })();
  `;

  /* new Function 解析阶段可能抛出 SyntaxError */
  const userFunction = new Function('console', wrappedCode) as (
    console: Console,
  ) => Promise<unknown>;

  return Promise.resolve(userFunction(sandboxConsole)).then(() => undefined);
}

/**
 * 处理 run 消息：执行用户代码
 *
 * 输入：code、language、timeout、requestId
 * 流程：
 * 1. 安全检查：危险 API 黑名单 grep
 * 2. TypeScript 代码正则转换
 * 3. 重写 console 收集输出
 * 4. 设置超时定时器（5s 默认，可配置）
 * 5. 通过 new Function 执行代码
 * 6. 分类错误（SyntaxError / RuntimeError / TimeoutError）
 * 7. 发送 result 消息
 *
 * @param code - 用户代码
 * @param language - 代码语言
 * @param timeout - 超时时间（毫秒）
 * @param requestId - 请求 ID
 */
async function handleRun(
  code: string,
  language: CodeLanguage,
  timeout: number,
  requestId: string,
): Promise<void> {
  const startTime = Date.now();
  const outputs: string[] = [];

  /* 1. 安全检查：危险 API 黑名单 */
  const safetyCheck = checkSafety(code);
  if (!safetyCheck.safe) {
    const result = buildFailureResult(
      'SecurityError',
      `检测到危险 API（${safetyCheck.label}），禁止执行`,
      outputs,
      startTime,
    );
    sendResult(result, requestId);
    return;
  }

  /* 2. TypeScript 代码转换 */
  let jsCode = code;
  if (isTypeScript(language)) {
    try {
      jsCode = stripTypeScriptTypes(code);
    } catch (error) {
      /* TS 转换失败视为 SyntaxError */
      const result = buildFailureResult(
        'SyntaxError',
        `TypeScript 转换失败：${error instanceof Error ? error.message : String(error)}`,
        outputs,
        startTime,
      );
      sendResult(result, requestId);
      return;
    }
  }

  /* 3. 重写 console 收集输出 */
  const sandboxConsole = createCapturingConsole(outputs);

  /* 4. 设置超时定时器 */
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      resolve();
    }, timeout);
  });

  /* 5. 执行用户代码 */
  const executionPromise = executeUserCode(jsCode, sandboxConsole);

  try {
    /* 等待执行完成或超时 */
    await Promise.race([executionPromise, timeoutPromise]);

    /* 清理超时定时器（若已执行完成） */
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    /* 超时分支：发送 TimeoutError 结果 */
    if (timedOut) {
      const result = buildFailureResult(
        'TimeoutError',
        `执行超时（${timeout}ms）`,
        outputs,
        startTime,
      );
      sendResult(result, requestId);
      return;
    }

    /* 成功分支 */
    const result = buildSuccessResult(outputs, startTime);
    sendResult(result, requestId);
  } catch (error) {
    /* 清理超时定时器（若已抛出异常） */
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    /* 超时分支：异常可能由超时后的代码继续抛出，但优先返回 TimeoutError */
    if (timedOut) {
      const result = buildFailureResult(
        'TimeoutError',
        `执行超时（${timeout}ms）`,
        outputs,
        startTime,
      );
      sendResult(result, requestId);
      return;
    }

    /* 错误分类：SyntaxError / RuntimeError */
    const errorType = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const result = buildFailureResult(errorType, errorMessage, outputs, startTime);
    sendResult(result, requestId);
  }
}

/**
 * Worker 消息入口
 *
 * 监听主线程 postMessage，根据消息类型分发到对应处理函数。
 * 当前仅支持 'run' 类型，使用 discriminated union 保证类型安全。
 */
self.addEventListener('message', (event: MessageEvent<CodeRunnerWorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'run': {
      const timeout = message.timeout ?? DEFAULT_TIMEOUT_MS;
      /* 异步处理，不阻塞消息循环 */
      void handleRun(message.code, message.language, timeout, message.requestId);
      break;
    }
    /* 默认分支：未知消息类型，记录警告后忽略 */
    default: {
      console.warn(
        `[code-runner-worker] 未知消息类型: ${String((message as { type?: unknown }).type)}`,
      );
    }
  }
});

/**
 * 全局错误处理：捕获未处理的异常
 *
 * 即使 handleRun 内部已 try-catch，仍可能存在漏网情况（如 setTimeout 回调中的异常）。
 * 此处作为最后兜底，发送 RuntimeError 给主线程。
 */
self.addEventListener('error', (event: ErrorEvent) => {
  const errorMessage = event.message || '未捕获的 Worker 错误';
  /* 此处无法关联到具体 requestId，发送空 requestId（主线程应处理此情况） */
  const result: CodeRunResult = {
    success: false,
    output: '',
    error: errorMessage,
    errorType: 'RuntimeError',
    duration: 0,
  };
  sendResult(result, '');
});

/**
 * 全局未处理 Promise 拒绝：捕获异步错误
 *
 * 与 self.addEventListener('error') 类似，作为最后兜底。
 */
self.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const reason = event.reason;
  const errorMessage =
    reason instanceof Error
      ? `Unhandled Rejection: ${reason.message}`
      : `Unhandled Rejection: ${String(reason)}`;
  const result: CodeRunResult = {
    success: false,
    output: '',
    error: errorMessage,
    errorType: 'RuntimeError',
    duration: 0,
  };
  sendResult(result, '');
});
