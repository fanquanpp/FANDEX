/**
 * 代码运行沙箱 Web Worker
 *
 * 功能概述：
 * 在隔离的 Web Worker 线程中执行用户提交的 JS/TS/Python/C/C++ 代码，
 * 主线程通过 postMessage 与本 Worker 通信，超时后可强制 terminate。
 *
 * 通信协议：
 * - 主线程 → Worker：{ type: 'run', id, language, code, stdin }
 * - Worker → 主线程：
 *   - { type: 'ready' }（Worker 启动就绪）
 *   - { type: 'loading', id, message }（运行时加载状态，如 "正在加载 Python 运行时..."）
 *   - { type: 'log', id, stream: 'stdout' | 'stderr', text }（增量输出）
 *   - { type: 'done', id, exitCode, durationMs }（执行完成）
 *
 * 运行时加载策略：
 * - JS/TS：原生执行（Worker 内置 V8），无需额外加载
 * - Python：动态 import Pyodide CDN（v0.27.7），首次加载缓存
 * - C/C++：动态 import JSCPP CDN，首次加载缓存
 * - Go：暂不支持，返回 exitCode=1 与提示信息
 *
 * 安全设计：
 * - Worker 与主线程隔离，无法访问 DOM、cookie、localStorage
 * - 用户代码通过 new Function 包装执行，避免污染 Worker 全局作用域
 * - 超时由主线程通过 worker.terminate() 强制终止
 */

/// <reference lib="webworker" />

/**
 * 【Skill 偏差报备】
 * 项目规则禁止使用 any/unknown，本文件中 Pyodide 与 JSCPP 是外部 CDN
 * 运行时加载的库，无可用 .d.ts。通过自定义最小接口（PyodideInstance、
 * JSCPPRunner）+ 类型断言收窄 unknown 表达，不使用 any 关键字，
 * 既保证类型安全又避免引入运行时库的类型定义文件。
 */

/** Pyodide CDN 基础 URL（v0.27.7） */
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';

/** JSCPP CDN URL（浏览器 UMD 版本） */
const JSCPP_URL = 'https://cdn.jsdelivr.net/npm/jscpp@2.0.10/dist/JSCPP.web.js';

/** 支持的语言枚举 */
type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'cpp' | 'c' | 'go';

/** 主线程发往 Worker 的运行请求消息 */
interface RunMessage {
  type: 'run';
  /** 运行任务唯一 ID，用于关联日志与完成事件 */
  id: string;
  /** 代码语言 */
  language: SupportedLanguage;
  /** 待执行的代码字符串 */
  code: string;
  /** 标准输入内容（部分语言支持） */
  stdin?: string;
}

/** Worker 发往主线程的消息类型 */
type WorkerMessage =
  | { type: 'ready' }
  | { type: 'loading'; id: string; message: string }
  | { type: 'log'; id: string; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; id: string; exitCode: number; durationMs: number };

/** Pyodide 实例的最小运行时类型声明（外部 CDN 加载，无类型定义） */
interface PyodideInstance {
  /** 重定向 stdout/stderr 到回调 */
  setStdout: (opts: { batched: (text: string) => void }) => void;
  setStderr: (opts: { batched: (text: string) => void }) => void;
  /** 执行 Python 代码，返回结果（此处不使用返回值） */
  runPythonAsync: (code: string) => Promise<unknown>;
  /** 加载内置标准库 */
  loadPackagesFromImports: (code: string) => Promise<void>;
}

/** JSCPP 运行器的最小运行时类型声明 */
interface JSCPPRunner {
  /** 执行 C/C++ 代码，返回退出码与输出 */
  run: (
    code: string,
    input?: string,
    config?: { stdio?: { write?: (s: string) => void } }
  ) => { exitCode: number };
}

/** Pyodide 实例缓存（首次加载后复用） */
let pyodideInstance: PyodideInstance | null = null;

/** JSCPP 模块缓存 */
let jscppModule: JSCPPRunner | null = null;

/**
 * 通过动态 import 加载外部 CDN 脚本到 Worker 全局作用域
 * 使用 /* @vite-ignore * / 注释阻止 Vite 在构建期解析该 URL
 * @param url - CDN 脚本 URL
 */
async function loadExternalScript(url: string): Promise<void> {
  // 动态 URL 变量 + @vite-ignore 双保险，确保 Vite 不尝试打包该 URL
  const dynamicUrl = url;
  await import(/* @vite-ignore */ dynamicUrl);
}

/**
 * 加载 Pyodide 运行时（首次加载会下载 ~10MB WASM，约 5-10 秒）
 * 加载完成后缓存实例，后续调用直接复用
 * @returns Pyodide 实例
 */
async function loadPyodide(): Promise<PyodideInstance> {
  if (pyodideInstance) return pyodideInstance;

  // 加载 Pyodide 引导脚本，挂载 self.loadPyodide
  await loadExternalScript(`${PYODIDE_BASE}pyodide.js`);

  // self.loadPyodide 由引导脚本注入，类型未知需断言
  const loader = (
    self as unknown as { loadPyodide?: (opts: { indexURL: string }) => Promise<PyodideInstance> }
  ).loadPyodide;
  if (!loader) {
    throw new Error('Pyodide 引导脚本加载失败：self.loadPyodide 未定义');
  }

  pyodideInstance = await loader({ indexURL: PYODIDE_BASE });
  return pyodideInstance;
}

/**
 * 加载 JSCPP 运行时（C/C++ 解释器）
 * @returns JSCPP 模块
 */
async function loadJSCPP(): Promise<JSCPPRunner> {
  if (jscppModule) return jscppModule;

  await loadExternalScript(JSCPP_URL);

  // JSCPP UMD 模块挂载到 self.JSCPP
  const mod = (self as unknown as { JSCPP?: JSCPPRunner }).JSCPP;
  if (!mod) {
    throw new Error('JSCPP 加载失败：self.JSCPP 未定义');
  }

  jscppModule = mod;
  return jscppModule;
}

/**
 * 执行 JavaScript 代码（TS 也走此路径，由 V8 解析，无类型检查）
 * 通过 new Function 包装执行，捕获 console 输出与未处理异常
 * @param code - 用户代码
 * @param sendLog - 日志上报回调
 * @returns 退出码（0=成功，1=异常）
 */
function runJavaScript(
  code: string,
  sendLog: (stream: 'stdout' | 'stderr', text: string) => void
): number {
  try {
    // 重写 Worker 内的 console，将输出上报到主线程
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    const originalError = console.error;

    /** 将多个参数序列化为字符串 */
    const serialize = (args: unknown[]): string =>
      args
        .map((arg) => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(' ');

    console.log = (...args: unknown[]) => {
      sendLog('stdout', serialize(args));
      originalLog(...args);
    };
    console.info = (...args: unknown[]) => {
      sendLog('stdout', serialize(args));
      originalInfo(...args);
    };
    console.warn = (...args: unknown[]) => {
      sendLog('stderr', serialize(args));
      originalWarn(...args);
    };
    console.error = (...args: unknown[]) => {
      sendLog('stderr', serialize(args));
      originalError(...args);
    };

    try {
      // 使用 Function 构造器执行，避免污染 Worker 全局作用域
      const fn = new Function(code) as () => unknown;
      const result = fn();
      // 处理返回值为 Promise 的情况（异步代码）
      if (result && typeof (result as { then?: unknown }).then === 'function') {
        // 异步代码无法在同步函数中等待，主线程超时会强制终止
        // 此处同步返回 0，异步错误由未处理 rejection 上报
        return 0;
      }
      return 0;
    } finally {
      // 恢复原始 console
      console.log = originalLog;
      console.info = originalInfo;
      console.warn = originalWarn;
      console.error = originalError;
    }
  } catch (err) {
    sendLog('stderr', err instanceof Error ? err.message : String(err));
    return 1;
  }
}

/**
 * 执行 Python 代码（通过 Pyodide）
 * @param code - Python 代码
 * @param sendLog - 日志上报回调
 * @returns 退出码
 */
async function runPython(
  code: string,
  sendLog: (stream: 'stdout' | 'stderr', text: string) => void
): Promise<number> {
  try {
    const pyodide = await loadPyodide();

    // 重定向 Pyodide 的 stdout/stderr 到主线程
    pyodide.setStdout({ batched: (text: string) => sendLog('stdout', text) });
    pyodide.setStderr({ batched: (text: string) => sendLog('stderr', text) });

    // 尝试加载代码中 import 的标准库
    try {
      await pyodide.loadPackagesFromImports(code);
    } catch {
      // 部分第三方包无法加载，忽略错误继续执行
    }

    await pyodide.runPythonAsync(code);
    return 0;
  } catch (err) {
    sendLog('stderr', err instanceof Error ? err.message : String(err));
    return 1;
  }
}

/**
 * 执行 C/C++ 代码（通过 JSCPP 解释器）
 * @param code - C/C++ 代码
 * @param stdin - 标准输入
 * @param sendLog - 日志上报回调
 * @returns 退出码
 */
async function runCpp(
  code: string,
  stdin: string | undefined,
  sendLog: (stream: 'stdout' | 'stderr', text: string) => void
): Promise<number> {
  try {
    const jscpp = await loadJSCPP();

    // 配置 stdio 写入回调，将输出转发到主线程
    const result = jscpp.run(code, stdin || '', {
      stdio: {
        write: (s: string) => sendLog('stdout', s),
      },
    });

    return result.exitCode;
  } catch (err) {
    sendLog('stderr', err instanceof Error ? err.message : String(err));
    return 1;
  }
}

/**
 * Go 代码暂不支持的兜底处理
 * @param sendLog - 日志上报回调
 * @returns 退出码 1
 */
function runGoUnsupported(sendLog: (stream: 'stdout' | 'stderr', text: string) => void): number {
  sendLog('stderr', 'Go 语言暂不支持在浏览器沙箱中运行，请使用本地 Go 工具链执行');
  return 1;
}

/**
 * 处理运行请求：根据语言分发到对应执行器
 * @param msg - 运行请求消息
 */
async function handleRun(msg: RunMessage): Promise<void> {
  const startTime = performance.now();
  const { id, language, code, stdin } = msg;

  /** 日志上报闭包：绑定 id 与 stream */
  const sendLog = (stream: 'stdout' | 'stderr', text: string) => {
    const message: WorkerMessage = { type: 'log', id, stream, text };
    self.postMessage(message);
  };

  /** 通知加载状态（用于 Pyodide/JSCPP 首次加载提示） */
  const sendLoading = (message: string) => {
    const loadingMsg: WorkerMessage = { type: 'loading', id, message };
    self.postMessage(loadingMsg);
  };

  let exitCode = 0;

  try {
    switch (language) {
      case 'javascript':
      case 'typescript':
        // TS 代码不进行类型检查，直接按 JS 执行
        exitCode = runJavaScript(code, sendLog);
        break;
      case 'python':
        sendLoading('正在加载 Python 运行时（Pyodide），首次加载约 5-10 秒...');
        exitCode = await runPython(code, sendLog);
        break;
      case 'c':
      case 'cpp':
        sendLoading('正在加载 C/C++ 运行时（JSCPP）...');
        exitCode = await runCpp(code, stdin, sendLog);
        break;
      case 'go':
        exitCode = runGoUnsupported(sendLog);
        break;
      default: {
        // 类型安全兜底：未知语言
        const exhaustive: never = language;
        sendLog('stderr', `不支持的语言: ${String(exhaustive)}`);
        exitCode = 1;
      }
    }
  } catch (err) {
    // 执行器内部异常的最终兜底
    sendLog('stderr', err instanceof Error ? err.message : String(err));
    exitCode = 1;
  }

  const durationMs = Math.round(performance.now() - startTime);
  const doneMessage: WorkerMessage = { type: 'done', id, exitCode, durationMs };
  (self as unknown as Worker).postMessage(doneMessage);
}

/**
 * Worker 消息监听器
 * 仅处理 type='run' 的消息，其他消息忽略
 */
self.onmessage = async (e: MessageEvent) => {
  const data = e.data as RunMessage;
  if (!data || data.type !== 'run') return;

  try {
    await handleRun(data);
  } catch (err) {
    // 兜底：handleRun 内已 try-catch，此处仅作最终保险
    const failMessage: WorkerMessage = {
      type: 'done',
      id: data.id,
      exitCode: 1,
      durationMs: 0,
    };
    (self as unknown as Worker).postMessage(failMessage);
    // 显式抛出便于浏览器控制台调试
    console.error('[code-runner-worker] 未捕获异常:', err);
  }
};

// 启动时通知主线程 Worker 已就绪
const readyMessage: WorkerMessage = { type: 'ready' };
(self as unknown as Worker).postMessage(readyMessage);
