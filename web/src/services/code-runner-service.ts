/**
 * 代码运行沙箱服务（Service 层）
 *
 * 功能概述：
 * 作为 UI 层与 Web Worker 之间的唯一桥梁，封装多语言代码执行、超时控制、
 * 日志收集与 Worker 生命周期管理。UI 层（islands/CodeRunner.vue）必须通过
 * 本模块的 runCode 函数发起运行请求，禁止直接创建 Worker 或调用 Worker API。
 *
 * 核心职责：
 * - 创建并复用 Web Worker 实例（单例）
 * - 维护运行任务 ID 与 Promise 的映射，支持超时强制终止
 * - 收集 Worker 上报的 stdout/stderr 增量日志
 * - 暴露统一的 RunRequest/RunResult 接口，屏蔽内部通信细节
 *
 * 设计原则：
 * - 单一职责：仅处理代码执行，不涉及任何 UI 逻辑
 * - 异常隔离：所有 async 函数 try-catch 包裹，异常以 RunResult.stderr 返回
 * - 资源复用：Worker 单例，避免重复创建开销
 * - 安全兜底：超时强制 terminate，重新创建 Worker 保证后续可用
 *
 * 与 src/lib/code-runner.ts 的关系：
 * - lib/code-runner.ts 是旧的 iframe sandbox 实现，保留兼容旧代码块
 * - 本模块是新架构的 Service 层实现，使用 Web Worker 隔离
 * - 后续可逐步迁移旧实现到本模块，统一代码运行入口
 */

import { RUNTIME } from '@/config/runtime';
// 显式 ?worker 后缀导入 Vite Worker，确保构建期正确打包为独立 chunk
import CodeRunnerWorker from '@/workers/code-runner-worker.ts?worker';

/** 支持的代码语言 */
export type CodeLanguage = 'javascript' | 'typescript' | 'python' | 'cpp' | 'c' | 'go';

/** 运行请求：UI 层调用 runCode 时传入的参数 */
export interface RunRequest {
  /** 代码语言 */
  language: CodeLanguage;
  /** 待执行的代码字符串 */
  code: string;
  /** 执行超时时间（毫秒），默认取自 RUNTIME.codeRunnerTimeoutMs（5000ms） */
  timeout?: number;
  /** 标准输入内容（部分语言支持，如 C/C++） */
  stdin?: string;
}

/** 运行结果：runCode 返回的执行结果 */
export interface RunResult {
  /** 标准输出累积文本 */
  stdout: string;
  /** 标准错误累积文本 */
  stderr: string;
  /** 退出码（0=成功，非 0=失败） */
  exitCode: number;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** 是否因超时被强制终止 */
  timedOut: boolean;
}

/** Worker 上报的日志条目（内部使用，不对外暴露） */
interface WorkerLogChunk {
  type: 'log';
  id: string;
  stream: 'stdout' | 'stderr';
  text: string;
}

/** Worker 上报的运行时加载状态（内部使用） */
interface WorkerLoadingMessage {
  type: 'loading';
  id: string;
  message: string;
}

/** Worker 上报的执行完成事件（内部使用） */
interface WorkerDoneMessage {
  type: 'done';
  id: string;
  exitCode: number;
  durationMs: number;
}

/** Worker 上报的就绪事件（内部使用） */
interface WorkerReadyMessage {
  type: 'ready';
}

/** Worker 发往主线程的所有消息类型联合 */
type WorkerOutgoingMessage =
  WorkerLogChunk | WorkerLoadingMessage | WorkerDoneMessage | WorkerReadyMessage;

/** 主线程发往 Worker 的运行请求消息（内部使用） */
interface WorkerRunMessage {
  type: 'run';
  id: string;
  language: CodeLanguage;
  code: string;
  stdin?: string;
}

/** 运行任务的内部状态：包含日志缓冲与 resolve/reject 回调 */
interface RunningTask {
  /** stdout 累积缓冲 */
  stdout: string;
  /** stderr 累积缓冲 */
  stderr: string;
  /** 运行时加载提示文本（用于 UI 显示） */
  loadingMessage: string;
  /** 完成 Promise 的 resolve 回调 */
  resolve: (result: RunResult) => void;
  /** 超时定时器句柄 */
  timeoutHandle: number | undefined;
  /** 超时时间戳（用于计算 durationMs） */
  startTime: number;
}

/** 单例 Worker 实例（懒加载） */
let workerInstance: Worker | null = null;

/** 进行中的运行任务映射：key 为任务 ID，value 为任务状态 */
const runningTasks = new Map<string, RunningTask>();

/** 任务 ID 自增计数器（避免重复） */
let taskIdCounter = 0;

/**
 * 生成唯一的任务 ID
 * 使用计数器 + 时间戳，保证同一页面生命周期内唯一
 * @returns 唯一任务 ID 字符串
 */
function generateTaskId(): string {
  taskIdCounter += 1;
  return `cr-${Date.now()}-${taskIdCounter}`;
}

/**
 * 获取或创建单例 Worker 实例
 * 首次调用创建 Worker 并绑定消息监听器，后续调用直接返回缓存
 * @returns Worker 实例
 */
function getWorker(): Worker {
  if (workerInstance) return workerInstance;

  // 创建 Worker 实例（Vite 会自动打包为独立 chunk）
  const worker = new CodeRunnerWorker();

  // 绑定消息监听器：分发日志与完成事件到对应任务
  worker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as WorkerOutgoingMessage;
    if (!data || typeof data !== 'object' || typeof data.type !== 'string') return;

    handleWorkerMessage(data);
  });

  // Worker 异常时记录错误，不污染主线程
  worker.addEventListener('error', (event: ErrorEvent) => {
    console.error('[code-runner-service] Worker 异常:', event.message);
  });

  workerInstance = worker;
  return worker;
}

/**
 * 处理 Worker 上报的消息：根据 type 分发到对应任务
 * @param msg - Worker 上报的消息
 */
function handleWorkerMessage(msg: WorkerOutgoingMessage): void {
  if (msg.type === 'ready') {
    // Worker 就绪，无需处理
    return;
  }

  // 后续消息都携带 id，从映射中查找任务
  const task = runningTasks.get(msg.id);
  if (!task) return;

  if (msg.type === 'log') {
    if (msg.stream === 'stdout') {
      task.stdout += msg.text + '\n';
    } else {
      task.stderr += msg.text + '\n';
    }
    return;
  }

  if (msg.type === 'loading') {
    task.loadingMessage = msg.message;
    return;
  }

  if (msg.type === 'done') {
    // 清除超时定时器
    if (task.timeoutHandle !== undefined) {
      window.clearTimeout(task.timeoutHandle);
    }
    runningTasks.delete(msg.id);

    const result: RunResult = {
      stdout: task.stdout,
      stderr: task.stderr,
      exitCode: msg.exitCode,
      durationMs: msg.durationMs,
      timedOut: false,
    };
    task.resolve(result);
  }
}

/**
 * 终止并重置 Worker（用于超时或异常恢复）
 * 会销毁当前 Worker 实例，下次调用 getWorker 会重新创建
 */
function resetWorker(): void {
  if (!workerInstance) return;
  workerInstance.terminate();
  workerInstance = null;

  // 清理所有进行中的任务（标记为超时或失败）
  for (const [id, task] of runningTasks) {
    if (task.timeoutHandle !== undefined) {
      window.clearTimeout(task.timeoutHandle);
    }
    const result: RunResult = {
      stdout: task.stdout,
      stderr: task.stderr,
      exitCode: 124, // 124 是 POSIX 超时退出码
      durationMs: Math.round(performance.now() - task.startTime),
      timedOut: true,
    };
    task.resolve(result);
    runningTasks.delete(id);
  }
}

/**
 * 执行用户代码（核心 API）
 *
 * 核心执行流程：
 *   1. 生成任务 ID，创建 RunningTask 状态对象
 *   2. 通过 getWorker 获取单例 Worker，postMessage 发送运行请求
 *   3. 启动超时定时器，到期后 terminate Worker 并返回 timedOut 结果
 *   4. Worker 上报日志时累积到 stdout/stderr
 *   5. Worker 上报 done 时 resolve Promise，清理任务状态
 *
 * @param req - 运行请求（语言、代码、超时、stdin）
 * @returns 运行结果（含 stdout/stderr/exitCode/durationMs/timedOut）
 *
 * @example
 * ```ts
 * const result = await runCode({
 *   language: 'python',
 *   code: 'print("hello")',
 * });
 * console.log(result.stdout); // "hello\n"
 * ```
 */
export async function runCode(req: RunRequest): Promise<RunResult> {
  // 参数合法性校验：禁止空代码
  if (!req.code || req.code.trim().length === 0) {
    return {
      stdout: '',
      stderr: '代码不能为空',
      exitCode: 1,
      durationMs: 0,
      timedOut: false,
    };
  }

  // 超时时间优先取 req.timeout，回退到 RUNTIME 配置
  const timeoutMs = req.timeout ?? RUNTIME.codeRunnerTimeoutMs;
  const id = generateTaskId();
  const startTime = performance.now();

  return new Promise<RunResult>((resolve) => {
    /** 超时定时器句柄 */
    let timeoutHandle: number | undefined;

    /** 任务状态对象 */
    const task: RunningTask = {
      stdout: '',
      stderr: '',
      loadingMessage: '',
      resolve,
      timeoutHandle: undefined,
      startTime,
    };

    // 注册任务到映射表
    runningTasks.set(id, task);

    // 设置超时定时器：到期后 terminate Worker，返回 timedOut 结果
    timeoutHandle = window.setTimeout(() => {
      // 标记任务已完成（避免后续 Worker 消息误触发 resolve）
      runningTasks.delete(id);

      // 重置 Worker（terminate），下次运行会重新创建
      resetWorker();

      const result: RunResult = {
        stdout: task.stdout,
        stderr: task.stderr,
        exitCode: 124,
        durationMs: Math.round(performance.now() - startTime),
        timedOut: true,
      };
      resolve(result);
    }, timeoutMs);

    task.timeoutHandle = timeoutHandle;

    try {
      const worker = getWorker();
      // 发送运行请求到 Worker
      // exactOptionalPropertyTypes：stdin 为 undefined 时不传该字段
      const message: WorkerRunMessage = {
        type: 'run',
        id,
        language: req.language,
        code: req.code,
      };
      if (req.stdin !== undefined) {
        message.stdin = req.stdin;
      }
      worker.postMessage(message);
    } catch (err) {
      // Worker 创建或消息发送失败，清理任务并返回错误
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
      runningTasks.delete(id);

      const result: RunResult = {
        stdout: '',
        stderr: `运行环境初始化失败: ${err instanceof Error ? err.message : String(err)}`,
        exitCode: 1,
        durationMs: Math.round(performance.now() - startTime),
        timedOut: false,
      };
      resolve(result);
    }
  });
}

/**
 * 销毁代码运行服务（页面卸载时调用）
 * 终止 Worker 实例并清理所有任务状态
 */
export function disposeCodeRunner(): void {
  resetWorker();
}
