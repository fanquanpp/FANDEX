/**
 * 代码运行沙箱（Web Worker 实现）（Phase 5）
 *
 * 功能概述：
 * - 在 Web Worker 中安全执行用户输入的 JavaScript / TypeScript 代码
 * - 5 秒超时限制，防止死循环导致主线程阻塞
 * - 安全检查排除危险 API：export、import、document.write、fetch、XMLHttpRequest、eval、Function、window.location、localStorage、sessionStorage
 * - 捕获 console.log/info/warn/error 输出并返回给调用方
 * - 捕获未处理错误与 Promise rejection
 * - 支持 TypeScript 代码（通过简单正则转换去除类型注解，无需 sucrase 依赖）
 *
 * 设计要点：
 * - 使用 Blob URL 内联 Worker（无需独立 worker 文件，便于打包）
 * - Worker 内重写 console.* 收集输出
 * - Worker 内重写 self.onerror / unhandledrejection 捕获异常
 * - 主线程通过 postMessage 与 Worker 通信，5 秒超时自动 terminate
 * - 所有 API 异步，使用 try-catch 错误处理
 *
 * 返回结构：
 * - success：是否成功执行（无未捕获异常）
 * - output：所有 console 输出拼接（按顺序）
 * - error：未捕获异常的错误信息（仅 success=false 时存在）
 * - duration：执行时长（毫秒）
 *
 * 使用示例：
 *   import { runCode } from '@/lib/code-runner';
 *   const result = await runCode('console.log("Hello, World!");', 'js');
 *   if (result.success) {
 *     console.log(result.output); // 'Hello, World!'
 *   }
 */

import { TIMEOUTS } from '@/lib/constants';
import { logger } from '@/lib/logger';

/** 代码运行结果类型 */
export interface CodeRunResult {
  /** 是否成功执行（无未捕获异常） */
  success: boolean;
  /** 所有 console 输出拼接（按顺序） */
  output: string;
  /** 未捕获异常的错误信息（仅 success=false 时存在） */
  error?: string;
  /** 执行时长（毫秒） */
  duration: number;
}

/** 支持的代码语言 */
export type CodeLanguage = 'js' | 'ts' | 'javascript' | 'typescript';

/** 危险 API 黑名单（用于安全检查） */
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bexport\s+(default\s+)?(function|class|const|let|var|async)/, label: 'export 语句' },
  { pattern: /\bimport\s+/, label: 'import 语句' },
  { pattern: /document\.write\s*\(/, label: 'document.write' },
  { pattern: /\bfetch\s*\(/, label: 'fetch' },
  { pattern: /XMLHttpRequest/, label: 'XMLHttpRequest' },
  { pattern: /\beval\s*\(/, label: 'eval' },
  { pattern: /\bFunction\s*\(/, label: 'Function 构造器' },
  { pattern: /window\.location/, label: 'window.location' },
  { pattern: /localStorage/, label: 'localStorage' },
  { pattern: /sessionStorage/, label: 'sessionStorage' },
];

/**
 * 安全检查：检测代码中是否包含危险 API
 *
 * @param code - 待检测的代码
 * @returns 若包含危险 API，返回 { safe: false, label }；否则返回 { safe: true }
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
 * - 移除类型注解：`let x: number = 1` → `let x = 1`
 * - 移除接口与类型声明：`interface X {...}`、`type X = ...`
 * - 移除非空断言：`x!.y` → `x.y`
 * - 移除 as 断言：`x as number` → `x`
 * - 复杂 TS 特性（如泛型、装饰器）不保证正确转换
 * - 生产环境建议改用 sucrase 或 @swc/core 进行完整转换
 *
 * @param tsCode - TypeScript 代码
 * @returns 转换后的 JavaScript 代码
 */
function stripTypeScriptTypes(tsCode: string): string {
  let js = tsCode;
  // 移除 interface 声明（含多行 body）
  js = js.replace(/interface\s+\w+(\s*<[^>]+>)?\s*\{[^}]*\}/g, '');
  // 移除 type 别名声明（含多行 body）
  js = js.replace(/type\s+\w+(\s*<[^>]+>)?\s*=\s*[^;]*;/g, '');
  // 移除变量声明后的类型注解：`: Type`（不匹配对象字面量中的冒号）
  js = js.replace(/(\b(?:let|const|var)\s+\w+)\s*:\s*[^=;]+(?=\s*=)/g, '$1');
  // 移除函数参数类型注解：`(param: Type, ...)` → `(param, ...)`
  js = js.replace(/\(([^)]*)\)/g, (_match, params: string) => {
    const cleaned = params
      .split(',')
      .map((p: string) => p.replace(/:\s*[^=,)]+/g, '').trim())
      .join(', ');
    return `(${cleaned})`;
  });
  // 移除函数返回类型注解：`function x(): Type {` → `function x() {`
  js = js.replace(/\)\s*:\s*[\w<>[\]|\s&]+\s*\{/g, ') {');
  // 移除非空断言：`x!.y` → `x.y`
  js = js.replace(/!\./g, '.');
  // 移除 as 断言：`x as Type` → `x`
  js = js.replace(/\bas\s+[\w<>[\]|\s&]+\b/g, '');
  return js;
}

/**
 * Worker 内执行的脚本（作为字符串）
 *
 * 实现说明：
 * - 重写 console.log/info/warn/error，将输出通过 postMessage 发送给主线程
 * - 监听 self.onerror 与 unhandledrejection，捕获异常
 * - 使用 eval 执行用户代码（在 Worker 沙箱内，相对安全）
 * - 执行完成后发送 done 消息
 */
const WORKER_SCRIPT = `
self.console = {
  log: (...args) => self.postMessage({ type: 'output', level: 'log', text: args.map(stringify).join(' ') }),
  info: (...args) => self.postMessage({ type: 'output', level: 'info', text: args.map(stringify).join(' ') }),
  warn: (...args) => self.postMessage({ type: 'output', level: 'warn', text: args.map(stringify).join(' ') }),
  error: (...args) => self.postMessage({ type: 'output', level: 'error', text: args.map(stringify).join(' ') }),
  debug: (...args) => self.postMessage({ type: 'output', level: 'debug', text: args.map(stringify).join(' ') }),
};

function stringify(val) {
  if (typeof val === 'string') return val;
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'function') return val.toString();
  if (val instanceof Error) return val.stack || val.message;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
}

self.addEventListener('error', (e) => {
  self.postMessage({ type: 'error', message: e.message || String(e.error || e) });
});
self.addEventListener('unhandledrejection', (e) => {
  const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
  self.postMessage({ type: 'error', message: 'Unhandled Rejection: ' + msg });
});

self.addEventListener('message', (e) => {
  const { code } = e.data;
  try {
    // 使用间接 eval 在全局作用域执行（仍受 Worker 沙箱限制）
    (0, eval)(code);
    // 异步任务可能仍在执行，延迟 50ms 发送 done
    setTimeout(() => self.postMessage({ type: 'done' }), 50);
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
    setTimeout(() => self.postMessage({ type: 'done' }), 50);
  }
});
`;

/**
 * 创建 Web Worker（基于 Blob URL）
 *
 * @returns Worker 实例
 */
function createWorker(): Worker {
  const blob = new Blob([WORKER_SCRIPT], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // 创建后立即 revoke URL（Worker 已加载，URL 不再需要）
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return worker;
}

/**
 * 在 Web Worker 沙箱中执行代码
 *
 * 实现说明：
 * 1. 安全检查：检测危险 API，发现则直接返回错误
 * 2. TypeScript 转换：将 TS 代码转换为 JS（简单正则转换）
 * 3. 创建 Worker 并发送代码
 * 4. 监听 Worker 消息：output、error、done
 * 5. 5 秒超时：超时自动 terminate Worker
 * 6. 收集所有输出与错误，返回 CodeRunResult
 *
 * @param code - 待执行的代码
 * @param language - 代码语言（js/ts/javascript/typescript）
 * @returns 执行结果
 */
export async function runCode(code: string, language: CodeLanguage = 'js'): Promise<CodeRunResult> {
  const startTime = Date.now();

  // SSR 环境直接返回错误
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return {
      success: false,
      output: '',
      error: 'Web Worker 不可用（SSR 环境或浏览器不支持）',
      duration: 0,
    };
  }

  // 安全检查
  const safetyCheck = checkSafety(code);
  if (!safetyCheck.safe) {
    return {
      success: false,
      output: '',
      error: `检测到危险 API（${safetyCheck.label}），禁止执行`,
      duration: Date.now() - startTime,
    };
  }

  // TypeScript 代码转换
  let jsCode = code;
  if (language === 'ts' || language === 'typescript') {
    jsCode = stripTypeScriptTypes(code);
  }

  return new Promise<CodeRunResult>((resolve) => {
    let worker: Worker | null = null;
    const outputs: string[] = [];
    let errorMessage: string | undefined;
    let settled = false;

    /**
     * 完成执行，返回结果
     *
     * @param terminate - 是否 terminate Worker
     */
    const finish = (terminate: boolean = true) => {
      if (settled) return;
      settled = true;
      if (terminate && worker) {
        worker.terminate();
      }
      resolve({
        success: errorMessage === undefined,
        output: outputs.join('\n'),
        error: errorMessage,
        duration: Date.now() - startTime,
      });
    };

    // 超时定时器
    const timeoutId = window.setTimeout(() => {
      logger.warn('[code-runner] execution timeout, terminating worker');
      finish(true);
    }, TIMEOUTS.codeRunner);

    try {
      worker = createWorker();

      worker.addEventListener('message', (e: MessageEvent) => {
        const data = e.data as
          | { type: 'output'; level: string; text: string }
          | { type: 'error'; message: string }
          | { type: 'done' };

        if (data.type === 'output') {
          outputs.push(data.text);
        } else if (data.type === 'error') {
          if (errorMessage === undefined) {
            errorMessage = data.message;
          } else {
            errorMessage += `\n${data.message}`;
          }
        } else if (data.type === 'done') {
          window.clearTimeout(timeoutId);
          finish(true);
        }
      });

      worker.addEventListener('error', (e: ErrorEvent) => {
        if (errorMessage === undefined) {
          errorMessage = e.message || 'Worker 执行错误';
        }
        window.clearTimeout(timeoutId);
        finish(true);
      });

      // 发送代码到 Worker
      worker.postMessage({ code: jsCode });
    } catch (err) {
      logger.error('[code-runner] failed to start worker:', err);
      window.clearTimeout(timeoutId);
      resolve({
        success: false,
        output: '',
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startTime,
      });
    }
  });
}

export default {
  runCode,
};
